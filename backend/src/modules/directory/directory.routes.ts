import { Router } from 'express';
import { authenticate, requireRoles } from '../../middleware/auth.middleware';
import {
  directoryStore,
  HospitalDirectoryImportService,
  HospitalDirectoryService,
} from './directory.service';

const router = Router();

// 1. GET /api/v1/hospital-directory
router.get('/hospital-directory', (req, res) => {
  const result = HospitalDirectoryService.searchAndFilter({
    search: req.query.search as string | undefined,
    pincode: req.query.pincode as string | undefined,
    ownership: req.query.ownership as string | undefined,
    facilityType: req.query.facilityType as string | undefined,
    specialty: req.query.specialty as string | undefined,
    verificationStatus: req.query.verificationStatus as string | undefined,
    sortOrder: (req.query.sortOrder as 'ASC' | 'DESC') || 'ASC',
    page: req.query.page ? Number(req.query.page) : 1,
    limit: req.query.limit ? Number(req.query.limit) : 25,
  });
  res.json({
    success: true,
    data: result.items,
    meta: result.meta,
  });
});

// 2. GET /api/v1/hospital-directory/search
router.get('/hospital-directory/search', (req, res) => {
  const result = HospitalDirectoryService.searchAndFilter({
    search: (req.query.q as string) || (req.query.search as string),
    pincode: req.query.pincode as string | undefined,
    ownership: req.query.ownership as string | undefined,
    facilityType: req.query.facilityType as string | undefined,
    specialty: req.query.specialty as string | undefined,
    verificationStatus: req.query.verificationStatus as string | undefined,
    sortOrder: (req.query.sortOrder as 'ASC' | 'DESC') || 'ASC',
    page: req.query.page ? Number(req.query.page) : 1,
    limit: req.query.limit ? Number(req.query.limit) : 25,
  });
  res.json({
    success: true,
    data: result.items,
    meta: result.meta,
  });
});

// 3. GET /api/v1/hospital-directory/filters
router.get('/hospital-directory/filters', (_req, res) => {
  const data = HospitalDirectoryService.getAvailableFilters();
  res.json({ success: true, data });
});

// 4. GET /api/v1/hospital-directory/:id
router.get('/hospital-directory/:id', (req, res, next) => {
  try {
    const data = HospitalDirectoryService.getByIdOrCode(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// Claim / Register This Hospital from Directory (Section 10)
router.post('/hospital-directory/:id/claim-registration', authenticate, (req, res, next) => {
  try {
    const data = HospitalDirectoryService.claimAndSubmitOnboarding(req.auth!.userId, req.params.id, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// Report Incorrect Information on a Directory Listing (Section 6)
router.post('/hospital-directory/:id/report-issue', (req, res, next) => {
  try {
    const data = HospitalDirectoryService.reportIncorrectInformation(null, req.params.id, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// 5. POST /api/v1/platform/hospital-directory/import (SUPER_ADMIN only)
router.post(
  '/platform/hospital-directory/import',
  authenticate,
  requireRoles('SUPER_ADMIN'),
  (req, res, next) => {
    try {
      const format = (req.body.format === 'CSV' ? 'CSV' : 'JSON') as 'JSON' | 'CSV';
      const summary = Array.isArray(req.body.records)
        ? HospitalDirectoryImportService.importRecords(req.body.records, format, req.auth!.userId)
        : HospitalDirectoryImportService.importBundledRanchiDataset(format, req.auth!.userId);
      res.status(200).json({ success: true, data: summary });
    } catch (err) {
      next(err);
    }
  }
);

// 6. PATCH /api/v1/platform/hospital-directory/:id (SUPER_ADMIN only)
router.patch(
  '/platform/hospital-directory/:id',
  authenticate,
  requireRoles('SUPER_ADMIN'),
  (req, res, next) => {
    try {
      const data = HospitalDirectoryService.updateDirectoryRecord(req.auth!.userId, req.params.id, req.body);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

// 7. POST /api/v1/platform/hospital-directory/:id/verify (SUPER_ADMIN only)
router.post(
  '/platform/hospital-directory/:id/verify',
  authenticate,
  requireRoles('SUPER_ADMIN'),
  (req, res, next) => {
    try {
      const data = HospitalDirectoryService.changeVerificationStatus(
        req.auth!.userId,
        req.params.id,
        'VERIFIED',
        req.body.notes
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

// 8. POST /api/v1/platform/hospital-directory/:id/reject (SUPER_ADMIN only)
router.post(
  '/platform/hospital-directory/:id/reject',
  authenticate,
  requireRoles('SUPER_ADMIN'),
  (req, res, next) => {
    try {
      const data = HospitalDirectoryService.changeVerificationStatus(
        req.auth!.userId,
        req.params.id,
        'REJECTED',
        req.body.reason || req.body.notes
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

// 9. POST /api/v1/platform/hospital-directory/:id/suspend (SUPER_ADMIN only)
router.post(
  '/platform/hospital-directory/:id/suspend',
  authenticate,
  requireRoles('SUPER_ADMIN'),
  (req, res, next) => {
    try {
      const data = HospitalDirectoryService.changeVerificationStatus(
        req.auth!.userId,
        req.params.id,
        'SUSPENDED',
        req.body.reason || req.body.notes
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

// Delete duplicate draft record (SUPER_ADMIN only)
router.delete(
  '/platform/hospital-directory/:id',
  authenticate,
  requireRoles('SUPER_ADMIN'),
  (req, res, next) => {
    try {
      const data = HospitalDirectoryService.deleteDraftDirectoryRecord(req.auth!.userId, req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

// 10. GET /api/v1/platform/hospital-directory/import-history (SUPER_ADMIN only)
router.get(
  '/platform/hospital-directory/import-history',
  authenticate,
  requireRoles('SUPER_ADMIN'),
  (_req, res) => {
    res.json({ success: true, data: directoryStore.importHistory });
  }
);

export default router;
