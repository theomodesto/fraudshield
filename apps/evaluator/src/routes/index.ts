import { FastifyInstance } from 'fastify';
import { evaluationRoutes } from './evaluationRoutes';
import { healthRoutes } from './healthRoutes';

export const registerRoutes = (server: FastifyInstance): void => {
  // Register all route groups
  healthRoutes(server);
  evaluationRoutes(server);
}; 