import { z } from 'zod';

export const roleSchema = z.enum(['ADMIN', 'PARTNER', 'BENEFICIARY']);
export type Role = z.infer<typeof roleSchema>;

export const loginRequestSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(128),
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const beneficiarySchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  cardNumber: z.string().min(1),
  planId: z.uuid().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'OVERDUE']),
});
export type BeneficiaryDto = z.infer<typeof beneficiarySchema>;

export const apiHealthSchema = z.object({ status: z.literal('ok'), service: z.literal('quali-api') });
