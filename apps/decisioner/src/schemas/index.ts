import { z } from 'zod';

// Schema for decision request
export const decisionRequestSchema = z.object({
    evaluationId: z.string().uuid(),
    merchantId: z.string(),
    transactionId: z.string().optional(),
    userId: z.string().optional(),
    amount: z.number().optional(),
    currency: z.string().optional(),
    metadata: z.record(z.string(), z.any()).optional()
});

export const getDecisionParamsSchema = z.object({
  params: z.object({
    decisionId: z.string().uuid(),
  }),
}); 