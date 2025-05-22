import { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import {
  EnrichedEvent,
  RiskScore,
  MerchantSettings,
  Rule
} from '../types';
import config from '../config';
import { lookupIp, anonymizeIp } from './geoIpService';
import { getRedisJson, getRedisValue, incrRedisValue, setRedisValue } from './redisService';
import { eventProducer } from './eventProducer';

// Default merchant settings
const DEFAULT_MERCHANT_SETTINGS: MerchantSettings = {
  riskThreshold: 70,
  enableCaptcha: true,
  captchaThreshold: 80,
  ipAnonymization: false
};

/**
 * Evaluation service for fraud detection
 */
class EvaluationService {
  private logger: any = console;
  
  /**
   * Initialize evaluation service
   */
  async initialize(server: FastifyInstance): Promise<void> {
    try {
      this.logger = server.log;
      this.logger.info('Initializing evaluation service...');
      
      this.logger.info('Evaluation service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize evaluation service:', error);
      throw error;
    }
  }
  
  /**
   * Enrich raw event with additional data
   */
  async enrichData(event: EnrichedEvent): Promise<EnrichedEvent> {
    try {
      const { ipAddress, merchantId } = event;
      
      // Get merchant settings
      const merchantSettings = await this.getMerchantSettings(merchantId);
      
      // Add IP anonymization if enabled
      if (merchantSettings.ipAnonymization) {
        event.anonymizedIp = anonymizeIp(ipAddress);
      }
      
      // Add GeoIP data
      event.geoData = lookupIp(ipAddress);
      
      // Add velocity data
      event.velocityData = await this.getVelocityData(event);
      
      return event;
    } catch (error) {
      this.logger.error('Error enriching event data:', error);
      return event; // Return original event on error
    }
  }
  
  /**
   * Calculate risk score for an event
   */
  async calculateRiskScore(event: EnrichedEvent): Promise<RiskScore> {
    try {
      const { merchantId, fingerprintData } = event;
      
      // Get merchant settings and rules
      const merchantSettings = await this.getMerchantSettings(merchantId);
      const rules = await this.getMerchantRules(merchantId);
      
      // Initialize risk factors array
      const riskFactors: string[] = [];
      
      // Base score starts at 0
      let score = 0;
      
      // Apply risk scoring logic
      
      // 1. Device fingerprint confidence
      if (fingerprintData.confidence !== undefined) {
        if (fingerprintData.confidence < 0.3) {
          score += 30;
          riskFactors.push('low_device_confidence');
        } else if (fingerprintData.confidence < 0.7) {
          score += 10;
          riskFactors.push('medium_device_confidence');
        }
      }
      
      // 2. Incognito mode
      if (fingerprintData.incognito) {
        score += 15;
        riskFactors.push('incognito_mode');
      }
      
      // 3. Location risk assessment
      if (event.geoData?.country) {
        // High-risk countries (simplified example)
        const highRiskCountries = ['RU', 'NG', 'BR', 'VN'];
        if (highRiskCountries.includes(event.geoData.country)) {
          score += 20;
          riskFactors.push('high_risk_country');
        }
      }
      
      // 4. Velocity checks
      if (event.velocityData) {
        if (event.velocityData.sessionCount24h && event.velocityData.sessionCount24h > 10) {
          score += 25;
          riskFactors.push('high_session_velocity');
        }
        
        if (event.velocityData.ipSessionCount24h && event.velocityData.ipSessionCount24h > 20) {
          score += 30;
          riskFactors.push('high_ip_velocity');
        }
      }
      
      // 5. Apply merchant rules
      rules.forEach(rule => {
        if (rule.isActive && this.evaluateRule(rule, event)) {
          score += rule.riskScoreAdjustment;
          riskFactors.push(`rule_${rule.id}`);
        }
      });
      
      // Ensure score is within 0-100 range
      score = Math.max(0, Math.min(100, score));
      
      // Determine if fraud based on threshold
      const isFraud = score >= merchantSettings.riskThreshold;
      
      // Create risk score object
      const riskScore: RiskScore = {
        id: uuidv4(),
        evaluationId: event.evaluationId || uuidv4(),
        sessionId: event.sessionId,
        merchantId: event.merchantId,
        visitorId: event.fingerprintData.visitorId,
        score,
        isFraud,
        riskFactors,
        timestamp: Date.now()
      };
      
      // Publish risk score to Kafka
      await eventProducer.produceEvent(config.kafka.riskScoresTopic, riskScore);
      
      return riskScore;
    } catch (error) {
      this.logger.error('Error calculating risk score:', error);
      
      // Return safe fallback on error
      return {
        id: uuidv4(),
        evaluationId: event.evaluationId || uuidv4(),
        sessionId: event.sessionId,
        merchantId: event.merchantId,
        visitorId: event.fingerprintData.visitorId,
        score: 0,
        isFraud: false,
        riskFactors: ['calculation_error'],
        timestamp: Date.now()
      };
    }
  }
  
  /**
   * Get merchant settings
   */
  private async getMerchantSettings(merchantId: string): Promise<MerchantSettings> {
    try {
      // Try to get cached settings from Redis
      const cacheKey = `merchant:${merchantId}:settings`;
      const cachedSettings = await getRedisJson<MerchantSettings>(cacheKey);
      
      if (cachedSettings) {
        return cachedSettings;
      }
      
      // In a real implementation, we would fetch from database here
      // For now, return default settings
      const settings = { ...DEFAULT_MERCHANT_SETTINGS };
      
      // Cache settings in Redis
      await setRedisValue(cacheKey, settings, 300); // 5 minute TTL
      
      return settings;
    } catch (error) {
      this.logger.error('Error getting merchant settings:', error);
      return { ...DEFAULT_MERCHANT_SETTINGS };
    }
  }
  
  /**
   * Get merchant rules
   */
  private async getMerchantRules(merchantId: string): Promise<Rule[]> {
    try {
      // Try to get cached rules from Redis
      const cacheKey = `merchant:${merchantId}:rules`;
      const cachedRules = await getRedisJson<Rule[]>(cacheKey);
      
      if (cachedRules) {
        return cachedRules;
      }
      
      // In a real implementation, we would fetch from database here
      // For now, return sample rules
      const rules: Rule[] = [
        {
          id: '1',
          merchantId,
          name: 'High Risk Country',
          description: 'Flag transactions from high-risk countries',
          conditions: [
            {
              field: 'geoData.country',
              operator: 'in',
              value: ['RU', 'NG', 'BR', 'VN']
            }
          ],
          action: 'flag',
          riskScoreAdjustment: 30,
          isActive: true
        },
        {
          id: '2',
          merchantId,
          name: 'Suspicious Device',
          description: 'Block transactions from devices with suspicious characteristics',
          conditions: [
            {
              field: 'fingerprintData.incognito',
              operator: 'eq',
              value: true
            }
          ],
          action: 'block',
          riskScoreAdjustment: 50,
          isActive: true
        }
      ];
      
      // Cache rules in Redis
      await setRedisValue(cacheKey, rules, 300); // 5 minute TTL
      
      return rules;
    } catch (error) {
      this.logger.error('Error getting merchant rules:', error);
      return [];
    }
  }
  
  /**
   * Evaluate if a rule applies to an event
   */
  private evaluateRule(rule: Rule, event: EnrichedEvent): boolean {
    try {
      // All conditions must match (AND logic)
      return rule.conditions.every(condition => {
        // Get field value using dot notation
        const fieldValue = this.getNestedValue(event, condition.field);
        
        // Apply operator
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
            return typeof fieldValue === 'string' && fieldValue.includes(condition.value);
          case 'not_contains':
            return typeof fieldValue === 'string' && !fieldValue.includes(condition.value);
          case 'in':
            return Array.isArray(condition.value) && condition.value.includes(fieldValue);
          case 'not_in':
            return Array.isArray(condition.value) && !condition.value.includes(fieldValue);
          default:
            return false;
        }
      });
    } catch (error) {
      this.logger.error('Error evaluating rule:', error);
      return false;
    }
  }
  
  /**
   * Get a nested property value using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    const keys = path.split('.');
    let value = obj;
    
    for (const key of keys) {
      if (value === null || value === undefined) {
        return undefined;
      }
      value = value[key];
    }
    
    return value;
  }
  
  /**
   * Get velocity data for an event
   */
  private async getVelocityData(event: EnrichedEvent): Promise<{
    sessionCount24h?: number;
    ipSessionCount24h?: number;
    deviceSessionCount24h?: number;
    lastSeenTimestamp?: number;
  }> {
    try {
      const { sessionId, merchantId, ipAddress, fingerprintData } = event;
      const ttl = 24 * 60 * 60; // 24 hours in seconds
      
      // Session count for merchant
      const merchantSessionKey = `velocity:merchant:${merchantId}:sessions`;
      const sessionCount24h = await incrRedisValue(merchantSessionKey);
      
      // First hit of this session, set expiry
      if (sessionCount24h === 1) {
        await setRedisValue(merchantSessionKey, '1', ttl);
      }
      
      // IP session count
      const ipSessionKey = `velocity:ip:${ipAddress}:sessions`;
      const ipSessionCount24h = await incrRedisValue(ipSessionKey);
      
      // First hit from this IP, set expiry
      if (ipSessionCount24h === 1) {
        await setRedisValue(ipSessionKey, '1', ttl);
      }
      
      // Device fingerprint session count
      const deviceKey = `velocity:device:${fingerprintData.visitorId}:sessions`;
      const deviceSessionCount24h = await incrRedisValue(deviceKey);
      
      // First hit from this device, set expiry
      if (deviceSessionCount24h === 1) {
        await setRedisValue(deviceKey, '1', ttl);
      }
      
      // Last seen timestamp for device
      const lastSeenKey = `velocity:device:${fingerprintData.visitorId}:lastSeen`;
      const lastSeenStr = await getRedisValue(lastSeenKey);
      const lastSeenTimestamp = lastSeenStr ? parseInt(lastSeenStr, 10) : undefined;
      
      // Update last seen
      await setRedisValue(lastSeenKey, Date.now().toString(), ttl);
      
      return {
        sessionCount24h,
        ipSessionCount24h,
        deviceSessionCount24h,
        lastSeenTimestamp
      };
    } catch (error) {
      this.logger.error('Error calculating velocity data:', error);
      return {};
    }
  }
}

// Export singleton instance
export const evaluationService = new EvaluationService();

// Initialize function for service registration
export const initEvaluationService = async (server: FastifyInstance): Promise<void> => {
  await evaluationService.initialize(server);
}; 