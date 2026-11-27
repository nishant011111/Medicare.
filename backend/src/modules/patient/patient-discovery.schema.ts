import { z } from 'zod';

export const hospitalDiscoveryQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  city: z.string().trim().max(80).optional(),
  location: z.string().trim().max(120).optional(),
  specialty: z.string().trim().max(80).optional(),
  hospitalType: z.string().trim().max(80).optional(),
  ownership: z.string().trim().max(60).optional(),
  verifiedOnly: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const doctorDiscoveryQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  specialty: z.string().trim().max(80).optional(),
  hospitalId: z.string().trim().max(80).optional(),
  availableOnly: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export function validateDiscoveryIdentifier(id: string): boolean {
  const trimmed = id.trim();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const codeRegex = /^[A-Za-z0-9_-]{3,40}$/;
  return uuidRegex.test(trimmed) || codeRegex.test(trimmed);
}
