import { z } from 'zod';

export const registerSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(120),
  email: z.string().email('Valid email address is required').transform((v) => v.toLowerCase().trim()),
  phone: z
    .string()
    .min(8, 'Phone number must be at least 8 digits')
    .max(20)
    .optional(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128),
  hospitalId: z.string().uuid().optional(),
});

export const loginSchema = z.object({
  emailOrPhone: z.string().min(3, 'Email or phone number is required').trim(),
  password: z.string().min(1, 'Password is required'),
  deviceInfo: z.string().optional(),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(10, 'Refresh token is required'),
});

export const logoutSchema = z.object({
  refreshToken: z.string().optional(),
});

export const forgotPasswordSchema = z.object({
  emailOrPhone: z.string().min(3, 'Registered email or phone is required').trim(),
});

export const resetPasswordSchema = z.object({
  emailOrPhone: z.string().min(3, 'Email or phone is required').trim(),
  otpCode: z.string().length(6, '6-digit OTP code is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

export const verifyEmailSchema = z.object({
  email: z.string().email().transform((v) => v.toLowerCase().trim()),
  code: z.string().length(6, '6-digit verification code is required'),
});
