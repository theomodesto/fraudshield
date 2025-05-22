import { FastifyInstance } from 'fastify';
import Kafka from 'node-rdkafka';
import config from '../config';

/**
 * Kafka event producer for publishing events
 */
class EventProducer {
  private producer: Kafka.Producer | null = null;
  private connected = false;
  private logger: any = console;
  
  /**
   * Initialize Kafka producer
   */
  async initialize(server: FastifyInstance): Promise<void> {
    try {
      this.logger = server.log;
      this.logger.info('Initializing Kafka producer...');
      
      // Create producer
      this.producer = new Kafka.Producer({
        'client.id': config.kafka.clientId,
        'metadata.broker.list': config.kafka.brokers.join(','),
        'retry.backoff.ms': 200,
        'message.send.max.retries': 10,
        'socket.keepalive.enable': true,
        'queue.buffering.max.messages': 100000,
        'queue.buffering.max.ms': 1000,
        'batch.num.messages': 1000,
        'dr_cb': true // Enable delivery reports
      });
      
      // Register event handlers
      this.producer.on('event.log', (log) => {
        this.logger.debug('Kafka producer log:', log);
      });
      
      this.producer.on('event.error', (err) => {
        this.logger.error('Kafka producer error:', err);
      });
      
      this.producer.on('delivery-report', (err, report) => {
        if (err) {
          this.logger.error('Failed to deliver message:', err, report);
        } else {
          this.logger.debug('Message delivered:', report);
        }
      });
      
      this.producer.on('ready', () => {
        this.connected = true;
        this.logger.info('Kafka producer ready');
      });
      
      this.producer.on('disconnected', () => {
        this.connected = false;
        this.logger.warn('Kafka producer disconnected');
      });
      
      // Connect to Kafka
      await this.connect();
      
      // Add shutdown hook
      server.addHook('onClose', async () => {
        this.logger.info('Shutting down Kafka producer...');
        await this.disconnect();
      });
      
      this.logger.info('Kafka producer initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Kafka producer:', error);
      throw error;
    }
  }
  
  /**
   * Connect to Kafka
   */
  private connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.producer) {
        return reject(new Error('Producer not initialized'));
      }
      
      // Connect to Kafka
      this.producer.connect({}, (err) => {
        if (err) {
          this.logger.error('Failed to connect Kafka producer:', err);
          return reject(err);
        }
        
        this.logger.info('Kafka producer connected');
        resolve();
      });
    });
  }
  
  /**
   * Disconnect from Kafka
   */
  private disconnect(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.producer || !this.connected) {
        return resolve();
      }
      
      this.producer.disconnect((err) => {
        if (err) {
          this.logger.error('Error disconnecting Kafka producer:', err);
        }
        
        this.connected = false;
        this.logger.info('Kafka producer disconnected');
        resolve();
      });
    });
  }
  
  /**
   * Produce an event to a topic
   */
  async produceEvent(topic: string, event: any): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.producer || !this.connected) {
        return reject(new Error('Kafka producer not connected'));
      }
      
      try {
        // Convert event to Buffer
        const eventBuffer = Buffer.from(JSON.stringify(event));
        
        // Produce event
        this.producer.produce(
          topic,
          null, // Use default partition
          eventBuffer,
          null, // No key
          Date.now() // Timestamp
        );
        
        resolve();
      } catch (error) {
        this.logger.error(`Error producing event to ${topic}:`, error);
        reject(error);
      }
    });
  }
}

// Export singleton instance
export const eventProducer = new EventProducer();

// Initialize function for service registration
export const initEventProducer = async (server: FastifyInstance): Promise<void> => {
  await eventProducer.initialize(server);
}; 