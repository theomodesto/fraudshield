// Mock modules
import { vi, beforeEach } from 'vitest';

// Mock Redis
vi.mock('ioredis', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      on: vi.fn(),
      get: vi.fn(),
      set: vi.fn().mockResolvedValue('OK'),
      quit: vi.fn().mockResolvedValue('OK'),
      ping: vi.fn().mockResolvedValue('PONG')
    }))
  };
});

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-uuid')
}));

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
}); 