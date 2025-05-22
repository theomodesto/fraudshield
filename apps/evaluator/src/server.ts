import fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import config from './config';
import { registerRoutes } from './routes';
import { initServices } from './services';

// Create the Fastify server instance
export const createServer = async (): Promise<FastifyInstance> => {
  const server = fastify({
    logger: {
      level: config.logLevel,
      transport: {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        }
      }
    }
  });
  
  // Register plugins
  await server.register(cors, {
    origin: true, // Allow all origins in development (customize for production)
    // origin: 'localhost:3001/*', // Allow all origins in development (customize for production)
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'x-api-key', 'x-sdk-version']
  });
  
  await server.register(rateLimit, {
    max: config.api.rateLimit.max,
    timeWindow: config.api.rateLimit.timeWindow,
    keyGenerator: (request) => {
      // Use API key as rate limit key if available, otherwise use IP
      return request.headers['x-api-key'] as string || request.ip;
    },
    errorResponseBuilder: (request, context) => {
      return {
        statusCode: 429,
        error: 'Too Many Requests',
        message: `Rate limit exceeded, retry in ${context.after}`
      };
    }
  });
  
  
  // Initialize services before registering routes
  await initServices(server);
  
  // Register routes
  registerRoutes(server);
  
  // Global error handler
  server.setErrorHandler((error, request, reply) => {
    server.log.error(error);
    
    // Handle validation errors
    if (error.validation) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: error.message
      });
    }
    
    // Send generic error response
    reply.status(error.statusCode || 500).send({
      statusCode: error.statusCode || 500,
      error: error.name || 'Internal Server Error',
      message: error.message || 'An internal server error occurred'
    });
  });
  
  return server;
};

// Start the server
export const startServer = async (): Promise<void> => {
  const server = await createServer();
  
  try {
    await server.listen({
      port: config.port,
      host: config.host
    });
    
    // Listen for termination signals
    ['SIGINT', 'SIGTERM'].forEach(signal => {
      process.on(signal, async () => {
        server.log.info(`Received ${signal}, shutting down gracefully...`);
        
        await server.close();
        process.exit(0);
      });
    });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}; 