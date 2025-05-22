import { FastifyInstance } from 'fastify';
import { initRedisClient } from './redisService';
import { initGeoIpService } from './geoIpService';
import { initEventProducer } from './eventProducer';
import { initCaptchaService } from './captchaService';
import { initEvaluationService } from './evaluationService';

/**
 * Initialize all service dependencies
 */
export const initServices = async (server: FastifyInstance): Promise<void> => {
  try {
    server.log.info('Initializing services...');
    
    // Initialize services in order
    await initRedisClient(server);
    await initGeoIpService(server);
    await initEventProducer(server);
    await initCaptchaService(server);
    await initEvaluationService(server);
    
    // Add graceful shutdown hooks
    server.addHook('onClose', async (instance) => {
      instance.log.info('Shutting down services gracefully...');
      // Services will register their own onClose hooks
    });
    
    server.log.info('All services initialized successfully');
  } catch (error) {
    server.log.error('Failed to initialize services:', error);
    throw error;
  }
}; 