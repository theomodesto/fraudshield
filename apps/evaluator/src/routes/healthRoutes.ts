import { FastifyInstance } from 'fastify';

export const healthRoutes = (server: FastifyInstance): void => {
  server.get('/health', async (request, reply) => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'evaluator',
      version: '0.0.1'
    };
  });
  
  server.get('/health/ready', async (request, reply) => {
    // Check if all dependencies are ready
    const ready = true; // TODO: Implement real readiness check
    
    if (!ready) {
      return reply.code(503).send({
        status: 'not ready',
        timestamp: new Date().toISOString()
      });
    }
    
    return {
      status: 'ready',
      timestamp: new Date().toISOString()
    };
  });
  
  server.get('/health/live', async (request, reply) => {
    return {
      status: 'alive',
      timestamp: new Date().toISOString()
    };
  });
}; 