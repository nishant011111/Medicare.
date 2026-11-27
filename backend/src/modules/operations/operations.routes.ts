import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { OperationsAndBillingService, opsStore } from './operations.service';
import { ApiError } from '../../utils/errors';

const router = Router();

// Laboratory Endpoints
router.get('/lab/orders', authenticate, (req, res) => {
  const hospitalId = (req.headers['x-hospital-id'] as string) || req.auth?.activeHospitalId || '11111111-1111-4111-8111-111111111111';
  const list = Array.from(opsStore.labOrders.values()).filter((o) => o.hospitalId === hospitalId);
  res.json({ success: true, data: list });
});

// Pharmacy & Inventory Endpoints
router.get('/pharmacy/batches', authenticate, (req, res) => {
  const hospitalId = (req.headers['x-hospital-id'] as string) || req.auth?.activeHospitalId || '11111111-1111-4111-8111-111111111111';
  const list = Array.from(opsStore.medicineBatches.values()).filter((b) => b.hospitalId === hospitalId);
  res.json({ success: true, data: list });
});

router.post('/pharmacy/dispense', authenticate, (req, res, next) => {
  try {
    const hospitalId = (req.headers['x-hospital-id'] as string) || req.auth?.activeHospitalId || '11111111-1111-4111-8111-111111111111';
    const { batchId, quantity } = req.body;
    const data = OperationsAndBillingService.dispenseMedicineBatch(hospitalId, batchId, Number(quantity), req.auth!.userId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// IPD Bed Allocation Endpoints
router.get('/ipd/beds', authenticate, (req, res) => {
  const hospitalId = (req.headers['x-hospital-id'] as string) || req.auth?.activeHospitalId || '11111111-1111-4111-8111-111111111111';
  const list = Array.from(opsStore.beds.values()).filter((b) => b.hospitalId === hospitalId);
  res.json({ success: true, data: list });
});

router.post('/ipd/beds/:id/allocate', authenticate, (req, res, next) => {
  try {
    const hospitalId = (req.headers['x-hospital-id'] as string) || req.auth?.activeHospitalId || '11111111-1111-4111-8111-111111111111';
    const data = OperationsAndBillingService.allocateBedToAdmission(
      hospitalId,
      req.params.id,
      req.body.admissionId,
      req.auth!.userId
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// Phase 6 Billing & Finance Endpoints
router.get('/billing/invoices', authenticate, (req, res) => {
  const hospitalId = (req.headers['x-hospital-id'] as string) || req.auth?.activeHospitalId || '11111111-1111-4111-8111-111111111111';
  const list = Array.from(opsStore.invoices.values()).filter((i) => i.hospitalId === hospitalId);
  res.json({ success: true, data: list });
});

router.post('/billing/invoices', authenticate, (req, res, next) => {
  try {
    const hospitalId = (req.headers['x-hospital-id'] as string) || req.auth?.activeHospitalId || '11111111-1111-4111-8111-111111111111';
    const data = OperationsAndBillingService.createInvoice(hospitalId, req.auth!.userId, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.put('/billing/invoices/:id', authenticate, (_req, _res, next) => {
  next(
    ApiError.forbidden(
      'Finalized invoices cannot be overwritten directly. Issue a Credit Note or Adjustment.',
      'FINALIZED_INVOICE_IMMUTABLE'
    )
  );
});

router.post('/billing/invoices/:id/credit-notes', authenticate, (req, res, next) => {
  try {
    const hospitalId = (req.headers['x-hospital-id'] as string) || req.auth?.activeHospitalId || '11111111-1111-4111-8111-111111111111';
    const data = OperationsAndBillingService.issueCreditNote(hospitalId, req.params.id, req.auth!.userId, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.post('/billing/payments', authenticate, (req, res, next) => {
  try {
    const hospitalId = (req.headers['x-hospital-id'] as string) || req.auth?.activeHospitalId || '11111111-1111-4111-8111-111111111111';
    const data = OperationsAndBillingService.recordPayment(hospitalId, req.auth!.userId, req.body);
    res.status(data.idempotentReplay ? 200 : 201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.get('/billing/analytics', authenticate, (req, res) => {
  const hospitalId = (req.headers['x-hospital-id'] as string) || req.auth?.activeHospitalId || '11111111-1111-4111-8111-111111111111';
  const data = OperationsAndBillingService.getFinancialAnalytics(hospitalId);
  res.json({ success: true, data });
});

export default router;
