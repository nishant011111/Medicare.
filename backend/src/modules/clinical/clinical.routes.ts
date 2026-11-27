import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { ClinicalService, clinicalStore } from './clinical.service';
import { ApiError } from '../../utils/errors';

const router = Router();

router.get('/patients', authenticate, (req, res, next) => {
  try {
    const hospitalId = (req.headers['x-hospital-id'] as string) || req.auth?.activeHospitalId || '11111111-1111-4111-8111-111111111111';
    const data = ClinicalService.listPatients(hospitalId, req.query.search as string | undefined);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.post('/patients', authenticate, (req, res, next) => {
  try {
    const hospitalId = (req.headers['x-hospital-id'] as string) || req.auth?.activeHospitalId || '11111111-1111-4111-8111-111111111111';
    const data = ClinicalService.registerPatientInHospital(hospitalId, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.post('/patients/:id/consent', authenticate, (req, res, next) => {
  try {
    const { sourceHospitalId, targetHospitalId } = req.body;
    const data = ClinicalService.grantCrossHospitalEhrConsent(req.params.id, sourceHospitalId, targetHospitalId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.get('/patients/:id/ehr', authenticate, (req, res, next) => {
  try {
    const hospitalId = (req.headers['x-hospital-id'] as string) || req.auth?.activeHospitalId || '11111111-1111-4111-8111-111111111111';
    const data = ClinicalService.getPatientEhrTimeline(req.params.id, hospitalId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.post('/patients/:id/vitals', authenticate, (req, res, next) => {
  try {
    const hospitalId = (req.headers['x-hospital-id'] as string) || req.auth?.activeHospitalId || '11111111-1111-4111-8111-111111111111';
    const data = ClinicalService.recordVitals(hospitalId, req.auth!.userId, {
      ...req.body,
      patientId: req.params.id,
    });
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.get('/doctors', authenticate, (req, res) => {
  const hospitalId = (req.headers['x-hospital-id'] as string) || req.auth?.activeHospitalId || '11111111-1111-4111-8111-111111111111';
  const doctors = Array.from(clinicalStore.doctors.values()).filter((d) => d.hospitalId === hospitalId);
  res.json({ success: true, data: doctors });
});

router.get('/appointments', authenticate, (req, res) => {
  const hospitalId = (req.headers['x-hospital-id'] as string) || req.auth?.activeHospitalId || '11111111-1111-4111-8111-111111111111';
  const list = Array.from(clinicalStore.appointments.values()).filter((a) => a.hospitalId === hospitalId);
  res.json({ success: true, data: list });
});

router.post('/appointments', authenticate, (req, res, next) => {
  try {
    const hospitalId = (req.headers['x-hospital-id'] as string) || req.auth?.activeHospitalId || '11111111-1111-4111-8111-111111111111';
    const data = ClinicalService.bookAppointment(hospitalId, req.auth!.userId, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.post('/encounters/:id/amend', authenticate, (req, res, next) => {
  try {
    if (!req.auth?.hospitalRoles.includes('DOCTOR') && !req.auth?.globalRoles.includes('SUPER_ADMIN')) {
      throw ApiError.forbidden('Only doctors can amend finalized clinical encounters');
    }
    const hospitalId = (req.headers['x-hospital-id'] as string) || req.auth?.activeHospitalId || '11111111-1111-4111-8111-111111111111';
    const data = ClinicalService.amendFinalizedEncounter(req.params.id, hospitalId, req.auth!.userId, req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

export default router;
