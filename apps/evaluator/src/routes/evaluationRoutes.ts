import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { 
  EvaluationPayload, 
  CaptchaVerificationPayload,
  EvaluationResult 
} from '../types';
import config from '../config';
import { evaluationService } from '../services/evaluationService';
import { captchaService } from '../services/captchaService';
import { eventProducer } from '../services/eventProducer';
import { evaluationSchema, captchaVerificationSchema } from '../schemas';

export const evaluationRoutes = (server: FastifyInstance): void => {
  // Evaluate a transaction
  server.post<{ Body: EvaluationPayload }>('/evaluate', {
    schema: {
      body: {
        type: 'object',
        required: ['sessionId', 'merchantId', 'fingerprintData'],
        properties: {
          sessionId: { type: 'string' },
          merchantId: { type: 'string' },
          fingerprintData: { 
            type: 'object',
            required: ['visitorId', 'requestId', 'incognito', 'browserName', 'deviceType', 'os'],
            properties: {
              visitorId: { type: 'string' },
              requestId: { type: 'string' },
              incognito: { type: 'boolean' },
              browserName: { type: 'string' },
              deviceType: { type: 'string' },
              os: { type: 'string' }
            }
          },
          pageData: { 
            type: 'object',
            properties: {
              url: { type: 'string' },
              referrer: { type: 'string' }
            }
          },
          userAction: { type: 'string' },
          timestamp: { type: 'number' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      // Extract IP address
      const ipAddress = request.ip;
      
      // Validate payload with Zod
      const payload = evaluationSchema.parse(request.body);
      
      // Generate a unique evaluation ID
      const evaluationId = uuidv4();
      
      // Create raw event for processing
      const rawEvent = {
        type: 'evaluation',
        payload,
        timestamp: Date.now(),
        headers: {
          'x-real-ip': ipAddress,
          'x-api-key': request.headers['x-api-key'] as string
        }
      };
      
      // Publish raw event to Kafka
      await eventProducer.produceEvent(config.kafka.rawEventsTopic, rawEvent);
      
      // Process evaluation synchronously
      const enrichedEvent = await evaluationService.enrichData({
        ...payload,
        ipAddress
      });
      
      const riskScore = await evaluationService.calculateRiskScore(enrichedEvent);
      
      // Prepare result
      const result: EvaluationResult = {
        riskScore: riskScore.score,
        isFraud: riskScore.isFraud,
        evaluationId,
        requiresCaptcha: riskScore.score >= 80, // Use merchant settings in production
        captchaSiteKey: riskScore.score >= 80 ? config.hcaptcha.siteKey : undefined
      };
      
      return result;
    } catch (error) {
      server.log.error('Error processing evaluation:', error);
      
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Validation error',
          details: error.errors
        });
      }
      
      return reply.status(500).send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'An error occurred while processing the evaluation'
      });
    }
  });
  
  // Verify CAPTCHA challenge
  server.post<{ Body: CaptchaVerificationPayload }>('/evaluate/captcha', {
    schema: {
      body: {
        type: 'object',
        required: ['evaluationId', 'captchaToken'],
        properties: {
          evaluationId: { type: 'string', format: 'uuid' },
          captchaToken: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      // Validate payload with Zod
      const payload = captchaVerificationSchema.parse(request.body);
      
      // Verify CAPTCHA token
      const isValid = await captchaService.verifyCaptcha(payload.captchaToken);
      
      if (!isValid) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Invalid CAPTCHA token'
        });
      }
      
      // TODO: Look up original evaluation, reassess risk after CAPTCHA
      
      // Sample response - in a real implementation, this would be based on the stored evaluation
      return {
        riskScore: 50, // Reduced score after verified CAPTCHA
        isFraud: false,
        evaluationId: payload.evaluationId,
        requiresCaptcha: false
      };
    } catch (error) {
      server.log.error('Error verifying CAPTCHA:', error);
      
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Validation error',
          details: error.errors
        });
      }
      
      return reply.status(500).send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'An error occurred while verifying the CAPTCHA'
      });
    }
  });
}; 