import { Router } from 'express';
import { authenticate, requireRoles } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validate.middleware';
import {
  doctorDiscoveryQuerySchema,
  hospitalDiscoveryQuerySchema,
} from './patient-discovery.schema';
import { PatientDiscoveryService } from './patient-discovery.service';

const router = Router();

function getParamId(param: string | string[] | undefined): string {
  return Array.isArray(param) ? param[0] : param || '';
}

router.use('/patient/hospitals', authenticate, requireRoles('PATIENT'));
router.use('/patient/doctors', authenticate, requireRoles('PATIENT'));
router.use('/patient/specialties', authenticate, requireRoles('PATIENT'));

router.get(
  '/patient/hospitals',
  validateRequest(hospitalDiscoveryQuerySchema, 'query'),
  (req, res, next) => {
    try {
      const q = req.query as any;
      const result = PatientDiscoveryService.listHospitals({
        search: q.search,
        city: q.city,
        location: q.location,
        specialty: q.specialty,
        hospitalType: q.hospitalType,
        ownership: q.ownership,
        verifiedOnly: q.verifiedOnly,
        page: q.page,
        limit: q.limit,
      });
      res.json({ success: true, data: result.items, meta: result.meta });
    } catch (err) {
      next(err);
    }
  }
);

router.get('/patient/hospitals/:hospitalId', (req, res, next) => {
  try {
    const hospitalId = getParamId(req.params.hospitalId);
    const data = PatientDiscoveryService.getHospitalDetails(hospitalId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.get(
  '/patient/hospitals/:hospitalId/doctors',
  validateRequest(doctorDiscoveryQuerySchema, 'query'),
  (req, res, next) => {
    try {
      const hospitalId = getParamId(req.params.hospitalId);
      const q = req.query as any;
      const result = PatientDiscoveryService.listHospitalDoctors(hospitalId, {
        search: q.search,
        specialty: q.specialty,
        availableOnly: q.availableOnly,
        page: q.page,
        limit: q.limit,
      });
      res.json({ success: true, data: result.items, meta: result.meta });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  '/patient/doctors',
  validateRequest(doctorDiscoveryQuerySchema, 'query'),
  (req, res, next) => {
    try {
      const q = req.query as any;
      const result = PatientDiscoveryService.listDoctors({
        search: q.search,
        specialty: q.specialty,
        hospitalId: q.hospitalId,
        availableOnly: q.availableOnly,
        page: q.page,
        limit: q.limit,
      });
      res.json({ success: true, data: result.items, meta: result.meta });
    } catch (err) {
      next(err);
    }
  }
);

router.get('/patient/doctors/:doctorId', (req, res, next) => {
  try {
    const doctorId = getParamId(req.params.doctorId);
    const data = PatientDiscoveryService.getDoctorDetails(doctorId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.get('/patient/specialties', (_req, res, next) => {
  try {
    const data = PatientDiscoveryService.getSpecialtiesAndFilters();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

export default router;
