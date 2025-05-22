import { DeviceData } from '@fraudshield/fingerprint';

/**
 * Configuration options for the FraudShield SDK
 */
export interface SDKConfig {
  /** Merchant ID provided by FraudShield */
  merchantId: string;
  
  /** API endpoint for FraudShield services */
  apiEndpoint?: string;
  
  /** Enable debug logging */
  debug?: boolean;
  
  /** Automatically evaluate on user actions */
  autoEvaluate?: boolean;
  
  /** CSS selector for checkout buttons */
  checkoutButtonSelector?: string;
  
  /** CSS selector for checkout forms */
  checkoutFormSelector?: string;
  
  /** Enable CAPTCHA for suspicious activities */
  enableCaptcha?: boolean;
  
  /** Risk score threshold to trigger CAPTCHA */
  captchaThreshold?: number;
  
  /** Options for the fingerprinting module */
  fingerprintOptions?: Record<string, any>;
  
  /** Enable test mode to avoid affecting production metrics */
  testMode?: boolean;
  
  /** Callback function for evaluation results */
  onEvaluation?: (result: EvaluationResult) => void;
  
  /** For testing only: Simulate a specific risk score */
  simulateRiskScore?: number;
  
  /** For testing only: Simulate fraud detection */
  simulateFraud?: boolean;
}

/**
 * Page context for evaluation
 */
export interface PageContext {
  /** User action being performed (e.g., 'checkout', 'login', etc.) */
  userAction?: string;
  
  /** Additional data related to the current page */
  pageData?: Record<string, any>;
}

/**
 * Payload sent to the evaluation API
 */
export interface EvaluationPayload {
  /** Unique identifier for the user session */
  sessionId: string;
  
  /** Merchant identifier */
  merchantId: string;
  
  /** Device fingerprinting data */
  fingerprintData: DeviceData;
  
  /** Page-related data */
  pageData?: {
    /** Current page URL */
    url?: string;
    
    /** Referrer URL */
    referrer?: string;
    
    /** Additional custom data */
    [key: string]: any;
  };
  
  /** Action being performed */
  userAction?: string;
  
  /** Timestamp of the event */
  timestamp: number;
}

/**
 * Result from the evaluation API
 */
export interface EvaluationResult {
  /** Risk score from 0 (safe) to 100 (high risk) */
  riskScore: number;
  
  /** Whether the transaction is considered fraudulent */
  isFraud: boolean;
  
  /** Unique identifier for this evaluation */
  evaluationId: string;
  
  /** Whether a CAPTCHA challenge is required */
  requiresCaptcha: boolean;
  
  /** Site key for CAPTCHA integration when required */
  captchaSiteKey?: string;
}

/**
 * CAPTCHA challenge result
 */
export interface CaptchaResult {
  /** Token returned by the CAPTCHA service */
  token: string;
  
  /** Whether the CAPTCHA was completed successfully */
  success: boolean;
}

/**
 * API response structure
 */
export interface ApiResponse<T> {
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
} 