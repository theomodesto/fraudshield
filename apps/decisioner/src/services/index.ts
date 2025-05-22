import { FastifyInstance } from 'fastify';
import { initRedisService } from './redisService';
import { initEventProducer } from './eventProducer';
import { initEventConsumer } from './eventConsumer';
import { initDecisionService } from './decisionService';

interface InitOptions {
  skipApi?: boolean;
  skipRedis?: boolean;
  skipKafkaProducer?: boolean;
  skipDecisionService?: boolean;
}

export async function initServices(server: FastifyInstance, options: InitOptions = {}): Promise<void> {
  server.log.info('Initializing services...');

  // Initialize Redis
  if (!options.skipRedis) {
    server.log.info('Initializing Redis client...');
    await initRedisService(server);
  }

  // Initialize Kafka producer
  if (!options.skipKafkaProducer) {
    server.log.info('Initializing Kafka producer...');
    await initEventProducer(server);
  }

  // Initialize decision service
  if (!options.skipDecisionService) {
    server.log.info('Initializing decision service...');
    await initDecisionService(server);
  }

  // Initialize Kafka consumer
  if (!options.skipApi) {
    server.log.info('Initializing Kafka consumer...');
    await initEventConsumer(server);
  }

  server.log.info('All services initialized successfully');
} 