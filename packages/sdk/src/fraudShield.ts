import { FingerprintClient } from '@fraudshield/fingerprint';
import { ApiClient } from './utils/api';
import { getOrCreateSessionId, sessionStore } from './utils/storage';
import { showCaptchaChallenge } from './utils/captcha';
import {
  SDKConfig,
  PageContext,
  EvaluationPayload,
  EvaluationResult,
  CaptchaResult
} from './types';

// Default configuration
const DEFAULT_CONFIG: Partial<SDKConfig> = {
  apiEndpoint: 'https://api.fraudshield.io/v1',
  debug: false,
  autoEvaluate: true,
  enableCaptcha: true,
  captchaThreshold: 80,
  testMode: false
};

/**
 * Main FraudShield SDK class
 */
export class FraudShield {
  private static instance: FraudShield | null = null;
  
  // Configuration
  private config: SDKConfig;
  
  // Dependencies
  private fingerprintClient: FingerprintClient;
  private apiClient: ApiClient;
  
  // Internal state
  private initialized: boolean = false;
  private eventListeners: { [key: string]: () => void } = {};
  
  /**
   * Private constructor - use static init() or getInstance() methods instead
   */
  private constructor(config: SDKConfig) {
    // Merge with default config
    this.config = {
      ...DEFAULT_CONFIG,
      ...config
    };
    
    // Initialize dependencies
    this.fingerprintClient = new FingerprintClient(config.fingerprintOptions);
    this.apiClient = new ApiClient({
      apiEndpoint: this.config.apiEndpoint,
      merchantId: this.config.merchantId,
      debug: this.config.debug
    });
    
    // Log initialization in debug mode
    if (this.config.debug) {
      console.debug('[FraudShield] Initialized with config:', this.config);
    }
  }
  
  /**
   * Initialize the SDK with configuration
   */
  public static init(config: SDKConfig): FraudShield {
    // Create instance if it doesn't exist
    if (!FraudShield.instance) {
      FraudShield.instance = new FraudShield(config);
    } else {
      console.warn('[FraudShield] SDK already initialized. Use getInstance() to get the instance.');
    }
    
    // Initialize event listeners if autoEvaluate is enabled
    FraudShield.instance.setupAutoEvaluation();
    
    return FraudShield.instance;
  }
  
  /**
   * Get the SDK instance (must be initialized first)
   */
  public static getInstance(): FraudShield {
    if (!FraudShield.instance) {
      throw new Error('[FraudShield] SDK not initialized. Call FraudShield.init() first.');
    }
    
    return FraudShield.instance;
  }
  
  /**
   * Evaluate the current page/action for fraud risk
   */
  public async evaluate(context: PageContext = {}): Promise<EvaluationResult> {
    try {
      // For testing mode, return simulated results if configured
      if (this.config.testMode && typeof this.config.simulateRiskScore !== 'undefined') {
        return this.getSimulatedEvaluationResult();
      }
      
      // Get device fingerprint data
      const fingerprintData = await this.fingerprintClient.collectData();
      
      // Get or create session ID
      const sessionId = getOrCreateSessionId();
      
      // Get current page info
      const pageData = {
        url: window.location.href,
        referrer: document.referrer,
        ...context.pageData
      };
      
      // Create evaluation payload
      const payload: EvaluationPayload = {
        sessionId,
        merchantId: this.config.merchantId,
        fingerprintData,
        pageData,
        userAction: context.userAction || 'pageview',
        timestamp: Date.now()
      };
      
      // Send evaluation request
      const response = await this.apiClient.post<EvaluationResult>(
        '/evaluate',
        payload
      );
      
      // Handle errors
      if (response.error || !response.data) {
        console.error('[FraudShield] Evaluation failed:', response.error);
        return this.getFallbackEvaluationResult();
      }
      
      const result = response.data;
      
      // Handle CAPTCHA challenge if required
      if (result.requiresCaptcha && this.config.enableCaptcha && result.captchaSiteKey) {
        const captchaResult = await this.handleCaptchaChallenge(result.captchaSiteKey);
        
        if (captchaResult.success) {
          // Re-evaluate with captcha token
          const captchaResponse = await this.apiClient.post<EvaluationResult>(
            '/evaluate/captcha',
            {
              evaluationId: result.evaluationId,
              captchaToken: captchaResult.token
            }
          );
          
          if (captchaResponse.data) {
            // Call onEvaluation callback if provided
            if (this.config.onEvaluation) {
              this.config.onEvaluation(captchaResponse.data);
            }
            
            return captchaResponse.data;
          }
        }
      }
      
      // Call onEvaluation callback if provided
      if (this.config.onEvaluation) {
        this.config.onEvaluation(result);
      }
      
      return result;
    } catch (error) {
      console.error('[FraudShield] Evaluation error:', error);
      return this.getFallbackEvaluationResult();
    }
  }
  
