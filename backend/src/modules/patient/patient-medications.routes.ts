import { Router } from 'express';
import { authenticate, requireRoles } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validate.middleware';
import {
  createDoseLogSchema,
  createMedicationReminderSchema,
  listDoseLogsQuerySchema,
  listMedicationsQuerySchema,
  listRemindersQuerySchema,
  updateDoseLogSchema,
  updateMedicationReminderSchema,
} from './patient-medications.schema';
import { PatientMedicationsService } from './patient-medications.service';

const router = Router();

function getParamId(param: string | string[] | undefined): string {
  return Array.isArray(param) ? param[0] : param || '';
}

router.use('/patient/medications', authenticate, requireRoles('PATIENT'));
router.use('/patient/medication-reminders', authenticate, requireRoles('PATIENT'));
router.use('/patient/medication-doses', authenticate, requireRoles('PATIENT'));

router.get(
  '/patient/medications',
  validateRequest(listMedicationsQuerySchema, 'query'),
  (req, res, next) => {
    try {
      const q = req.query as any;
      const data = PatientMedicationsService.listMedications(req.auth!.userId, {
        status: q.status,
        timezone: q.timezone,
        date: q.date,
      });
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

router.get('/patient/medications/:medicationId', (req, res, next) => {
  try {
    const medicationId = getParamId(req.params.medicationId);
    const timezone = typeof req.query.timezone === 'string' ? req.query.timezone : undefined;
    const data = PatientMedicationsService.getMedicationDetail(req.auth!.userId, medicationId, timezone);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.get(
  '/patient/medication-reminders',
  validateRequest(listRemindersQuerySchema, 'query'),
  (req, res, next) => {
    try {
      const q = req.query as any;
      const result = PatientMedicationsService.listReminders(req.auth!.userId, {
        medicationId: q.medicationId,
        enabledOnly: q.enabledOnly,
        timezone: q.timezone,
        date: q.date,
        page: q.page,
        limit: q.limit,
      });
      res.json({
        success: true,
        data: {
          items: result.items,
          upcoming: result.upcoming,
          missed: result.missed,
          todaySchedule: result.todaySchedule,
        },
        meta: result.meta,
      });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/patient/medication-reminders',
  validateRequest(createMedicationReminderSchema),
  (req, res, next) => {
    try {
      const data = PatientMedicationsService.createReminder(req.auth!.userId, req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  '/patient/medication-reminders/:reminderId',
  validateRequest(updateMedicationReminderSchema),
  (req, res, next) => {
    try {
      const reminderId = getParamId(req.params.reminderId);
      const data = PatientMedicationsService.updateReminder(req.auth!.userId, reminderId, req.body);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

router.delete('/patient/medication-reminders/:reminderId', (req, res, next) => {
  try {
    const reminderId = getParamId(req.params.reminderId);
    const data = PatientMedicationsService.deleteReminder(req.auth!.userId, reminderId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.get(
  '/patient/medication-doses',
  validateRequest(listDoseLogsQuerySchema, 'query'),
  (req, res, next) => {
    try {
      const q = req.query as any;
      const result = PatientMedicationsService.listDoseLogs(req.auth!.userId, {
        medicationId: q.medicationId,
        reminderId: q.reminderId,
        startDate: q.startDate,
        endDate: q.endDate,
        status: q.status,
        page: q.page,
        limit: q.limit,
      });
      res.json({
        success: true,
        data: {
          items: result.items,
          todaySchedule: result.todaySchedule,
          adherenceSummary: result.adherenceSummary,
        },
        meta: result.meta,
      });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/patient/medication-doses',
  validateRequest(createDoseLogSchema),
  (req, res, next) => {
    try {
      const data = PatientMedicationsService.recordDose(req.auth!.userId, req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  '/patient/medication-doses/:doseId',
  validateRequest(updateDoseLogSchema),
  (req, res, next) => {
    try {
      const doseId = getParamId(req.params.doseId);
      const data = PatientMedicationsService.updateDose(req.auth!.userId, doseId, req.body);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
