import { v4 as uuidv4 } from 'uuid';
import { collectCanvasFingerprint } from './collectors/canvasCollector';
import { collectWebGLFingerprint } from './collectors/webglCollector';
import { collectAudioFingerprint } from './collectors/audioCollector';
import { detectFonts } from './collectors/fontCollector';
import { getBrowserInfo, detectIncognito } from './utils/browser';
import { getStorage } from './utils/storage';
import { getLogger } from './utils/logger';
import { hashString } from './utils/hash';
import { 
  DeviceData, 
  FingerprintOptions, 
  Logger, 
  Storage, 
  SignalCollectionResult,
  BrowserInfo 
} from './types';

const DEFAULT_OPTIONS: FingerprintOptions = {
  debug: false,
  cacheExpiration: 24 * 60 * 60 * 1000, // 24 hours
  enabledSignals: {
    canvas: true,
    webgl: true,
    audio: true,
    fonts: true,
    incognito: true
  },
  cachingEnabled: true,
  failsafeTimeout: 2000 // 2 seconds timeout for signals collection
};

/**
 * Core FingerprintClient class that collects and manages device fingerprinting
 * 
 * @example
 * ```typescript
 * const client = new FingerprintClient();
 * const deviceData = await client.collectData();
 * console.log(deviceData.visitorId);
 * ```
 */
export class FingerprintClient {
  private options: FingerprintOptions;
  private storage: Storage;
  private logger: Logger;
  private cacheKey = 'fraudshield_fp';
  
  /**
   * Create a new FingerprintClient instance
   * 
   * @param options - Configuration options for fingerprinting
   */
  constructor(options: Partial<FingerprintOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.storage = getStorage('fraudshield_fp_');
    this.logger = getLogger({ 
      debug: this.options.debug,
      prefix: '[FraudShield Fingerprint]'
    });
    this.logger.debug('FingerprintClient initialized', { options: this.options });
  }
  
  /**
   * Collect device data for fingerprinting
   * 
   * @returns Promise resolving to device fingerprint data
   */
  public async collectData(): Promise<DeviceData> {
    this.logger.debug('Starting device data collection');
    
    try {
      // Try to get cached fingerprint first if caching is enabled
      if (this.options.cachingEnabled !== false) {
        const cachedData = await this.getCachedFingerprint();
        if (cachedData) {
          this.logger.debug('Using cached fingerprint', { visitorId: cachedData.visitorId });
          return {
            ...cachedData,
            requestId: uuidv4() // Always generate a new requestId
          };
        }
      }
      
      // Generate a new fingerprint if no cache
      const deviceData = await this.generateFingerprint();
      
      // Cache the fingerprint if caching is enabled
      if (this.options.cachingEnabled !== false) {
        await this.cacheFingerprint(deviceData);
      }
      
      return deviceData;
    } catch (error) {
      this.logger.error('Error collecting device data', error);
      
      // Return basic fingerprint if full collection fails
      return this.getBasicFingerprint();
    }
  }
  
