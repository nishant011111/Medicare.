import { z } from 'zod';

export const ALLOWED_GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'] as const;
export const ALLOWED_BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

export function isValidPostalCode(country: string, postalCode: string): boolean {
  const c = country.trim().toLowerCase();
  const code = postalCode.trim();
  if (!code) return false;
  if (c === 'india' || c === 'in') {
    return /^[1-9][0-9]{5}$/.test(code);
  }
  if (c === 'united states' || c === 'usa' || c === 'us') {
    return /^\d{5}(-\d{4})?$/.test(code);
  }
  if (c === 'united kingdom' || c === 'uk' || c === 'gb') {
    return /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i.test(code);
  }
  if (c === 'canada' || c === 'ca') {
    return /^[A-Z]\d[A-Z][ -]?\d[A-Z]\d$/i.test(code);
  }
  if (c === 'australia' || c === 'au') {
    return /^\d{4}$/.test(code);
  }
  return /^[A-Za-z0-9\s-]{3,12}$/.test(code);
}

export const updatePersonalInfoSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(120),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be YYYY-MM-DD')
    .refine((d) => {
      const parsed = Date.parse(d);
      return !Number.isNaN(parsed) && parsed <= Date.now() && d >= '1900-01-01';
    }, 'Date of birth must be a valid past date')
    .nullable()
    .optional(),
  gender: z.enum(ALLOWED_GENDERS).nullable().optional(),
  email: z.string().email().optional(),
  phone: z.string().trim().min(8).max(20).optional(),
});

export const updateAddressSchema = z
  .object({
    houseNumber: z.string().trim().max(40).nullable().optional(),
    street: z.string().trim().min(2, 'Street address is required').max(160),
    locality: z.string().trim().max(120).nullable().optional(),
    city: z.string().trim().min(2, 'City is required').max(100),
    state: z.string().trim().min(2, 'State is required').max(100),
    postalCode: z.string().trim().min(3, 'Postal code is required').max(16),
    country: z.string().trim().min(2, 'Country is required').max(80).default('India'),
  })
  .refine((data) => isValidPostalCode(data.country, data.postalCode), {
    message: 'Postal code format is invalid for the selected country',
    path: ['postalCode'],
  });

export const emergencyContactSchema = z.object({
  name: z.string().trim().min(2, 'Contact name is required').max(120),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s-]{8,20}$/, 'Valid emergency contact phone number is required'),
  relationship: z.string().trim().min(2, 'Relationship is required').max(60),
  isPrimary: z.boolean().optional(),
});

export const updateHealthInformationSchema = z.object({
  consentGranted: z.literal(true, {
    errorMap: () => ({ message: 'Explicit patient consent is required before saving health information' }),
  }),
  bloodGroup: z.enum(ALLOWED_BLOOD_GROUPS).nullable().optional(),
  knownAllergies: z.array(z.string().trim().min(1).max(80)).max(30).default([]),
  existingConditions: z.array(z.string().trim().min(1).max(100)).max(30).default([]),
  currentMedications: z.array(z.string().trim().min(1).max(100)).max(30).default([]),
  medicalNotes: z.string().trim().max(1000).nullable().optional(),
});

export const updateFullPatientProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(120).optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  gender: z.enum(ALLOWED_GENDERS).nullable().optional(),
  email: z.string().email().optional(),
  phone: z.string().trim().min(8).max(20).optional(),
  address: updateAddressSchema.optional(),
  emergencyContact: emergencyContactSchema.optional(),
  healthInformation: updateHealthInformationSchema.optional(),
});
