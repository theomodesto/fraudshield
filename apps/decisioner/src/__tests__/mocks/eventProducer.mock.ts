import { vi } from 'vitest';

export const eventProducerMock = {
  initialize: vi.fn().mockResolvedValue(undefined),
  publishDecision: vi.fn().mockResolvedValue(undefined),
  publishEvent: vi.fn().mockResolvedValue(undefined)
};

vi.mock('../../services/eventProducer', () => ({
  eventProducer: eventProducerMock,
  initEventProducer: vi.fn().mockResolvedValue(undefined)
})); 