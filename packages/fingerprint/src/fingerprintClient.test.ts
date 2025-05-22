import { vi } from 'vitest';
import { FingerprintClient } from './fingerprintClient';
import { getBrowserInfo } from './utils/browser';
// Mock dependencies
vi.mock('uuid', () => ({
  v4: () => 'test-uuid'
}));

// Mock browser utils
vi.mock('./utils/browser', () => ({
  getBrowserInfo: vi.fn().mockReturnValue({
    name: 'chrome',
    version: '100.0.0',
    os: 'macOS',
    deviceType: 'desktop'
  }),
  detectIncognito: vi.fn().mockResolvedValue(false)
}));

// Mock storage
const storageMock = {
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue(undefined),
  remove: vi.fn().mockResolvedValue(undefined)
};

vi.mock('./utils/storage', () => ({
  getStorage: () => storageMock
}));

// Mock collectors
const canvasMock = vi.fn().mockResolvedValue('canvas-hash');
const webglMock = vi.fn().mockResolvedValue({ 
  hash: 'webgl-hash',
  renderer: 'Test Renderer',
  vendor: 'Test Vendor'
});
const audioMock = vi.fn().mockResolvedValue({ 
  hash: 'audio-hash',
  data: [1, 2, 3] 
});
const fontsMock = vi.fn().mockResolvedValue({
  hash: 'fonts-hash',
  fonts: ['Arial', 'Helvetica']
});

vi.mock('./collectors/canvasCollector', () => ({
  collectCanvasFingerprint: () => canvasMock()
}));

vi.mock('./collectors/webglCollector', () => ({
  collectWebGLFingerprint: () => webglMock()
}));

vi.mock('./collectors/audioCollector', () => ({
  collectAudioFingerprint: () => audioMock()
}));

vi.mock('./collectors/fontCollector', () => ({
  detectFonts: () => fontsMock()
}));

// Mock hash utility
vi.mock('./utils/hash', () => ({
  hashString: (str: string) => `hashed-${str}`
}));

// Mock logger
const loggerMock = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
};

vi.mock('./utils/logger', () => ({
  getLogger: () => loggerMock
}));

