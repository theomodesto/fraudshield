import { FastifyInstance } from 'fastify';
import { registerHealthRoutes } from './health';
import { registerDecisionRoutes } from './decisions';

/**
 * Register all routes
 */
export const registerRoutes = (server: FastifyInstance): void => {
  // Register health check routes
  registerHealthRoutes(server);
  
  // Register decision routes
  registerDecisionRoutes(server);
}; 