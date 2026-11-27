import { z } from 'zod';

export const doctorAvailabilityQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD')
    .optional(),
  hospitalId: z.string().trim().max(80).optional(),
  days: z.coerce.number().int().min(1).max(30).default(14),
});

export const bookPatientAppointmentSchema = z.object({
  hospitalId: z.string().trim().min(3, 'Hospital ID is required').max(80),
  doctorId: z.string().trim().min(3, 'Doctor ID is required').max(80),
  appointmentDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Appointment date must be formatted as YYYY-MM-DD'),
  slotStartTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Slot start time must be formatted as HH:mm'),
  type: z.enum(['OPD', 'FOLLOW_UP']).default('OPD'),
  reasonForVisit: z.string().trim().max(500).default('General Consultation'),
});

export const listPatientAppointmentsQuerySchema = z.object({
  filter: z.enum(['ALL', 'UPCOMING', 'PAST']).default('ALL'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const cancelPatientAppointmentSchema = z.object({
  reason: z.string().trim().max(300).optional(),
});
