import { z } from 'zod';

// Schema for request validation
export const evaluationSchema = z.object({
    sessionId: z.string(),
    merchantId: z.string(),
    fingerprintData: z.object({
      visitorId: z.string(),
      requestId: z.string(),
      incognito: z.boolean(),
      browserName: z.string(),
      deviceType: z.string(),
      os: z.string(),
      confidence: z.number().optional(),
      signals: z.record(z.any()).optional()
    }),
    pageData: z.object({
      url: z.string().optional(),
      referrer: z.string().optional()
    }).optional(),
    userAction: z.string().optional(),
    timestamp: z.number()
  });
  
export  const captchaVerificationSchema = z.object({
    evaluationId: z.string().uuid(),
    captchaToken: z.string()
  });