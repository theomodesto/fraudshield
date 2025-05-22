import { FastifyInstance } from 'fastify';
import Redis from 'ioredis';
import config from '../config';

/**
 * Redis client service for caching and data storage
 */
class RedisService {
  private client: Redis | null = null;
  private logger: any = console;
  
  /**
   * Initialize Redis client
   */
  async initialize(server: FastifyInstance): Promise<void> {
    try {
      this.logger = server.log;
      this.logger.info('Initializing Redis client...');
      
      // Create Redis client
      this.client = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        db: config.redis.db,
        retryStrategy: (times) => {
          const delay = Math.min(times * 100, 3000);
          this.logger.warn(`Redis connection attempt ${times} failed, retrying in ${delay}ms...`);
          return delay;
        }
      });
      
      // Register event handlers
      this.client.on('connect', () => {
        this.logger.info('Redis client connected');
      });
      
      this.client.on('error', (err) => {
        this.logger.error('Redis client error:', err);
      });
      
      // Add shutdown hook
      server.addHook('onClose', async () => {
        this.logger.info('Shutting down Redis client...');
        await this.disconnect();
      });
      
      // Verify connection works
      await this.ping();
      
      this.logger.info('Redis client initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Redis client:', error);
      throw error;
    }
  }
  
  /**
   * Ping Redis to verify connection
   */
  private async ping(): Promise<boolean> {
    if (!this.client) return false;
    
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      this.logger.error('Redis ping failed:', error);
      return false;
    }
  }
  
  /**
   * Disconnect Redis client
   */
  private async disconnect(): Promise<void> {
    if (!this.client) return;
    
    try {
      await this.client.quit();
      this.logger.info('Redis client disconnected');
    } catch (error) {
      this.logger.error('Error disconnecting Redis client:', error);
    } finally {
      this.client = null;
    }
  }
  
  /**
   * Get value from Redis
   */
  async get(key: string): Promise<string | null> {
    if (!this.client) throw new Error('Redis client not initialized');
    return this.client.get(key);
  }
  
  /**
   * Set value in Redis with optional TTL
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.client) throw new Error('Redis client not initialized');
    
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }
  
  /**
   * Store merchant rules in Redis
   */
  async storeMerchantRules(merchantId: string, rules: any): Promise<void> {
    const key = `merchant:${merchantId}:rules`;
    await this.set(key, JSON.stringify(rules));
  }
  
  /**
   * Get merchant rules from Redis
   */
  async getMerchantRules(merchantId: string): Promise<any | null> {
    const key = `merchant:${merchantId}:rules`;
    const rulesJson = await this.get(key);
    
    if (!rulesJson) return null;
    try {
      return JSON.parse(rulesJson);
    } catch (error) {
      this.logger.error(`Error parsing merchant rules for ${merchantId}:`, error);
      return null;
    }
  }
  
  /**
   * Store transaction decision in Redis
   */
  async storeDecision(decisionId: string, decision: any, ttlSeconds = 86400): Promise<void> {
    const key = `decision:${decisionId}`;
    await this.set(key, JSON.stringify(decision), ttlSeconds);
  }
  
  /**
   * Get transaction decision from Redis
   */
  async getDecision(decisionId: string): Promise<any | null> {
    const key = `decision:${decisionId}`;
    const decisionJson = await this.get(key);
    
    if (!decisionJson) return null;
    try {
      return JSON.parse(decisionJson);
    } catch (error) {
      this.logger.error(`Error parsing decision for ${decisionId}:`, error);
      return null;
    }
  }
}

// Export singleton instance
export const redisService = new RedisService();

// Initialize function for service registration
export const initRedisService = async (server: FastifyInstance): Promise<void> => {
  await redisService.initialize(server);
}; 