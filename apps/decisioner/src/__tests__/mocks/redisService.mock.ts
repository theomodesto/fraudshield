import { vi } from 'vitest';

// Create a mock implementation of the Redis service
export const redisServiceMock = {
  client: {}, // Mocking that client is set
  initialize: vi.fn().mockResolvedValue(undefined),
  get: vi.fn(),
  set: vi.fn().mockResolvedValue(undefined),
  storeMerchantRules: vi.fn().mockResolvedValue(undefined),
  getMerchantRules: vi.fn(),
  storeDecision: vi.fn().mockResolvedValue(undefined),
  getDecision: vi.fn()
};

// Mock the entire service
vi.mock('../../services/redisService', () => ({
  redisService: redisServiceMock,
  initRedisService: vi.fn().mockResolvedValue(undefined)
})); 