import { Request, Router } from 'express';
import { authenticate, requireHospitalAccess, requireRoles } from '../../middleware/auth.middleware';
import { billingRateLimiter } from '../../middleware/rateLimit.middleware';
import { validateRequest } from '../../middleware/validate.middleware';
import { ApiError } from '../../utils/errors';
import { getParam } from '../../utils/params';
import {
  cancelOrFailPaymentSchema,
  createPaymentOrderSchema,
  createStaffRefundSchema,
  listPatientInvoicesQuerySchema,
  listPatientPaymentsQuerySchema,
  verifyPaymentSchema,
} from './patient-billing.schema';
import { PatientBillingService } from './patient-billing.service';

const router = Router();

function attachHospitalHeaderContext(req: Request, _res: any, next: any) {
  const headerId = req.headers['x-hospital-id'];
  if (typeof headerId === 'string' && headerId.trim() && !req.params.hospitalId) {
    req.params.hospitalId = headerId.trim();
  }
  next();
}

function resolveHospitalId(req: Request): string {
  const headerId = req.headers['x-hospital-id'];
  const hospitalId = (typeof headerId === 'string' && headerId.trim()) || req.auth?.activeHospitalId || '';
  if (!hospitalId) {
    throw ApiError.badRequest('Hospital context is required', 'HOSPITAL_CONTEXT_REQUIRED');
  }
  return hospitalId;
}

// ============================================================================
// Patient Self-Service Billing & Payments (PATIENT role ONLY)
// ============================================================================
router.get(
  '/patient/invoices',
  authenticate,
  requireRoles('PATIENT'),
  validateRequest(listPatientInvoicesQuerySchema, 'query'),
  (req, res, next) => {
    try {
      const q = req.query as any;
      const data = PatientBillingService.getPatientDashboard(req.auth!.userId, {
        status: q.status,
        sortBy: q.sortBy,
        search: q.search,
        page: q.page,
        limit: q.limit,
      });
      res.json({ success: true, data: data.invoices, summary: data.summary, recentTransactions: data.recentTransactions, meta: data.meta });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  '/patient/invoices/:invoiceId',
  authenticate,
  requireRoles('PATIENT'),
  (req, res, next) => {
    try {
      const data = PatientBillingService.getInvoiceDetail(req.auth!.userId, getParam(req.params.invoiceId));
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  '/patient/invoices/:invoiceId/pdf',
  authenticate,
  requireRoles('PATIENT'),
  (req, res, next) => {
    try {
      const { fileName, buffer } = PatientBillingService.generateInvoicePdf(
        req.auth!.userId,
        getParam(req.params.invoiceId)
      );
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Cache-Control', 'private, no-store');
      res.send(buffer);
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/patient/invoices/:invoiceId/payment-orders',
  authenticate,
  requireRoles('PATIENT'),
  billingRateLimiter,
  validateRequest(createPaymentOrderSchema),
  async (req, res, next) => {
    try {
      const result = await PatientBillingService.createPaymentOrder(
        req.auth!.userId,
        getParam(req.params.invoiceId),
        req.body
      );
      res.status(result.idempotentReplay ? 200 : 201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  '/patient/payments',
  authenticate,
  requireRoles('PATIENT'),
  validateRequest(listPatientPaymentsQuerySchema, 'query'),
  (req, res, next) => {
    try {
      const q = req.query as any;
      const result = PatientBillingService.listPatientPayments(req.auth!.userId, {
        status: q.status,
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
  '/patient/payments/:paymentId/status',
  authenticate,
  requireRoles('PATIENT'),
  (req, res, next) => {
    try {
      const data = PatientBillingService.getPaymentStatus(req.auth!.userId, getParam(req.params.paymentId));
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/patient/payments/:paymentId/verify',
  authenticate,
  requireRoles('PATIENT'),
  billingRateLimiter,
  validateRequest(verifyPaymentSchema),
  async (req, res, next) => {
    try {
      const result = await PatientBillingService.verifyPatientPayment(
        req.auth!.userId,
        getParam(req.params.paymentId),
        req.body
      );
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/patient/payments/:paymentId/cancel',
  authenticate,
  requireRoles('PATIENT'),
  billingRateLimiter,
  validateRequest(cancelOrFailPaymentSchema),
  (req, res, next) => {
    try {
      const payment = PatientBillingService.cancelOrFailPayment(
        req.auth!.userId,
        getParam(req.params.paymentId),
        req.body
      );
      res.json({ success: true, data: payment });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  '/patient/payments/:paymentId/receipt',
  authenticate,
  requireRoles('PATIENT'),
  (req, res, next) => {
    try {
      const data = PatientBillingService.getPaymentReceipt(req.auth!.userId, getParam(req.params.paymentId));
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  '/patient/payments/:paymentId/receipt/pdf',
  authenticate,
  requireRoles('PATIENT'),
  (req, res, next) => {
    try {
      const { fileName, buffer } = PatientBillingService.generateReceiptPdf(
        req.auth!.userId,
        getParam(req.params.paymentId)
      );
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Cache-Control', 'private, no-store');
      res.send(buffer);
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================================
// Gateway Webhook Verification Endpoint (Server-side HMAC Signature Check)
// ============================================================================
router.post('/payments/webhooks/:provider', billingRateLimiter, async (req, res, next) => {
  try {
    const provider = getParam(req.params.provider);
    const sig = String(req.headers['x-razorpay-signature'] || '');
    const rawPayload = (req as any).rawBody || JSON.stringify(req.body || {});
    const data = await PatientBillingService.processGatewayWebhook(provider, rawPayload, sig, req.body || {});
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// Hospital Staff Billing Operations (Strictly excludes DOCTOR and PATIENT)
// ============================================================================
const BILLING_STAFF_ROLES = ['ACCOUNTANT', 'RECEPTIONIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN'] as const;

router.get(
  '/billing/staff/invoices',
  authenticate,
  attachHospitalHeaderContext,
  requireHospitalAccess([...BILLING_STAFF_ROLES]),
  (req, res, next) => {
    try {
      const hospitalId = resolveHospitalId(req);
      res.json({ success: true, data: PatientBillingService.listHospitalInvoices(hospitalId) });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  '/billing/staff/payments',
  authenticate,
  attachHospitalHeaderContext,
  requireHospitalAccess([...BILLING_STAFF_ROLES]),
  (req, res, next) => {
    try {
      const hospitalId = resolveHospitalId(req);
      res.json({ success: true, data: PatientBillingService.listHospitalPayments(hospitalId) });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/billing/staff/refunds',
  authenticate,
  attachHospitalHeaderContext,
  requireHospitalAccess(['ACCOUNTANT', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']),
  billingRateLimiter,
  validateRequest(createStaffRefundSchema),
  (req, res, next) => {
    try {
      const hospitalId = resolveHospitalId(req);
      const refund = PatientBillingService.initiateStaffRefund(hospitalId, req.auth!.userId, req.body);
      res.status(201).json({ success: true, data: refund });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/billing/staff/refunds/:refundId/process',
  authenticate,
  attachHospitalHeaderContext,
  requireHospitalAccess(['ACCOUNTANT', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']),
  billingRateLimiter,
  (req, res, next) => {
    try {
      const hospitalId = resolveHospitalId(req);
      const data = PatientBillingService.processStaffRefund(
        hospitalId,
        req.auth!.userId,
        getParam(req.params.refundId)
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