describe('FingerprintClient', () => {
  let client: FingerprintClient;
  
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    canvasMock.mockResolvedValue('canvas-hash');
    webglMock.mockResolvedValue({ 
      hash: 'webgl-hash',
      renderer: 'Test Renderer',
      vendor: 'Test Vendor'
    });
    audioMock.mockResolvedValue({ 
      hash: 'audio-hash',
      data: [1, 2, 3] 
    });
    fontsMock.mockResolvedValue({
      hash: 'fonts-hash',
      fonts: ['Arial', 'Helvetica']
    });
    
    // Create a new client instance for each test
    client = new FingerprintClient({
      debug: true
    });
    
    // Mock the global navigator and screen objects using vi.stubGlobal
    vi.stubGlobal('navigator', {
      userAgent: 'test-user-agent',
      language: 'en-US',
      platform: 'MacIntel'
    });
    
    vi.stubGlobal('screen', {
      width: 1920,
      height: 1080,
      colorDepth: 24
    });
  });
  
  it('should create an instance with default options', () => {
    const client = new FingerprintClient();
    expect(client).toBeInstanceOf(FingerprintClient);
  });
  
  it('should collect device data and generate a fingerprint', async () => {
    const deviceData = await client.collectData();
    
    // Verify the structure of the collected data
    expect(deviceData).toBeDefined();
    expect(deviceData.visitorId).toBeDefined();
    expect(deviceData.requestId).toBe('test-uuid');
    expect(deviceData.browserName).toBe('chrome');
    expect(deviceData.deviceType).toBe('desktop');
    expect(deviceData.os).toBe('macOS');
    expect(deviceData.confidence).toBeGreaterThan(0);
    expect(deviceData.collectedAt).toBeDefined();
    
    // Verify signals are collected
    expect(deviceData.signals).toBeDefined();
    expect(deviceData.signals?.canvas).toBe('canvas-hash');
    expect(deviceData.signals?.webgl).toBeDefined();
    expect(deviceData.signals?.audio).toBeDefined();
    expect(deviceData.signals?.fonts).toBeDefined();
  });
  
  it('should handle errors and return a basic fingerprint if collection fails', async () => {
    // Mock getBrowserInfo to simulate an error first, then return normal value for basic fingerprint
    const getBrowserInfoMock = vi.mocked(getBrowserInfo);
    getBrowserInfoMock.mockImplementationOnce(() => {
      throw new Error('Test error');
    }).mockReturnValueOnce({
      name: 'chrome',
      version: '100.0.0',
      os: 'macOS',
      deviceType: 'desktop'
    });
    
    const deviceData = await client.collectData();
    
    // Should still return a basic fingerprint
    expect(deviceData).toBeDefined();
    expect(deviceData.visitorId).toBeDefined();
    expect(deviceData.requestId).toBe('test-uuid');
    expect(deviceData.confidence).toBeLessThan(0.5); // Basic fingerprint has lower confidence
    expect(loggerMock.error).toHaveBeenCalledWith('Error collecting device data', expect.any(Error));
  });

  it('should retrieve cached fingerprint when available', async () => {
    const cachedFingerprint = {
      visitorId: 'cached-visitor-id',
      requestId: 'old-request-id',
      incognito: false,
      browserName: 'chrome',
      deviceType: 'desktop',
      os: 'macOS',
      confidence: 0.9,
      collectedAt: new Date().toISOString(),
      signals: { canvas: 'canvas-hash' }
    };

    // Mock storage to return a cached fingerprint
    storageMock.get.mockResolvedValueOnce(JSON.stringify(cachedFingerprint));

    const deviceData = await client.collectData();

    // Should use cached data but with a new requestId
    expect(deviceData.visitorId).toBe(cachedFingerprint.visitorId);
    expect(deviceData.requestId).toBe('test-uuid'); // New UUID
    expect(deviceData.confidence).toBe(cachedFingerprint.confidence);
    expect(storageMock.get).toHaveBeenCalledWith('fraudshield_fp');
    expect(storageMock.set).not.toHaveBeenCalled(); // Should not cache again
  });

  it('should cache the generated fingerprint', async () => {
    await client.collectData();
    
    // Verify the fingerprint was cached
    expect(storageMock.set).toHaveBeenCalledWith(
      'fraudshield_fp',
      expect.any(String),
      expect.any(Number)
    );
  });

  it('should respect disabled signals in configuration', async () => {
    // Create client with some signals disabled
    client = new FingerprintClient({
      enabledSignals: {
        canvas: false,
        webgl: false,
        audio: true,
        fonts: true,
        incognito: true
      }
    });

    const deviceData = await client.collectData();

    // Verify only enabled signals were collected
    expect(deviceData.signals?.canvas).toBeUndefined();
    expect(deviceData.signals?.webgl).toBeUndefined();
    expect(deviceData.signals?.audio).toBeDefined();
    expect(deviceData.signals?.fonts).toBeDefined();
  });

  it('should have correct confidence based on enabled signals', async () => {
    // Create client with only some signals enabled
    client = new FingerprintClient({
      enabledSignals: {
        canvas: true,
        webgl: true,
        audio: false,
        fonts: false,
        incognito: true
      }
    });

    const deviceData = await client.collectData();

    // With 3 out of 5 signals enabled and all collected successfully
    expect(deviceData.confidence).toBeGreaterThan(0.6);
    expect(deviceData.confidence).toBeLessThanOrEqual(1);
  });

  it('should handle storage errors gracefully', async () => {
    // Mock storage.get to throw an error
    storageMock.get.mockRejectedValueOnce(new Error('Storage error'));
    
    const deviceData = await client.collectData();
    
    // Should still generate a fingerprint despite storage error
    expect(deviceData).toBeDefined();
    expect(deviceData.visitorId).toBeDefined();
    expect(loggerMock.warn).toHaveBeenCalledWith(
      'Error getting cached fingerprint', 
      expect.any(Error)
    );
  });

  it('should not use caching when disabled in options', async () => {
    // Create client with caching disabled
    client = new FingerprintClient({
      cachingEnabled: false
    });
    
    await client.collectData();
    
    // Verify the fingerprint was not cached
    expect(storageMock.get).not.toHaveBeenCalled();
    expect(storageMock.set).not.toHaveBeenCalled();
  });

  it('should handle signal collection timeouts', async () => {
    // Mock canvas collection to throw an error
    canvasMock.mockRejectedValueOnce(new Error('Timeout'));
    
    // Create client with short timeout
    client = new FingerprintClient({
      failsafeTimeout: 10 // Very short timeout to force failure
    });
    
    const deviceData = await client.collectData();
    
    // Should still generate a fingerprint with other signals
    expect(deviceData).toBeDefined();
    expect(deviceData.visitorId).toBeDefined();
    
    // Canvas signal should be missing but others should exist
    expect(deviceData.signals?.canvas).toBeUndefined();
    expect(deviceData.signals?.webgl).toBeDefined();
  });

  it('should handle expired cache with cacheExpirationCheck', async () => {
    // Create expired cache data (1 day old)
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 1);
    
    const cachedFingerprint = {
      visitorId: 'cached-visitor-id',
      requestId: 'old-request-id',
      incognito: false,
      browserName: 'chrome',
      deviceType: 'desktop',
      os: 'macOS',
      confidence: 0.9,
      collectedAt: oldDate.toISOString(),
      signals: { canvas: 'canvas-hash' }
    };

    // Mock storage to return an expired cached fingerprint
    storageMock.get.mockResolvedValueOnce(JSON.stringify(cachedFingerprint));

    // Create client with cache expiration check
    client = new FingerprintClient({
      cacheExpirationCheck: true,
      cacheExpiration: 12 * 60 * 60 * 1000 // 12 hours
    });

    await client.collectData();

    // Should generate a new fingerprint instead of using expired cache
    expect(storageMock.set).toHaveBeenCalled();
  });
}); 