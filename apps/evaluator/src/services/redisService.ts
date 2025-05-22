import { FastifyInstance } from 'fastify';
import Redis from 'ioredis';
import config from '../config';

let redisClient: Redis | null = null;

/**
 * Initialize Redis client
 */
export const initRedisClient = async (server: FastifyInstance): Promise<void> => {
  try {
    server.log.info('Initializing Redis client...');
    
    // Create Redis client
    redisClient = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db,
      retryStrategy: (times) => {
        // Exponential backoff with max 30 second delay
        const delay = Math.min(Math.exp(times), 30000);
        server.log.info(`Redis connection retry in ${delay}ms`);
        return delay;
      }
    });
    
    // Add event listeners
    redisClient.on('connect', () => {
      server.log.info('Redis client connected');
    });
    
    redisClient.on('error', (err: Error) => {
      server.log.error('Redis client error:', err);
    });
    
    // Test connection
    await redisClient.ping();
    
    // Add shutdown hook
    server.addHook('onClose', async () => {
      server.log.info('Closing Redis connection...');
      await getRedisClient().quit();
      redisClient = null;
    });
    
    server.log.info('Redis client initialized successfully');
  } catch (error) {
    server.log.error('Failed to initialize Redis client:', error);
    throw error;
  }
};

/**
 * Get Redis client instance
 */
export const getRedisClient = (): Redis => {
  if (!redisClient) {
    throw new Error('Redis client not initialized');
  }
  return redisClient;
};

/**
 * Store a value in Redis with optional expiration
 */
export const setRedisValue = async (
  key: string,
  value: string | number | Buffer | object,
  expireSeconds?: number
): Promise<void> => {
  const redis = getRedisClient();
  const serializedValue = typeof value === 'object' 
    ? JSON.stringify(value) 
    : value.toString();
  
  if (expireSeconds) {
    await redis.setex(key, expireSeconds, serializedValue);
  } else {
    await redis.set(key, serializedValue);
  }
};

/**
 * Get a value from Redis (returns null if not found)
 */
export const getRedisValue = async (key: string): Promise<string | null> => {
  const redis = getRedisClient();
  return redis.get(key);
};

/**
 * Get a JSON value from Redis (returns null if not found)
 */
export const getRedisJson = async <T>(key: string): Promise<T | null> => {
  const redis = getRedisClient();
  const value = await redis.get(key);
  
  if (!value) {
    return null;
  }
  
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.error('Error parsing Redis JSON value:', error);
    return null;
  }
};

/**
 * Increment a value in Redis and return the new value
 */
export const incrRedisValue = async (key: string): Promise<number> => {
  const redis = getRedisClient();
  return redis.incr(key);
};

/**
 * Delete a key from Redis
 */
export const deleteRedisKey = async (key: string): Promise<void> => {
  const redis = getRedisClient();
  await redis.del(key);
}; 