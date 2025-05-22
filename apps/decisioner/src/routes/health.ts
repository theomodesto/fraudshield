import { FastifyInstance } from 'fastify';

/**
 * Health check routes
 */
export const registerHealthRoutes = (server: FastifyInstance): void => {
  // Simple health check route
  server.get('/health', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'number' },
            uptime: { type: 'number' }
          }
        }
      }
    },
    handler: async (request, reply) => {
      return {
        status: 'ok',
        timestamp: Date.now(),
        uptime: process.uptime()
      };
    }
  });
  
  // Detailed health check route (internal use only)
  server.get('/health/details', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            components: {
              type: 'object',
              additionalProperties: true
            },
            timestamp: { type: 'number' },
            uptime: { type: 'number' },
            version: { type: 'string' }
          }
        }
      }
    },
    handler: async (request, reply) => {
      return {
        status: 'ok',
        components: {
          server: 'ok',
          // Additional component health checks would go here
        },
        timestamp: Date.now(),
        uptime: process.uptime(),
        version: '0.0.1'
      };
    }
  });
}; 