import { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import config from '../config';
import { redisService } from './redisService';
import { eventProducer } from './eventProducer';
import { 
  RiskScore, 
  DecisionPayload, 
  DecisionResult, 
  TransactionDecision, 
  MerchantRules,
  Rule,
  RuleCondition
} from '../types';

/**
 * Decision service for making transaction approval decisions
 */
class DecisionService {
  private logger: any = console;
  
  /**
   * Initialize decision service
   */
  async initialize(server: FastifyInstance): Promise<void> {
    try {
      this.logger = server.log;
      this.logger.info('Initializing decision service...');
      
      // Load default merchant rules
      await this.setupDefaultMerchantRules();
      
      this.logger.info('Decision service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize decision service:', error);
      throw error;
    }
  }
  
  /**
   * Setup default merchant rules
   */
  private async setupDefaultMerchantRules(): Promise<void> {
    // Create default merchant rules for testing
    const defaultRules: MerchantRules = {
      merchantId: 'default',
      riskThreshold: config.rules.defaultRiskThreshold,
      highRiskThreshold: config.rules.highRiskThreshold,
      automaticReject: true,
      manualReviewThreshold: 0.8,
      customRules: [
        {
          id: 'high-risk-country',
          name: 'High Risk Country',
          description: 'Transactions from high-risk countries require manual review',
          conditions: [
            {
              field: 'riskFactors',
              operator: 'contains',
              value: 'high_risk_country'
            }
          ],
          action: 'review',
          priority: 100,
          isEnabled: true
        }
      ],
      updatedAt: Date.now()
    };
    
    // Store default rules
    await redisService.storeMerchantRules('default', defaultRules);
  }
  
  /**
   * Process risk score from Kafka
   */
  async processRiskScore(riskScore: RiskScore): Promise<void> {
    try {
      this.logger.debug(`Processing risk score for evaluation ${riskScore.evaluationId}`);
      
      // Make decision
      const decisionId = uuidv4();
      const decision = await this.makeDecision(riskScore, decisionId);
      
      // Store decision
      await redisService.storeDecision(decisionId, decision);
      
      // Publish decision to Kafka
      await eventProducer.publishDecision(decision);
      
      this.logger.info(`Decision made for evaluation ${riskScore.evaluationId}: ${decision.decision}`);
    } catch (error) {
      this.logger.error(`Error processing risk score for ${riskScore.evaluationId}:`, error);
    }
  }
  
  /**
   * Make decision for a transaction based on risk score
   */
  private async makeDecision(riskScore: RiskScore, decisionId: string): Promise<TransactionDecision> {
    // Get merchant rules
    const merchantRules = await this.getMerchantRules(riskScore.merchantId);
    
    // Apply custom rules
    const customRuleResult = this.applyCustomRules(riskScore, merchantRules);
    if (customRuleResult) {
      return this.createDecision(riskScore, decisionId, customRuleResult.decision, customRuleResult.reason);
    }
    
    // Apply threshold-based decision
    let decision: 'approve' | 'review' | 'reject' = 'approve';
    let reasoning: string[] = [];
    
    if (riskScore.score >= merchantRules.highRiskThreshold) {
      // High risk
      decision = merchantRules.automaticReject ? 'reject' : 'review';
      reasoning.push(`Risk score ${riskScore.score} exceeds high risk threshold ${merchantRules.highRiskThreshold}`);
    } else if (riskScore.score >= merchantRules.riskThreshold) {
      // Medium risk
      decision = 'review';
      reasoning.push(`Risk score ${riskScore.score} exceeds risk threshold ${merchantRules.riskThreshold}`);
    } else {
      // Low risk
      decision = 'approve';
      reasoning.push(`Risk score ${riskScore.score} below risk threshold ${merchantRules.riskThreshold}`);
    }
    
    // Include risk factors in reasoning
    if (riskScore.riskFactors && riskScore.riskFactors.length > 0) {
      reasoning.push(`Risk factors: ${riskScore.riskFactors.join(', ')}`);
    }
    
    return this.createDecision(riskScore, decisionId, decision, reasoning);
  }
  
  /**
   * Apply custom rules to determine decision
   */
  private applyCustomRules(riskScore: RiskScore, merchantRules: MerchantRules): { decision: 'approve' | 'review' | 'reject'; reason: string } | null {
    if (!merchantRules.customRules || merchantRules.customRules.length === 0) {
      return null;
    }
    
    // Sort rules by priority (higher priority first)
    const sortedRules = [...merchantRules.customRules]
      .filter(rule => rule.isEnabled)
      .sort((a, b) => b.priority - a.priority);
    
    // Apply rules in priority order
    for (const rule of sortedRules) {
      if (this.matchesRule(riskScore, rule)) {
        return {
          decision: rule.action,
          reason: `Rule '${rule.name}' applied: ${rule.description || rule.id}`
        };
      }
    }
    
    return null;
  }
  
  /**
   * Check if risk score matches rule conditions
   */
  private matchesRule(riskScore: RiskScore, rule: Rule): boolean {
    // All conditions must match
    return rule.conditions.every(condition => this.matchesCondition(riskScore, condition));
  }
  
  /**
   * Check if risk score matches a specific condition
   */
  private matchesCondition(riskScore: RiskScore, condition: RuleCondition): boolean {
    const fieldValue = this.getFieldValue(riskScore, condition.field);
    
    switch (condition.operator) {
      case 'eq':
        return fieldValue === condition.value;
      case 'neq':
        return fieldValue !== condition.value;
      case 'gt':
        return typeof fieldValue === 'number' && fieldValue > condition.value;
      case 'gte':
        return typeof fieldValue === 'number' && fieldValue >= condition.value;
      case 'lt':
        return typeof fieldValue === 'number' && fieldValue < condition.value;
      case 'lte':
        return typeof fieldValue === 'number' && fieldValue <= condition.value;
      case 'contains':
        if (Array.isArray(fieldValue)) {
          return fieldValue.includes(condition.value);
        }
        if (typeof fieldValue === 'string') {
          return fieldValue.includes(condition.value);
        }
        return false;
      case 'not_contains':
        if (Array.isArray(fieldValue)) {
          return !fieldValue.includes(condition.value);
        }
        if (typeof fieldValue === 'string') {
          return !fieldValue.includes(condition.value);
        }
        return true;
      case 'in':
        if (Array.isArray(condition.value)) {
          return condition.value.includes(fieldValue);
        }
        return false;
      case 'not_in':
        if (Array.isArray(condition.value)) {
          return !condition.value.includes(fieldValue);
        }
        return true;
      default:
        return false;
    }
  }
  
  /**
   * Get field value from risk score
   */
  private getFieldValue(riskScore: RiskScore, field: string): any {
    // Handle nested fields using dot notation
    const parts = field.split('.');
    let value: any = riskScore;
    
    for (const part of parts) {
      if (value === null || value === undefined || typeof value !== 'object') {
        return undefined;
      }
      value = value[part];
    }
    
    return value;
  }
  
  /**
   * Create decision object
   */
  private createDecision(
    riskScore: RiskScore, 
    decisionId: string, 
    decision: 'approve' | 'review' | 'reject',
    reasoning: string | string[]
  ): TransactionDecision {
    const reasoningArray = Array.isArray(reasoning) ? reasoning : [reasoning];
    
    return {
      id: decisionId,
      evaluationId: riskScore.evaluationId,
      merchantId: riskScore.merchantId,
      decision,
      riskScore: riskScore.score,
      riskLevel: this.getRiskLevel(riskScore.score),
      reasoning: reasoningArray,
      createdAt: Date.now()
    };
  }
  
  /**
   * Get risk level based on score
   */
  private getRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 0.9) return 'critical';
    if (score >= 0.7) return 'high';
    if (score >= 0.4) return 'medium';
    return 'low';
  }
  
  /**
   * Get merchant rules from Redis
   */
  private async getMerchantRules(merchantId: string): Promise<MerchantRules> {
    // Get merchant-specific rules
    const merchantRules = await redisService.getMerchantRules(merchantId);
    
    // If merchant-specific rules not found, get default rules
    if (!merchantRules) {
      const defaultRules = await redisService.getMerchantRules('default');
      
      // If default rules not found, use system defaults
      if (!defaultRules) {
        return {
          merchantId,
          riskThreshold: config.rules.defaultRiskThreshold,
          highRiskThreshold: config.rules.highRiskThreshold,
          automaticReject: true,
          updatedAt: Date.now()
        };
      }
      
      // Use default rules but update merchantId
      return {
        ...defaultRules,
        merchantId
      };
    }
    
    return merchantRules;
  }
  
  /**
   * Make a decision based on API request
   */
  async makeDecisionFromRequest(payload: DecisionPayload): Promise<DecisionResult> {
    try {
      // Get stored risk score for evaluation
      const riskScore = await this.getRiskScoreForEvaluation(payload.evaluationId);
      
      if (!riskScore) {
        throw new Error(`Risk score not found for evaluation ID ${payload.evaluationId}`);
      }
      
      // Make decision
      const decisionId = uuidv4();
      const decision = await this.makeDecision(riskScore, decisionId);
      
      // Store decision
      await redisService.storeDecision(decisionId, {
        ...decision,
        transactionId: payload.transactionId,
        userId: payload.userId,
        metadata: payload.metadata
      });
      
      // Return decision result
      return {
        decision: decision.decision,
        decisionId,
        evaluationId: payload.evaluationId,
        merchantId: payload.merchantId,
        riskScore: decision.riskScore,
        riskLevel: decision.riskLevel,
        reasoning: decision.reasoning,
        timestamp: decision.createdAt
      };
    } catch (error) {
      this.logger.error(`Error making decision for evaluation ${payload.evaluationId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get risk score for evaluation (mock implementation)
   */
  private async getRiskScoreForEvaluation(evaluationId: string): Promise<RiskScore | null> {
    // In a real implementation, this would look up the risk score in a database
    // For now, return a mock risk score
    return {
      id: uuidv4(),
      evaluationId,
      sessionId: 'session-123',
      merchantId: 'merchant-123',
      visitorId: 'visitor-123',
      score: 0.65,
      isFraud: false,
      riskFactors: ['multiple_accounts', 'unusual_behavior'],
      timestamp: Date.now()
    };
  }
}

// Export singleton instance
export const decisionService = new DecisionService();

// Initialize function for service registration
export const initDecisionService = async (server: FastifyInstance): Promise<void> => {
  await decisionService.initialize(server);
}; 