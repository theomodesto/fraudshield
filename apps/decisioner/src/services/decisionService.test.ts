import { vi } from 'vitest';
// Import and apply the redisService mock before anything else
import { redisServiceMock } from '../__tests__/mocks/redisService.mock';

import { describe, it, expect, beforeEach } from 'vitest';
import { decisionService } from './decisionService';
import { redisService } from './redisService';
import { eventProducer } from './eventProducer';
import { RiskScore, MerchantRules } from '../types';

// Mock config
vi.mock('../config', () => ({
  default: {
    rules: {
      defaultRiskThreshold: 0.5,
      highRiskThreshold: 0.8
    },
    redis: {
      host: 'localhost',
      port: 6379,
      password: '',
      db: 0
    }
  }
}));

// Mock event producer
vi.mock('./eventProducer', () => ({
  eventProducer: {
    publishDecision: vi.fn().mockResolvedValue(undefined)
  }
}));

describe('DecisionService', () => {
  // Mock Fastify instance
  const mockServer = {
    log: {
      info: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
      warn: vi.fn()
    },
    addHook: vi.fn()
  } as any;

  // Test data
  const mockRiskScore: RiskScore = {
    id: 'risk-123',
    evaluationId: 'eval-123',
    sessionId: 'session-123',
    merchantId: 'merchant-123',
    visitorId: 'visitor-123',
    score: 0.7,
    isFraud: false,
    riskFactors: ['unusual_behavior'],
    timestamp: Date.now()
  };

  const mockMerchantRules: MerchantRules = {
    merchantId: 'merchant-123',
    riskThreshold: 0.5,
    highRiskThreshold: 0.8,
    automaticReject: false,
    manualReviewThreshold: 0.7,
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

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    redisServiceMock.getMerchantRules.mockResolvedValue(mockMerchantRules);
    redisServiceMock.storeMerchantRules.mockResolvedValue(undefined);
    redisServiceMock.storeDecision.mockResolvedValue(undefined);
    redisServiceMock.client = {}; // Ensure client is set
    
    // Initialize Redis service mock
    redisServiceMock.initialize.mockResolvedValue(undefined);
  });

  describe('initialize', () => {
    it('should initialize the decision service and setup default rules', async () => {
      await decisionService.initialize(mockServer);
      
      expect(mockServer.log.info).toHaveBeenCalledWith('Initializing decision service...');
      expect(redisService.storeMerchantRules).toHaveBeenCalledWith('default', expect.any(Object));
      expect(mockServer.log.info).toHaveBeenCalledWith('Decision service initialized successfully');
    });

    it('should handle initialization errors', async () => {
      // Mock an error
      redisServiceMock.storeMerchantRules.mockRejectedValueOnce(new Error('Connection error'));
      
      await expect(decisionService.initialize(mockServer)).rejects.toThrow('Connection error');
      expect(mockServer.log.error).toHaveBeenCalled();
    });
  });

  describe('processRiskScore', () => {
    it('should process a risk score and make a decision', async () => {
      await decisionService.initialize(mockServer);
      await decisionService.processRiskScore(mockRiskScore);
      
      expect(redisService.storeDecision).toHaveBeenCalledWith(
        'test-uuid',
        expect.objectContaining({
          id: 'test-uuid',
          evaluationId: 'eval-123',
          merchantId: 'merchant-123',
          decision: 'review',
          riskScore: 0.7
        })
      );
      
      expect(eventProducer.publishDecision).toHaveBeenCalled();
    });

    it('should handle errors during processing', async () => {
      // Mock an error
      redisServiceMock.storeDecision.mockRejectedValueOnce(new Error('Storage error'));
      
      await decisionService.initialize(mockServer);
      await decisionService.processRiskScore(mockRiskScore);
      
      expect(mockServer.log.error).toHaveBeenCalled();
    });
  });

  describe('makeDecisionFromRequest', () => {
    it('should make a decision from request payload', async () => {
      const payload = {
        evaluationId: 'eval-123',
        merchantId: 'merchant-123',
        transactionId: 'tx-123',
        userId: 'user-123'
      };
      
      // Setup mock for getRiskScoreForEvaluation
      const privateRiskScoreMethod = vi.spyOn(
        decisionService as any, 
        'getRiskScoreForEvaluation'
      );
      privateRiskScoreMethod.mockResolvedValue(mockRiskScore);
      
      await decisionService.initialize(mockServer);
      const result = await decisionService.makeDecisionFromRequest(payload);
      
      expect(result).toEqual(expect.objectContaining({
        decision: expect.stringMatching(/approve|review|reject/),
        decisionId: 'test-uuid',
        evaluationId: 'eval-123',
        merchantId: 'merchant-123',
        riskScore: expect.any(Number),
        riskLevel: expect.stringMatching(/low|medium|high|critical/),
        reasoning: expect.any(Array),
        timestamp: expect.any(Number)
      }));
      
      expect(redisService.storeDecision).toHaveBeenCalled();
    });

    it('should throw an error if risk score not found', async () => {
      const payload = {
        evaluationId: 'not-found',
        merchantId: 'merchant-123'
      };
      
      // Setup mock for getRiskScoreForEvaluation to return null
      const privateRiskScoreMethod = vi.spyOn(
        decisionService as any, 
        'getRiskScoreForEvaluation'
      );
      privateRiskScoreMethod.mockResolvedValue(null);
      
      await decisionService.initialize(mockServer);
      await expect(decisionService.makeDecisionFromRequest(payload))
        .rejects.toThrow(`Risk score not found for evaluation ID ${payload.evaluationId}`);
    });
  });

  describe('private methods', () => {
    it('getRiskLevel should return the correct risk level based on score', async () => {
      const getRiskLevel = vi.spyOn(decisionService as any, 'getRiskLevel');
      await decisionService.initialize(mockServer);
      
      // Call processRiskScore to trigger getRiskLevel internally
      await decisionService.processRiskScore({...mockRiskScore, score: 0.95});
      await decisionService.processRiskScore({...mockRiskScore, score: 0.85});
      await decisionService.processRiskScore({...mockRiskScore, score: 0.6});
      await decisionService.processRiskScore({...mockRiskScore, score: 0.3});
      
      // Verify different calls return different risk levels
      expect(getRiskLevel).toHaveBeenNthCalledWith(1, 0.95);
      expect(getRiskLevel).toHaveBeenNthCalledWith(2, 0.85);
      expect(getRiskLevel).toHaveBeenNthCalledWith(3, 0.6);
      expect(getRiskLevel).toHaveBeenNthCalledWith(4, 0.3);
    });

    it('matchesRule should correctly apply rule conditions', async () => {
      // Setup test data
      const testRiskScore = {
        ...mockRiskScore,
        riskFactors: ['high_risk_country', 'multiple_accounts']
      };
      
      const testRule = {
        id: 'test-rule',
        name: 'Test Rule',
        conditions: [
          {
            field: 'riskFactors',
            operator: 'contains',
            value: 'high_risk_country'
          }
        ],
        action: 'review',
        priority: 10,
        isEnabled: true
      };
      
      // Create a spy on the private method
      const matchesRuleSpy = vi.spyOn(decisionService as any, 'matchesRule');
      const applyCustomRulesSpy = vi.spyOn(decisionService as any, 'applyCustomRules');
      
      await decisionService.initialize(mockServer);
      
      // Modify custom rules for this test
      redisServiceMock.getMerchantRules.mockResolvedValueOnce({
        ...mockMerchantRules,
        customRules: [testRule]
      });
      
      // Call processRiskScore
      await decisionService.processRiskScore(testRiskScore);
      
      // Verify matchesRule was called with our test data
      expect(matchesRuleSpy).toHaveBeenCalledWith(
        expect.objectContaining({riskFactors: testRiskScore.riskFactors}),
        testRule
      );
      
      // Verify applyCustomRules was called
      expect(applyCustomRulesSpy).toHaveBeenCalled();
    });
  });
}); 