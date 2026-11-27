import { Router } from 'express';
import { authenticate, requireRoles } from '../../middleware/auth.middleware';
import { PatientDashboardService } from './patient-dashboard.service';

const router = Router();

router.use('/patient/dashboard', authenticate, requireRoles('PATIENT'));
router.use('/patient/prescriptions', authenticate, requireRoles('PATIENT'));
router.use('/patient/lab-reports', authenticate, requireRoles('PATIENT'));
router.use('/patient/activities', authenticate, requireRoles('PATIENT'));

router.get('/patient/dashboard', (req, res, next) => {
  try {
    const data = PatientDashboardService.getDashboard(req.auth!.userId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.get('/patient/prescriptions/recent', (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
    const result = PatientDashboardService.getRecentPrescriptions(req.auth!.userId, page, limit);
    res.json({ success: true, data: result.items, meta: result.meta });
  } catch (err) {
    next(err);
  }
});

router.get('/patient/lab-reports/recent', (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
    const result = PatientDashboardService.getRecentLabReports(req.auth!.userId, page, limit);
    res.json({ success: true, data: result.items, meta: result.meta });
  } catch (err) {
    next(err);
  }
});

router.get('/patient/activities', (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 15));
    const result = PatientDashboardService.getActivities(req.auth!.userId, page, limit);
    res.json({ success: true, data: result.items, meta: result.meta });
  } catch (err) {
    next(err);
  }
});

export default router;