  /**
   * Generate a new fingerprint by collecting all signals
   * @private
   */
  private async generateFingerprint(): Promise<DeviceData> {
    this.logger.debug('Generating new fingerprint');
    
    try {
      // Collect browser and OS info
      const browserInfo: BrowserInfo = getBrowserInfo();
      const { name: browserName, version: browserVersion, os, deviceType } = browserInfo;
      
      // Initialize signals object
      const signals: Record<string, any> = {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        colorDepth: screen.colorDepth,
        screenResolution: `${screen.width}x${screen.height}`,
        timezone: new Date().getTimezoneOffset(),
        browserName,
        browserVersion,
        deviceType
      };
      
      // Collect enabled signals with timeout protection
      const signalResults = await this.collectSignalsWithTimeout();
      
      // Add collected signals to the signals object
      for (const [key, value] of Object.entries(signalResults)) {
        if (value !== null) {
          signals[key] = value;
        }
      }
      
      // Collect incognito status
      let incognito = false;
      if (this.options.enabledSignals?.incognito) {
        try {
          incognito = await detectIncognito();
          signals.incognito = incognito;
        } catch (error) {
          this.logger.warn('Error detecting incognito mode', error);
        }
      }
      
      // Combine all signal hashes to generate the visitor ID
      const signalHashes = this.getSignalHashes(signalResults);
      const visitorIdInput = signalHashes.join('|');
      const visitorId = hashString(visitorIdInput || navigator.userAgent);
      
      // Generate confidence score based on available signals
      const confidence = this.calculateConfidence(signalResults);
      
      const deviceData: DeviceData = {
        visitorId,
        requestId: uuidv4(),
        incognito,
        browserName,
        deviceType,
        os,
        confidence,
        signals,
        collectedAt: new Date().toISOString()
      };
      
      this.logger.debug('Generated fingerprint', { 
        visitorId, 
        confidence,
        signalCount: signalHashes.length
      });
      
      return deviceData;
    } catch (error) {
      this.logger.error('Error in fingerprint generation', error);
      throw error; // Re-throw to be caught by the main collectData method
    }
  }
  
  /**
   * Collect all signals with a timeout to prevent hanging
   * @private
   */
  private async collectSignalsWithTimeout(): Promise<Record<string, any>> {
    const signalResults: Record<string, any> = {};
    const collectPromises: Array<Promise<void>> = [];
    const timeout = this.options.failsafeTimeout || 2000;
    
    // Setup canvas collection if enabled
    if (this.options.enabledSignals?.canvas) {
      const canvasPromise = this.collectSignalWithTimeout(
        () => collectCanvasFingerprint(),
        'canvas',
        signalResults,
        timeout
      );
      collectPromises.push(canvasPromise);
    }
    
    // Setup WebGL collection if enabled
    if (this.options.enabledSignals?.webgl) {
      const webglPromise = this.collectSignalWithTimeout(
        () => collectWebGLFingerprint(),
        'webgl',
        signalResults,
        timeout
      );
      collectPromises.push(webglPromise);
    }
    
    // Setup audio collection if enabled
    if (this.options.enabledSignals?.audio) {
      const audioPromise = this.collectSignalWithTimeout(
        () => collectAudioFingerprint(),
        'audio',
        signalResults,
        timeout
      );
      collectPromises.push(audioPromise);
    }
    
    // Setup font detection if enabled
    if (this.options.enabledSignals?.fonts) {
      const fontsPromise = this.collectSignalWithTimeout(
        () => detectFonts(),
        'fonts',
        signalResults,
        timeout
      );
      collectPromises.push(fontsPromise);
    }
    
    // Wait for all promises to settle (either resolve or reject)
    await Promise.allSettled(collectPromises);
    
    return signalResults;
  }
  