  /**
   * Get device fingerprint data
   */
  public async getDeviceFingerprint() {
    return this.fingerprintClient.collectData();
  }
  
  /**
   * Handle CAPTCHA challenge presentation
   */
  private async handleCaptchaChallenge(siteKey: string): Promise<CaptchaResult> {
    try {
      return await showCaptchaChallenge(siteKey);
    } catch (error) {
      console.error('[FraudShield] CAPTCHA challenge error:', error);
      return { token: '', success: false };
    }
  }
  
  /**
   * Get fallback evaluation result when API call fails
   */
  private getFallbackEvaluationResult(): EvaluationResult {
    return {
      riskScore: 0,
      isFraud: false,
      evaluationId: `fallback-${Date.now()}`,
      requiresCaptcha: false
    };
  }
  
  /**
   * Get simulated evaluation result for testing
   */
  private getSimulatedEvaluationResult(): EvaluationResult {
    const riskScore = typeof this.config.simulateRiskScore === 'number'
      ? this.config.simulateRiskScore
      : Math.floor(Math.random() * 100);
      
    const isFraud = this.config.simulateFraud || riskScore >= 80;
    
    return {
      riskScore,
      isFraud,
      evaluationId: `test-${Date.now()}`,
      requiresCaptcha: riskScore >= (this.config.captchaThreshold || 80),
      captchaSiteKey: '10000000-ffff-ffff-ffff-000000000001' // hCaptcha test key
    };
  }
  
  /**
   * Set up auto-evaluation listeners
   */
  private setupAutoEvaluation(): void {
    // Skip if not enabled or already initialized
    if (!this.config.autoEvaluate || this.initialized) {
      return;
    }
    
    this.initialized = true;
    
    // Handle page load
    this.evaluate({ userAction: 'pageview' }).catch(console.error);
    
    // Set up checkout button listeners if selector is provided
    if (this.config.checkoutButtonSelector) {
      this.setupCheckoutButtonListeners();
    }
    
    // Set up checkout form listeners if selector is provided
    if (this.config.checkoutFormSelector) {
      this.setupCheckoutFormListeners();
    }
  }
  
  /**
   * Set up listeners for checkout buttons
   */
  private setupCheckoutButtonListeners(): void {
    try {
      const selector = this.config.checkoutButtonSelector as string;
      
      // Function to handle button clicks
      const handleButtonClick = (event: Event) => {
        // Don't prevent default to allow normal button operation
        this.evaluate({ userAction: 'checkout' }).catch(console.error);
      };
      
      // Function to add listeners to matching elements
      const addButtonListeners = () => {
        document.querySelectorAll(selector).forEach(button => {
          button.removeEventListener('click', handleButtonClick); // Remove to avoid duplicates
          button.addEventListener('click', handleButtonClick);
        });
      };
      
      // Add listeners now
      addButtonListeners();
      
      // Set up mutation observer to handle dynamically added buttons
      const observer = new MutationObserver(mutations => {
        addButtonListeners();
      });
      
      // Start observing changes to the DOM
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      // Save reference for cleanup
      this.eventListeners['checkoutButtons'] = () => observer.disconnect();
    } catch (error) {
      console.error('[FraudShield] Error setting up checkout button listeners:', error);
    }
  }
  
  /**
   * Set up listeners for checkout forms
   */
  private setupCheckoutFormListeners(): void {
    try {
      const selector = this.config.checkoutFormSelector as string;
      
      // Function to handle form submissions
      const handleFormSubmit = (event: Event) => {
        // Don't prevent default to allow normal form submission
        this.evaluate({ userAction: 'checkout' }).catch(console.error);
      };
      
      // Function to add listeners to matching elements
      const addFormListeners = () => {
        document.querySelectorAll(selector).forEach(form => {
          form.removeEventListener('submit', handleFormSubmit); // Remove to avoid duplicates
          form.addEventListener('submit', handleFormSubmit);
        });
      };
      
      // Add listeners now
      addFormListeners();
      
      // Set up mutation observer to handle dynamically added forms
      const observer = new MutationObserver(mutations => {
        addFormListeners();
      });
      
      // Start observing changes to the DOM
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      // Save reference for cleanup
      this.eventListeners['checkoutForms'] = () => observer.disconnect();
    } catch (error) {
      console.error('[FraudShield] Error setting up checkout form listeners:', error);
    }
  }
} 