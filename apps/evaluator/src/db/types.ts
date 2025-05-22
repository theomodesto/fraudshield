import { Generated } from 'kysely';

export type ColumnType = any; // Using any for now since ColumnBuilder is not exported in this version

export interface Database {
  merchants: {
    id: Generated<string>;
    name: string;
    apiKey: string;
    active: boolean;
    createdAt: Generated<Date>;
    updatedAt: Generated<Date>;
    settings: {
      riskThreshold: number;
      enableCaptcha: boolean;
      captchaThreshold: number;
      ipAnonymization: boolean;
    };
    integrationData: Record<string, unknown>;
  };

  users: {
    id: Generated<string>;
    merchantId: string;
    email: string;
    passwordHash: string;
    firstName: string | null;
    lastName: string | null;
    role: string;
    active: boolean;
    createdAt: Generated<Date>;
    updatedAt: Generated<Date>;
    lastLoginAt: Date | null;
  };

  rules: {
    id: Generated<string>;
    merchantId: string;
    name: string;
    description: string | null;
    conditions: Record<string, unknown>;
    action: string;
    riskScoreAdjustment: number;
    isActive: boolean;
    createdAt: Generated<Date>;
    updatedAt: Generated<Date>;
  };

  transactions: {
    id: Generated<string>;
    merchantId: string;
    orderId: string | null;
    sessionId: string;
    evaluationId: string;
    fingerprintVisitorId: string | null;
    riskScore: number;
    isFraud: boolean;
    riskFactors: Record<string, unknown> | null;
    pageData: Record<string, unknown> | null;
    userAction: string | null;
    geoData: Record<string, unknown> | null;
    decision: string | null;
    reviewStatus: string;
    reviewedAt: Date | null;
    reviewedBy: string | null;
    createdAt: Generated<Date>;
    updatedAt: Generated<Date>;
  };

  auditLogs: {
    id: Generated<string>;
    merchantId: string;
    userId: string | null;
    action: string;
    entityType: string;
    entityId: string | null;
    details: Record<string, unknown> | null;
    createdAt: Generated<Date>;
    ipAddress: string | null;
  };

  apiKeys: {
    id: Generated<string>;
    merchantId: string;
    name: string;
    keyHash: string;
    lastUsedAt: Date | null;
    active: boolean;
    createdAt: Generated<Date>;
    expiresAt: Date | null;
  };

  sessions: {
    id: Generated<string>;
    userId: string;
    refreshTokenHash: string;
    userAgent: string | null;
    ipAddress: string | null;
    expiresAt: Date;
    createdAt: Generated<Date>;
    lastUsedAt: Generated<Date>;
  };
} 