import { z } from 'zod';

export const listPatientInvoicesQuerySchema = z.object({
  status: z.enum(['ALL', 'PENDING', 'PAID', 'PARTIALLY_PAID', 'OVERDUE']).optional().default('ALL'),
  sortBy: z.enum(['newest', 'oldest', 'highest_due', 'due_date']).optional().default('newest'),
  search: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).max(1000).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export const createPaymentOrderSchema = z.object({
  amountPaise: z.number().int().positive().max(1_000_000_000).optional(),
  method: z.enum(['UPI', 'CARD', 'NET_BANKING', 'BANK_TRANSFER']).default('UPI'),
  methodDetail: z.string().trim().max(120).optional(),
  idempotencyKey: z.string().trim().min(8).max(128),
});

export const verifyPaymentSchema = z.object({
  gatewayOrderId: z.string().trim().min(4).max(128),
  gatewayPaymentId: z.string().trim().min(4).max(128),
  gatewaySignature: z.string().trim().min(16).max(256),
});

export const cancelOrFailPaymentSchema = z.object({
  reason: z.string().trim().max(240).optional(),
  outcome: z.enum(['CANCELLED', 'FAILED']).optional().default('CANCELLED'),
});

export const listPatientPaymentsQuerySchema = z.object({
  status: z
    .enum(['ALL', 'CREATED', 'PENDING', 'SUCCESS', 'CAPTURED', 'FAILED', 'CANCELLED', 'REFUND_PENDING', 'REFUNDED'])
    .optional()
    .default('ALL'),
  page: z.coerce.number().int().min(1).max(1000).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export const createStaffRefundSchema = z.object({
  paymentId: z.string().uuid(),
  amountPaise: z.number().int().positive().max(1_000_000_000),
  reason: z.string().trim().min(4).max(300),
});
