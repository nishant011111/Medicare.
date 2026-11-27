import { Router } from 'express';
import { authenticate, requireRoles } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validate.middleware';
import {
  bookPatientAppointmentSchema,
  cancelPatientAppointmentSchema,
  doctorAvailabilityQuerySchema,
  listPatientAppointmentsQuerySchema,
} from './patient-appointments.schema';
import { PatientAppointmentsService } from './patient-appointments.service';

const router = Router();

function getParamId(param: string | string[] | undefined): string {
  return Array.isArray(param) ? param[0] : param || '';
}

router.use('/patient/appointments', authenticate, requireRoles('PATIENT'));
router.get(
  '/patient/doctors/:doctorId/availability',
  authenticate,
  requireRoles('PATIENT'),
  validateRequest(doctorAvailabilityQuerySchema, 'query'),
  (req, res, next) => {
    try {
      const doctorId = getParamId(req.params.doctorId);
      const q = req.query as any;
      const data = PatientAppointmentsService.getDoctorAvailability(doctorId, {
        date: q.date,
        hospitalId: q.hospitalId,
        days: q.days,
      });
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  '/patient/appointments',
  validateRequest(listPatientAppointmentsQuerySchema, 'query'),
  (req, res, next) => {
    try {
      const q = req.query as any;
      const result = PatientAppointmentsService.listAppointments(req.auth!.userId, {
        filter: q.filter,
        page: q.page,
        limit: q.limit,
      });
      res.json({ success: true, data: result.items, meta: result.meta });
    } catch (err) {
      next(err);
    }
  }
);

router.get('/patient/appointments/upcoming', (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
    const result = PatientAppointmentsService.listAppointments(req.auth!.userId, {
      filter: 'UPCOMING',
      page,
      limit,
    });
    res.json({ success: true, data: result.items, meta: result.meta });
  } catch (err) {
    next(err);
  }
});

router.get('/patient/appointments/:appointmentId', (req, res, next) => {
  try {
    const appointmentId = getParamId(req.params.appointmentId);
    const data = PatientAppointmentsService.getAppointmentById(req.auth!.userId, appointmentId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/patient/appointments',
  validateRequest(bookPatientAppointmentSchema),
  async (req, res, next) => {
    try {
      const data = await PatientAppointmentsService.bookAppointment(req.auth!.userId, req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  '/patient/appointments/:appointmentId/cancel',
  validateRequest(cancelPatientAppointmentSchema),
  async (req, res, next) => {
    try {
      const appointmentId = getParamId(req.params.appointmentId);
      const data = await PatientAppointmentsService.cancelAppointment(
        req.auth!.userId,
        appointmentId,
        req.body?.reason
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
