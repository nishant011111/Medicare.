import { z } from 'zod';

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export function isValidIanaTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export const listMedicationsQuerySchema = z.object({
  status: z.enum(['ALL', 'ACTIVE', 'COMPLETED', 'DISCONTINUED']).default('ALL'),
  timezone: z.string().trim().max(80).optional(),
  date: z.string().regex(dateRegex, 'Date must be formatted as YYYY-MM-DD').optional(),
});

export const listRemindersQuerySchema = z.object({
  medicationId: z.string().trim().min(1).max(160).optional(),
  enabledOnly: z.coerce.boolean().optional(),
  timezone: z.string().trim().max(80).optional(),
  date: z.string().regex(dateRegex, 'Date must be formatted as YYYY-MM-DD').optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const createMedicationReminderSchema = z
  .object({
    medicationId: z.string().trim().min(3, 'Medication ID is required').max(160),
    label: z.string().trim().max(120).optional().nullable(),
    scheduleType: z.enum(['DAILY', 'SPECIFIC_DAYS']).default('DAILY'),
    daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
    reminderTimes: z
      .array(z.string().regex(timeRegex, 'Reminder time must be formatted as HH:mm (24-hour)'))
      .min(1, 'Select at least one reminder time')
      .max(12, 'Maximum 12 reminder times per schedule'),
    timezone: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .default('Asia/Kolkata')
      .refine((tz) => isValidIanaTimezone(tz), 'Invalid IANA timezone identifier'),
    startDate: z.string().regex(dateRegex, 'Start date must be formatted as YYYY-MM-DD'),
    endDate: z.string().regex(dateRegex, 'End date must be formatted as YYYY-MM-DD').optional().nullable(),
    isEnabled: z.boolean().default(true),
    personalNotes: z.string().trim().max(300).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.endDate && data.endDate < data.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endDate'],
        message: 'End date must be on or after start date',
      });
    }
    if (data.scheduleType === 'SPECIFIC_DAYS' && (!data.daysOfWeek || data.daysOfWeek.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['daysOfWeek'],
        message: 'Select at least one day of the week for custom day schedules',
      });
    }
  });

export const updateMedicationReminderSchema = z
  .object({
    label: z.string().trim().max(120).optional().nullable(),
    scheduleType: z.enum(['DAILY', 'SPECIFIC_DAYS']).optional(),
    daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
    reminderTimes: z
      .array(z.string().regex(timeRegex, 'Reminder time must be formatted as HH:mm (24-hour)'))
      .min(1, 'Select at least one reminder time')
      .max(12, 'Maximum 12 reminder times per schedule')
      .optional(),
    timezone: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .refine((tz) => isValidIanaTimezone(tz), 'Invalid IANA timezone identifier')
      .optional(),
    startDate: z.string().regex(dateRegex, 'Start date must be formatted as YYYY-MM-DD').optional(),
    endDate: z.string().regex(dateRegex, 'End date must be formatted as YYYY-MM-DD').optional().nullable(),
    isEnabled: z.boolean().optional(),
    personalNotes: z.string().trim().max(300).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.startDate && data.endDate && data.endDate < data.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endDate'],
        message: 'End date must be on or after start date',
      });
    }
    if (data.scheduleType === 'SPECIFIC_DAYS' && (!data.daysOfWeek || data.daysOfWeek.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['daysOfWeek'],
        message: 'Select at least one day of the week for custom day schedules',
      });
    }
  });

export const listDoseLogsQuerySchema = z.object({
  medicationId: z.string().trim().min(1).max(160).optional(),
  reminderId: z.string().trim().min(1).max(160).optional(),
  startDate: z.string().regex(dateRegex, 'startDate must be formatted as YYYY-MM-DD').optional(),
  endDate: z.string().regex(dateRegex, 'endDate must be formatted as YYYY-MM-DD').optional(),
  status: z.enum(['ALL', 'TAKEN', 'SKIPPED', 'SNOOZED', 'NOT_RECORDED']).default('ALL'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const createDoseLogSchema = z.object({
  medicationId: z.string().trim().min(3, 'Medication ID is required').max(160),
  reminderId: z.string().trim().max(160).optional().nullable(),
  scheduledDate: z.string().regex(dateRegex, 'scheduledDate must be formatted as YYYY-MM-DD'),
  scheduledTime: z.string().regex(timeRegex, 'scheduledTime must be formatted as HH:mm'),
  status: z.enum(['TAKEN', 'SKIPPED', 'SNOOZED']),
  actionAt: z.string().datetime({ offset: true }).optional(),
  snoozeMinutes: z.coerce.number().int().min(5).max(120).optional(),
  snoozedUntil: z.string().datetime({ offset: true }).optional().nullable(),
  notes: z.string().trim().max(300).optional().nullable(),
  timezone: z
    .string()
    .trim()
    .max(80)
    .refine((tz) => isValidIanaTimezone(tz), 'Invalid IANA timezone identifier')
    .optional(),
});

export const updateDoseLogSchema = z.object({
  status: z.enum(['TAKEN', 'SKIPPED', 'SNOOZED', 'NOT_RECORDED']),
  actionAt: z.string().datetime({ offset: true }).optional(),
  snoozeMinutes: z.coerce.number().int().min(5).max(120).optional(),
  snoozedUntil: z.string().datetime({ offset: true }).optional().nullable(),
  notes: z.string().trim().max(300).optional().nullable(),
  correctionReason: z.string().trim().max(300).optional().nullable(),
});
