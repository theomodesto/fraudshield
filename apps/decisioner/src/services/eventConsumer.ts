import { FastifyInstance } from 'fastify';
import Kafka from 'node-rdkafka';
import config from '../config';
import { decisionService } from './decisionService';
import { KafkaMessage, RiskScore } from '../types';
import { FastifyBaseLogger } from 'fastify';
/**
 * Kafka consumer for risk scores
 */
class EventConsumer {
  private consumer: Kafka.KafkaConsumer | null = null;
  private logger: FastifyBaseLogger | Console = console;
  private isRunning = false;
  private pollInterval: NodeJS.Timeout | null = null;
  
  /**
   * Initialize Kafka consumer
   */
  async initialize(server: FastifyInstance): Promise<void> {
    try {
      this.logger = server.log as FastifyBaseLogger;
      this.logger.info('Initializing Kafka consumer...');
      
      // Create consumer
      this.consumer = new Kafka.KafkaConsumer({
        'client.id': `${config.kafka.clientId}-consumer`,
        'metadata.broker.list': config.kafka.brokers.join(','),
        'group.id': config.kafka.groupId,
        'enable.auto.commit': false,
        'socket.keepalive.enable': true,
        'fetch.wait.max.ms': 100,
        'fetch.error.backoff.ms': 100,
        'debug': 'consumer,cgrp,topic,fetch' 
      }, 
      {
        // Topic configuration
        'auto.offset.reset': 'earliest'
      });
      
      // Register event handlers
      this.consumer.on('event.log', (log) => {
        this.logger.debug({log},'Kafka consumer log:');
      });
      
      this.consumer.on('event.error', (err) => {
        this.logger.error({err},'Kafka consumer error:');
      });
      
      this.consumer.on('ready', () => {
        this.logger.info('Kafka consumer ready, subscribing to topics...');
        this.consumer?.subscribe([config.kafka.riskScoresTopic]);
        this.startPolling();
      });
      
      this.consumer.on('disconnected', () => {
        this.logger.warn('Kafka consumer disconnected');
        this.stopPolling();
      });
      
      // Connect to Kafka
      await this.connect();
      
      // Add shutdown hook
      server.addHook('onClose', async () => {
        this.logger.info('Shutting down Kafka consumer...');
        await this.disconnect();
      });
      
      this.logger.info('Kafka consumer initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Kafka consumer:', error);
      throw error;
    }
  }
  
  /**
   * Connect to Kafka
   */
  private connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.consumer) {
        return reject(new Error('Consumer not initialized'));
      }
      
      // Register connection callback
      this.consumer.once('ready', () => {
        this.logger.info('Kafka consumer connected');
        resolve();
      });

      // Add connection error handler
      this.consumer.once('connection.failure', (err) => {
        this.logger.error('Failed to connect to Kafka:', err);
        reject(err);
      });
      
      // Connect to Kafka
      this.consumer.connect({}, (err) => {
        if (err) {
          this.logger.error('Failed to connect Kafka consumer:', err);
          return reject(err);
        }
      });
    });
  }
  
  /**
   * Disconnect from Kafka
   */
  private disconnect(): Promise<void> {
    return new Promise((resolve) => {
      this.stopPolling();
      
      if (!this.consumer) {
        return resolve();
      }
      
      this.consumer.disconnect((err) => {
        if (err) {
          this.logger.error('Error disconnecting Kafka consumer:', err);
        }
        
        this.logger.info('Kafka consumer disconnected');
        resolve();
      });
    });
  }
  
  /**
   * Start polling for messages
   */
  private startPolling(): void {
    this.isRunning = true;
    this.poll();
  }
  
  /**
   * Stop polling for messages
   */
  private stopPolling(): void {
    this.isRunning = false;
    
    if (this.pollInterval) {
      clearTimeout(this.pollInterval);
      this.pollInterval = null;
    }
  }
  
  /**
   * Poll for messages
   */
  private poll(): void {
    if (!this.isRunning || !this.consumer) return;
    
    try {
      this.consumer.consume(100, async (err, messages) => {
        if (err) {
          this.logger.error('Error consuming messages:', err);
          // Add a delay before retrying on error
          this.pollInterval = setTimeout(() => this.poll(), 5000);
          return;
        }
        
        if (messages && messages.length > 0) {
          try {
            // Type cast messages to match our KafkaMessage type
            await this.processMessages(messages as unknown as KafkaMessage[]);
            
            // Commit offsets
            this.consumer?.commit();
          } catch (error) {
            this.logger.error('Error processing messages:', error);
          }
        }
        
        // Schedule next poll
        this.pollInterval = setTimeout(() => this.poll(), config.kafka.consumerPollInterval);
      });
    } catch (error) {
      this.logger.error('Error in poll loop:', error);
      
      // Add a delay before retrying on error
      this.pollInterval = setTimeout(() => this.poll(), 5000);
    }
  }
  
  /**
   * Process batch of messages
   */
  private async processMessages(messages: KafkaMessage[]): Promise<void> {
    this.logger.debug(`Processing ${messages.length} messages`);
    
    for (const message of messages) {
      try {
        // Parse message
        const riskScore = this.parseMessage(message);
        if (!riskScore) continue;
        
        // Process risk score
        await decisionService.processRiskScore(riskScore);
      } catch (error) {
        this.logger.error('Error processing message:', error);
      }
    }
  }
  
  /**
   * Parse message into risk score
   */
  private parseMessage(message: KafkaMessage): RiskScore | null {
    try {
      const payload = message.value.toString('utf8');
      const riskScore = JSON.parse(payload) as RiskScore;
      
      // Validate required fields
      if (!riskScore.id || !riskScore.evaluationId || !riskScore.merchantId) {
        this.logger.warn('Invalid risk score message, missing required fields:', riskScore);
        return null;
      }
      
      return riskScore;
    } catch (error) {
      this.logger.error('Error parsing message:', error);
      return null;
    }
  }
}

// Export singleton instance
export const eventConsumer = new EventConsumer();

// Initialize function for service registration
export const initEventConsumer = async (server: FastifyInstance): Promise<void> => {
  await eventConsumer.initialize(server);
}; 