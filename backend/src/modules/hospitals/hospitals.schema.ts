import { z } from 'zod';

export const createHospitalSchema = z.object({
  name: z.string().min(3, 'Hospital name must be at least 3 characters').max(150),
  registrationNumber: z.string().min(4, 'Registration number is required').max(60),
  category: z.string().min(3, 'Hospital category is required').max(80),
  logoUrl: z.string().url().optional().nullable(),
  address: z.string().min(5, 'Address is required').max(250),
  city: z.string().min(2, 'City is required').max(80),
  state: z.string().min(2, 'State is required').max(80),
  contactEmail: z.string().email('Valid contact email is required'),
  contactPhone: z.string().min(8, 'Valid contact phone is required').max(25),
  totalBeds: z.number().int().positive().optional().default(100),
  availableBeds: z.number().int().nonnegative().optional().default(25),
  departments: z.array(z.string()).optional(),
});

export const updateHospitalSchema = z.object({
  name: z.string().min(3).max(150).optional(),
  category: z.string().min(3).max(80).optional(),
  logoUrl: z.string().url().optional().nullable(),
  address: z.string().min(5).max(250).optional(),
  city: z.string().min(2).max(80).optional(),
  state: z.string().min(2).max(80).optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().min(8).max(25).optional(),
  totalBeds: z.number().int().positive().optional(),
  availableBeds: z.number().int().nonnegative().optional(),
  departments: z.array(z.string()).optional(),
});

export const rejectHospitalSchema = z.object({
  reason: z.string().min(3, 'Rejection reason is required').max(500).optional(),
});
