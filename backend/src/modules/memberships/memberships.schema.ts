import { z } from 'zod';

const roleEnum = z.enum([
  'SUPER_ADMIN',
  'HOSPITAL_ADMIN',
  'DOCTOR',
  'NURSE',
  'RECEPTIONIST',
  'PHARMACIST',
  'LAB_TECHNICIAN',
  'PATIENT',
]);

export const createInvitationSchema = z.object({
  email: z.string().email('Valid email address is required').transform((v) => v.toLowerCase().trim()),
  roleCode: roleEnum,
  department: z.string().min(2).max(100).optional(),
});

export const acceptInvitationSchema = z.object({
  inviteCode: z.string().min(4, 'Invitation code is required').trim(),
});

export const updateMembershipSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
  department: z.string().min(2).max(100).optional(),
  roles: z.array(roleEnum).min(1).optional(),
});
