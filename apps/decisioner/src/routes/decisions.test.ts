import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { registerDecisionRoutes } from './decisions';
import { decisionService } from '../services/decisionService';
import { redisService } from '../services/redisService';
import { DecisionResult } from '../types';

// Mock dependencies
vi.mock('../services/decisionService', () => ({
  decisionService: {
    makeDecisionFromRequest: vi.fn()
  }
}));

vi.mock('../services/redisService', () => ({
  redisService: {
    getDecision: vi.fn()
  }
}));

describe('Decision Routes', () => {
  // Mock Fastify instance
  const mockServer = {
    post: vi.fn(),
    get: vi.fn(),
    log: {
      error: vi.fn()
    }
  } as unknown as FastifyInstance;
  
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('should register POST route for decisions', () => {
    registerDecisionRoutes(mockServer);
    
    expect(mockServer.post).toHaveBeenCalledWith(
      '/api/decisions',
      expect.objectContaining({
        schema: expect.any(Object),
        handler: expect.any(Function)
      })
    );
  });
  
  it('should register GET route for decision by ID', () => {
    registerDecisionRoutes(mockServer);
    
    expect(mockServer.get).toHaveBeenCalledWith(
      '/api/decisions/:decisionId',
      expect.objectContaining({
        schema: expect.any(Object),
        handler: expect.any(Function)
      })
    );
  });
  
  it('POST handler should call decision service and return result', async () => {
    // Setup mock implementation to test route handler
    const mockRequest = {
      body: {
        evaluationId: '123e4567-e89b-12d3-a456-426614174000',
        merchantId: 'merchant-123',
        transactionId: 'tx-123'
      },
      log: {
        error: vi.fn()
      }
    };
    
    const mockReply = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn()
    };
    
    const mockDecision: DecisionResult = {
      decision: 'approve',
      decisionId: 'decision-123',
      evaluationId: '123e4567-e89b-12d3-a456-426614174000',
      merchantId: 'merchant-123',
      riskScore: 0.2,
      riskLevel: 'low',
      reasoning: ['Low risk transaction'],
      timestamp: Date.now()
    };
    
    // Mock decision service
    vi.mocked(decisionService.makeDecisionFromRequest).mockResolvedValue(mockDecision);
    
    // Get the route handler function
    registerDecisionRoutes(mockServer);
    const postRouteHandler = vi.mocked(mockServer.post).mock.calls[0][1].handler as any;
    
    // Call the handler
    const result = await postRouteHandler(mockRequest, mockReply);
    
    // Verify
    expect(decisionService.makeDecisionFromRequest).toHaveBeenCalledWith(mockRequest.body);
    expect(result).toEqual(mockDecision);
  });
  
  it('POST handler should handle validation errors', async () => {
    // Setup mock implementation with invalid body
    const mockRequest = {
      body: {
        // Missing required fields
        transactionId: 'tx-123'
      },
      log: {
        error: vi.fn()
      }
    };
    
    const mockReply = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn()
    };
    
    // Get the route handler function
    registerDecisionRoutes(mockServer);
    const postRouteHandler = vi.mocked(mockServer.post).mock.calls[0][1].handler as any;
    
    // Call the handler
    await postRouteHandler(mockRequest, mockReply);
    
    // Verify error response
    expect(mockReply.status).toHaveBeenCalledWith(400);
    expect(mockReply.send).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Invalid request payload'
    }));
  });
  
  it('GET handler should return decision by ID', async () => {
    // Setup mock implementation
    const mockRequest = {
      params: {
        decisionId: 'decision-123'
      }
    };
    
    const mockReply = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn()
    };
    
    const mockDecision = {
      id: 'decision-123',
      evaluationId: 'eval-123',
      merchantId: 'merchant-123',
      decision: 'approve' as const,
      riskScore: 0.2,
      riskLevel: 'low' as const,
      reasoning: ['Low risk transaction'],
      createdAt: Date.now()
    };
    
    // Mock Redis service
    vi.mocked(redisService.getDecision).mockResolvedValue(mockDecision);
    
    // Get the route handler function
    registerDecisionRoutes(mockServer);
    const getRouteHandler = vi.mocked(mockServer.get).mock.calls[0][1].handler as any;
    
    // Call the handler
    const result = await getRouteHandler(mockRequest, mockReply);
    
    // Verify
    expect(redisService.getDecision).toHaveBeenCalledWith('decision-123');
    expect(result).toEqual(mockDecision);
  });
  
  it('GET handler should handle not found errors', async () => {
    // Setup mock implementation
    const mockRequest = {
      params: {
        decisionId: 'not-found'
      }
    };
    
    const mockReply = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn()
    };
    
    // Mock Redis service to return null
    vi.mocked(redisService.getDecision).mockResolvedValue(null);
    
    // Get the route handler function
    registerDecisionRoutes(mockServer);
    const getRouteHandler = vi.mocked(mockServer.get).mock.calls[0][1].handler as any;
    
    // Call the handler
    await getRouteHandler(mockRequest, mockReply);
    
    // Verify error response
    expect(mockReply.status).toHaveBeenCalledWith(404);
    expect(mockReply.send).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 404,
      error: 'Not Found'
    }));
  });
}); 