  /**
   * Collect a single signal with timeout protection
   * @private
   */
  private async collectSignalWithTimeout<T>(
    collector: () => Promise<T>,
    signalName: string,
    resultsObject: Record<string, any>,
    timeoutMs: number
  ): Promise<void> {
    try {
      // Create a promise that rejects after the timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        const id = setTimeout(() => {
          clearTimeout(id);
          reject(new Error(`Signal collection timeout: ${signalName}`));
        }, timeoutMs);
      });
      
      // Race the collector against the timeout
      const result = await Promise.race([
        collector(),
        timeoutPromise
      ]);
      
      resultsObject[signalName] = result;
    } catch (error) {
      this.logger.warn(`Error collecting ${signalName}`, error);
      resultsObject[signalName] = null;
    }
  }
  
  /**
   * Extract signal hashes from the collected signals
   * @private
   */
  private getSignalHashes(signalResults: Record<string, any>): string[] {
    const hashes: string[] = [];
    
    if (signalResults.canvas) {
      hashes.push(signalResults.canvas);
    }
    
    if (signalResults.webgl?.hash) {
      hashes.push(signalResults.webgl.hash);
    }
    
    if (signalResults.audio?.hash) {
      hashes.push(signalResults.audio.hash);
    }
    
    if (signalResults.fonts?.hash) {
      hashes.push(signalResults.fonts.hash);
    }
    
    return hashes.filter(Boolean);
  }
  
  /**
   * Calculate confidence score based on available signals
   * @private
   */
  private calculateConfidence(signalResults: Record<string, any>): number {
    // Count how many signals were successfully collected
    const validSignals = Object.entries(signalResults)
      .filter(([_, value]) => value !== null)
      .length;
    
    // Count how many signals were enabled in the configuration
    const enabledSignalsCount = Object.values(this.options.enabledSignals || {})
      .filter(Boolean).length;
    
    if (enabledSignalsCount === 0) return 0;
    
    // Calculate confidence based on the ratio of valid signals to enabled signals
    const confidenceScore = validSignals / enabledSignalsCount;
    
    // Apply a weight factor based on the types of signals collected
    // Audio and Canvas signals are considered stronger indicators
    let weightBonus = 0;
    if (signalResults.canvas) weightBonus += 0.05;
    if (signalResults.audio) weightBonus += 0.05;
    
    return Math.min(1, confidenceScore + weightBonus);
  }
  
  /**
   * Get basic fingerprint when full collection fails
   * @private
   */
  private getBasicFingerprint(): DeviceData {
    try {
      const { name: browserName, os, deviceType } = getBrowserInfo();
      
      // Create a simple fingerprint from basic browser data
      const basicId = hashString(
        navigator.userAgent + 
        navigator.language + 
        String(screen.colorDepth) + 
        String(new Date().getTimezoneOffset())
      );
      
      return {
        visitorId: basicId,
        requestId: uuidv4(),
        incognito: false,
        browserName,
        deviceType,
        os,
        confidence: 0.3,
        collectedAt: new Date().toISOString()
      };
    } catch (error) {
      // Ultimate fallback if even basic fingerprinting fails
      this.logger.error('Critical failure in basic fingerprint generation', error);
      
      return {
        visitorId: hashString(Math.random().toString() + new Date().toISOString()),
        requestId: uuidv4(),
        incognito: false,
        browserName: 'unknown',
        deviceType: 'unknown',
        os: 'unknown',
        confidence: 0.1,
        collectedAt: new Date().toISOString()
      };
    }
  }
  
  /**
   * Try to get cached fingerprint
   * @private
   */
  private async getCachedFingerprint(): Promise<DeviceData | null> {
    try {
      const cachedData = await this.storage.get(this.cacheKey);
      
      if (cachedData) {
        try {
          const parsedData = JSON.parse(cachedData) as DeviceData;
          
          // Validate the parsed data has required fields
          if (parsedData && parsedData.visitorId) {
            // Check if the data is stale (optional based on configuration)
            if (this.options.cacheExpirationCheck && parsedData.collectedAt) {
              const collectedAt = new Date(parsedData.collectedAt).getTime();
              const now = Date.now();
              const age = now - collectedAt;
              
              if (age > (this.options.cacheExpiration || 0)) {
                this.logger.debug('Cached fingerprint expired', { age });
                return null;
              }
            }
            
            return parsedData;
          }
        } catch (parseError) {
          this.logger.warn('Error parsing cached fingerprint', parseError);
        }
      }
      
      return null;
    } catch (error) {
      this.logger.warn('Error getting cached fingerprint', error);
      return null;
    }
  }
  
  /**
   * Cache fingerprint for future use
   * @private
   */
  private async cacheFingerprint(deviceData: DeviceData): Promise<void> {
    try {
      await this.storage.set(
        this.cacheKey,
        JSON.stringify(deviceData),
        this.options.cacheExpiration
      );
      this.logger.debug('Fingerprint cached successfully');
    } catch (error) {
      this.logger.warn('Error caching fingerprint', error);
    }
  }
} 