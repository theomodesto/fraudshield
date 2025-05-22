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

export interface DecisionPayload {
  evaluationId: string;
  merchantId: string;
  transactionId?: string;
  userId?: string;
  amount?: number;
  currency?: string;
  metadata?: Record<string, any>;
}

export interface DecisionResult {
  decision: 'approve' | 'review' | 'reject';
  decisionId: string;
  evaluationId: string;
  merchantId: string;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  reasoning: string[];
  timestamp: number;
}

export interface TransactionDecision {
  id: string;
  evaluationId: string;
  merchantId: string;
  transactionId?: string;
  userId?: string;
  decision: 'approve' | 'review' | 'reject';
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  reasoning: string[];
  createdAt: number;
  metadata?: Record<string, any>;
}

export interface MerchantRules {
  merchantId: string;
  riskThreshold: number;
  highRiskThreshold: number;
  automaticReject: boolean;
  manualReviewThreshold?: number;
  customRules?: Rule[];
  updatedAt: number;
}

export interface Rule {
  id: string;
  name: string;
  description?: string;
  conditions: RuleCondition[];
  action: 'approve' | 'review' | 'reject';
  priority: number;
  isEnabled: boolean;
}

export interface RuleCondition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'not_contains' | 'in' | 'not_in';
  value: any;
}

export interface KafkaMessage {
  topic: string;
  partition: number;
  offset: number;
  key: Buffer | null;
  value: Buffer;
  timestamp: number;
  size: number;
} 