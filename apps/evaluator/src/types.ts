export interface DeviceData {
  visitorId: string;
  requestId: string;
  incognito: boolean;
  browserName: string;
  deviceType: string;
  os: string;
  confidence?: number;
  signals?: {
    canvas?: string;
    webgl?: any;
    audio?: any;
    fonts?: string[];
    screen?: {
      width: number;
      height: number;
      colorDepth: number;
    };
  };
}

export interface EvaluationPayload {
  sessionId: string;
  merchantId: string;
  fingerprintData: DeviceData;
  pageData?: {
    url?: string;
    referrer?: string;
    [key: string]: any;
  };
  userAction?: string;
  timestamp: number;
}

export interface EvaluationResult {
  riskScore: number;
  isFraud: boolean;
  evaluationId: string;
  requiresCaptcha: boolean;
  captchaSiteKey?: string;
}

export interface CaptchaVerificationPayload {
  evaluationId: string;
  captchaToken: string;
}

export interface EnrichedEvent extends EvaluationPayload {
  ipAddress: string;
  anonymizedIp?: string;
  geoData?: {
    country?: string;
    city?: string;
    continent?: string;
    latitude?: number;
    longitude?: number;
    timezone?: string;
    postalCode?: string;
    isp?: string;
    asn?: string;
  };
  velocityData?: {
    sessionCount24h?: number;
    ipSessionCount24h?: number;
    deviceSessionCount24h?: number;
    lastSeenTimestamp?: number;
  };
  riskFactors?: string[];
  riskScore?: number;
  isFraud?: boolean;
  evaluationId?: string;
  requiresCaptcha?: boolean;
}

export interface RawEvent {
  type: string;
  payload: EvaluationPayload;
  timestamp: number;
  headers?: Record<string, string>;
}

export interface RiskScore {
  id: string;
  evaluationId: string;
  sessionId: string;
  merchantId: string;
  visitorId: string;
  score: number;
  isFraud: boolean;
  riskFactors: string[];
  timestamp: number;
}

export interface MerchantSettings {
  riskThreshold: number;
  enableCaptcha: boolean;
  captchaThreshold: number;
  ipAnonymization: boolean;
  webhookUrl?: string;
  notificationEmail?: string;
}

export interface Rule {
  id: string;
  merchantId: string;
  name: string;
  description?: string;
  conditions: RuleCondition[];
  action: 'flag' | 'block' | 'challenge';
  riskScoreAdjustment: number;
  isActive: boolean;
}

export interface RuleCondition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'not_contains' | 'in' | 'not_in';
  value: any;
} 