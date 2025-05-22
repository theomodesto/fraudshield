import { createServer } from './server';
import { initEventConsumer } from './services/eventConsumer';
import { initServices } from './services';

async function startConsumer() {
  try {
    // Create a minimal server instance just for logging
    const server = await createServer();
    
    // Initialize only the required services for the consumer
    await initServices(server, {
      skipApi: true, // Skip API-related services
      skipRedis: false,
      skipKafkaProducer: true,
      skipDecisionService: false
    });
    
    // Initialize the consumer
    await initEventConsumer(server);
    
    server.log.info('Consumer started successfully');
    
    // Handle graceful shutdown
    ['SIGINT', 'SIGTERM'].forEach(signal => {
      process.on(signal, async () => {
        server.log.info(`Received ${signal}, shutting down gracefully...`);
        await server.close();
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('Failed to start consumer:', error);
    process.exit(1);
  }
}

startConsumer(); 