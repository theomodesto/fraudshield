import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { decisionService } from '../services/decisionService';
import { redisService } from '../services/redisService';
import { DecisionPayload } from '../types';
import { decisionRequestSchema } from '../schemas';
/**
 * Decision API routes
 */
export const registerDecisionRoutes = (server: FastifyInstance): void => {
  // Get decision for a transaction
  server.post('/api/decisions', {
    schema: {
      body: {
        type: 'object',
        required: ['evaluationId', 'merchantId'],
        properties: {
          evaluationId: { type: 'string', format: 'uuid' },
          merchantId: { type: 'string' },
          transactionId: { type: 'string' },
          userId: { type: 'string' },
          amount: { type: 'number' },
          currency: { type: 'string' },
          metadata: { 
            type: 'object',
            additionalProperties: true
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            decision: { type: 'string', enum: ['approve', 'review', 'reject'] },
            decisionId: { type: 'string' },
            evaluationId: { type: 'string' },
            merchantId: { type: 'string' },
            riskScore: { type: 'number' },
            riskLevel: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
            reasoning: { type: 'array', items: { type: 'string' } },
            timestamp: { type: 'number' }
          }
        }
      }
    },
    handler: async (request, reply) => {
      try {
        // Validate request body
        const payload = decisionRequestSchema.parse(request.body) as DecisionPayload;
        
        // Get decision
        const decision = await decisionService.makeDecisionFromRequest(payload);
        
        return decision;
      } catch (error) {
        request.log.error('Error getting decision:', error);
        
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            statusCode: 400,
            error: 'Bad Request',
            message: 'Invalid request payload',
            details: error.errors
          });
        }
        
        throw error;
      }
    }
  });
  
  // Get decision by ID
  server.get('/api/decisions/:decisionId', {
    schema: {
      params: {
        type: 'object',
        required: ['decisionId'],
        properties: {
          decisionId: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            evaluationId: { type: 'string' },
            merchantId: { type: 'string' },
            transactionId: { type: 'string' },
            userId: { type: 'string' },
            decision: { type: 'string', enum: ['approve', 'review', 'reject'] },
            riskScore: { type: 'number' },
            riskLevel: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
            reasoning: { type: 'array', items: { type: 'string' } },
            createdAt: { type: 'number' },
            metadata: { 
              type: 'object',
              additionalProperties: true
            }
          }
        }
      }
    },
    handler: async (request, reply) => {
      const { decisionId } = request.params as { decisionId: string };
      
      const decision = await redisService.getDecision(decisionId);
      
      if (!decision) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: `Decision with ID ${decisionId} not found`
        });
      }
      
      return decision;
    }
  });
}; 