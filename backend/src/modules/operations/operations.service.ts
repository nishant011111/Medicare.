import crypto from 'crypto';
import { ApiError } from '../../utils/errors';
import { db } from '../../database/prisma';

export interface LabOrderRecord {
  id: string;
  orderNumber: string;
  hospitalId: string;
  patientId: string;
  testCode: string;
  testName: string;
  category: string;
  status: 'REQUESTED' | 'COLLECTED' | 'PROCESSING' | 'COMPLETED' | 'VERIFIED' | 'CANCELLED';
  sampleTrackingId?: string;
  observedValue?: string;
  unit: string;
  referenceInterval: string;
  verifiedByUserId?: string;
  verifiedAt?: string;
  createdAt: string;
}

export interface MedicineBatchRecord {
  id: string;
  hospitalId: string;
  medicineName: string;
  strength: string;
  batchNumber: string;
  expiryDate: string; // YYYY-MM-DD
  sellingPricePaise: number;
  currentStock: number;
  reorderLevel: number;
}

export interface BedRecord {
  id: string;
  hospitalId: string;
  wardName: string;
  roomNumber: string;
  bedNumber: string;
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING' | 'MAINTENANCE';
  dailyRatePaise: number;
  currentAdmissionId: string | null;
}

export interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  hospitalId: string;
  patientId: string;
  status: 'DRAFT' | 'FINALIZED' | 'PARTIALLY_PAID' | 'PAID' | 'VOID';
  subtotalPaise: number;
  discountPaise: number;
  taxPaise: number;
  totalPaise: number;
  creditNotePaise: number;
  paidPaise: number;
  insuranceSettledPaise: number;
  balanceDuePaise: number;
  items: Array<{
    serviceCategory: string;
    description: string;
    quantity: number;
    unitPricePaise: number;
    taxRatePercent: number;
    taxAmountPaise: number;
    lineTotalPaise: number;
  }>;
  creditNotes: Array<{
    id: string;
    creditNoteNumber: string;
    amountPaise: number;
    reason: string;
    issuedByUserId: string;
    issuedAt: string;
  }>;
  createdAt: string;
}

export interface PaymentRecord {
  id: string;
  receiptNumber: string;
  hospitalId: string;
  invoiceId: string;
  patientId: string;
  amountPaise: number;
  method: 'CASH' | 'UPI' | 'CARD' | 'NET_BANKING' | 'INSURANCE_SETTLEMENT';
  status: 'CAPTURED' | 'FAILED' | 'REFUNDED';
  idempotencyKey: string;
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  paidAt: string;
}

export interface InsuranceClaimRecord {
  id: string;
  claimNumber: string;
  hospitalId: string;
  invoiceId: string;
  patientId: string;
  providerName: string;
  policyNumber: string;
  claimedAmountPaise: number;
  approvedAmountPaise: number;
  settledAmountPaise: number;
  patientPayablePaise: number;
  status: 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'SETTLED';
}

export interface ExpenseRecord {
  id: string;
  expenseNumber: string;
  hospitalId: string;
  categoryName: string;
  vendorName: string;
  description: string;
  amountPaise: number;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'PAID';
  expenseDate: string;
}

class OperationsAndBillingStore {
  labOrders = new Map<string, LabOrderRecord>();
  medicineBatches = new Map<string, MedicineBatchRecord>();
  beds = new Map<string, BedRecord>();
  invoices = new Map<string, InvoiceRecord>();
  payments = new Map<string, PaymentRecord>();
  claims = new Map<string, InsuranceClaimRecord>();
  expenses = new Map<string, ExpenseRecord>();
  processedWebhookEvents = new Set<string>();

  reset() {
    this.labOrders.clear();
    this.medicineBatches.clear();
    this.beds.clear();
    this.invoices.clear();
    this.payments.clear();
    this.claims.clear();
    this.expenses.clear();
    this.processedWebhookEvents.clear();
  }
}

export const opsStore = new OperationsAndBillingStore();

export class OperationsAndBillingService {
  static dispenseMedicineBatch(
    hospitalId: string,
    batchId: string,
    quantity: number,
    dispensedByUserId: string
  ) {
    const batch = opsStore.medicineBatches.get(batchId);
    if (!batch || batch.hospitalId !== hospitalId) {
      throw ApiError.notFound('Medicine batch not found in this hospital');
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    if (batch.expiryDate < todayStr) {
      throw ApiError.badRequest(
        `Cannot dispense expired batch ${batch.batchNumber} (Expired on ${batch.expiryDate})`,
        'EXPIRED_MEDICINE_BATCH_BLOCKED'
      );
    }

    if (batch.currentStock < quantity) {
      throw ApiError.conflict(
        `Insufficient stock in batch ${batch.batchNumber}. Available: ${batch.currentStock}`,
        'INSUFFICIENT_BATCH_STOCK'
      );
    }

    batch.currentStock -= quantity;
    db.logAudit({
      userId: dispensedByUserId,
      hospitalId,
      action: 'PHARMACY_MEDICINE_DISPENSED',
      entityType: 'MedicineBatch',
      entityId: batchId,
      ipAddress: null,
      userAgent: null,
      metadata: { batchNumber: batch.batchNumber, quantity, remainingStock: batch.currentStock },
    });

    return batch;
  }

  static allocateBedToAdmission(hospitalId: string, bedId: string, admissionId: string, actorUserId: string) {
    const bed = opsStore.beds.get(bedId);
    if (!bed || bed.hospitalId !== hospitalId) {
      throw ApiError.notFound('Bed not found in this hospital');
    }
    if (bed.status !== 'AVAILABLE' || bed.currentAdmissionId !== null) {
      throw ApiError.conflict(
        `Bed ${bed.bedNumber} is currently ${bed.status} and cannot be concurrently allocated`,
        'BED_ALREADY_OCCUPIED'
      );
    }
    bed.status = 'OCCUPIED';
    bed.currentAdmissionId = admissionId;
    db.logAudit({
      userId: actorUserId,
      hospitalId,
      action: 'IPD_BED_ALLOCATED',
      entityType: 'Bed',
      entityId: bedId,
      ipAddress: null,
      userAgent: null,
      metadata: { bedNumber: bed.bedNumber, admissionId },
    });
    return bed;
  }

  /**
   * Creates an invoice using exact integer minor units (Paise).
   */
  static createInvoice(
    hospitalId: string,
    createdByUserId: string,
    payload: {
      patientId: string;
      discountPaise?: number;
      finalizeImmediately?: boolean;
      items: Array<{
        serviceCategory: string;
        description: string;
        quantity: number;
        unitPricePaise: number;
        taxRatePercent?: number;
      }>;
    }
  ): InvoiceRecord {
    if (!payload.items || payload.items.length === 0) {
      throw ApiError.badRequest('Invoice must contain at least one billable item');
    }

    let subtotalPaise = 0;
    let taxPaise = 0;
    const computedItems = payload.items.map((item) => {
      if (!Number.isInteger(item.unitPricePaise) || item.unitPricePaise < 0) {
        throw ApiError.badRequest('Monetary unitPricePaise must be a non-negative integer in paise');
      }
      const lineSub = item.quantity * item.unitPricePaise;
      const taxRate = item.taxRatePercent || 0;
      const lineTax = Math.round((lineSub * taxRate) / 100);
      const lineTotal = lineSub + lineTax;
      subtotalPaise += lineSub;
      taxPaise += lineTax;
      return {
        serviceCategory: item.serviceCategory,
        description: item.description,
        quantity: item.quantity,
        unitPricePaise: item.unitPricePaise,
        taxRatePercent: taxRate,
        taxAmountPaise: lineTax,
        lineTotalPaise: lineTotal,
      };
    });

    const discountPaise = payload.discountPaise || 0;
    const totalPaise = Math.max(0, subtotalPaise - discountPaise + taxPaise);
    const id = crypto.randomUUID();
    const record: InvoiceRecord = {
      id,
      invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
      hospitalId,
      patientId: payload.patientId,
      status: payload.finalizeImmediately ? 'FINALIZED' : 'DRAFT',
      subtotalPaise,
      discountPaise,
      taxPaise,
      totalPaise,
      creditNotePaise: 0,
      paidPaise: 0,
      insuranceSettledPaise: 0,
      balanceDuePaise: totalPaise,
      items: computedItems,
      creditNotes: [],
      createdAt: new Date().toISOString(),
    };
    opsStore.invoices.set(id, record);
    return record;
  }

  /**
   * Finalized invoices cannot be silently overwritten; adjustments must use Credit Notes.
   */
  static issueCreditNote(
    hospitalId: string,
    invoiceId: string,
    issuedByUserId: string,
    payload: { amountPaise: number; reason: string }
  ) {
    const invoice = opsStore.invoices.get(invoiceId);
    if (!invoice || invoice.hospitalId !== hospitalId) {
      throw ApiError.notFound('Invoice not found in this hospital');
    }
    if (invoice.status === 'DRAFT') {
      throw ApiError.badRequest('Credit notes apply only to finalized or partially paid invoices');
    }
    if (!Number.isInteger(payload.amountPaise) || payload.amountPaise <= 0) {
      throw ApiError.badRequest('amountPaise must be a positive integer');
    }
    if (payload.amountPaise > invoice.balanceDuePaise) {
      throw ApiError.badRequest('Credit note amount cannot exceed remaining balance due');
    }

    const cn = {
      id: crypto.randomUUID(),
      creditNoteNumber: `CN-${Date.now().toString().slice(-6)}`,
      amountPaise: payload.amountPaise,
      reason: payload.reason,
      issuedByUserId,
      issuedAt: new Date().toISOString(),
    };
    invoice.creditNotes.push(cn);
    invoice.creditNotePaise += payload.amountPaise;
    invoice.balanceDuePaise -= payload.amountPaise;
    if (invoice.balanceDuePaise === 0 && invoice.paidPaise > 0) {
      invoice.status = 'PAID';
    }
    return { invoice, creditNote: cn };
  }

  /**
   * Records a payment with idempotency protection and optional Razorpay signature verification.
   */
  static recordPayment(
    hospitalId: string,
    collectedByUserId: string,
    payload: {
      invoiceId: string;
      amountPaise: number;
      method: 'CASH' | 'UPI' | 'CARD' | 'NET_BANKING';
      idempotencyKey: string;
      gatewayOrderId?: string;
      gatewayPaymentId?: string;
      gatewaySignature?: string;
    }
  ) {
    // Idempotency check
    const existing = Array.from(opsStore.payments.values()).find(
      (p) => p.idempotencyKey === payload.idempotencyKey
    );
    if (existing) {
      return { payment: existing, idempotentReplay: true };
    }

    const invoice = opsStore.invoices.get(payload.invoiceId);
    if (!invoice || invoice.hospitalId !== hospitalId) {
      throw ApiError.notFound('Invoice not found in this hospital');
    }
    if (payload.amountPaise <= 0 || payload.amountPaise > invoice.balanceDuePaise) {
      throw ApiError.badRequest('Invalid payment amount in paise');
    }

    // If gateway fields are supplied, verify HMAC-SHA256 signature
    if (payload.gatewayOrderId && payload.gatewayPaymentId) {
      const secret = process.env.RAZORPAY_KEY_SECRET || 'rzp_test_placeholder_key_secret';
      const expectedSig = crypto
        .createHmac('sha256', secret)
        .update(`${payload.gatewayOrderId}|${payload.gatewayPaymentId}`)
        .digest('hex');
      if (payload.gatewaySignature !== expectedSig) {
        throw ApiError.forbidden('Invalid payment gateway signature', 'INVALID_GATEWAY_SIGNATURE');
      }
    }

    const payment: PaymentRecord = {
      id: crypto.randomUUID(),
      receiptNumber: `RCP-${Date.now().toString().slice(-6)}`,
      hospitalId,
      invoiceId: invoice.id,
      patientId: invoice.patientId,
      amountPaise: payload.amountPaise,
      method: payload.method,
      status: 'CAPTURED',
      idempotencyKey: payload.idempotencyKey,
      gatewayOrderId: payload.gatewayOrderId,
      gatewayPaymentId: payload.gatewayPaymentId,
      paidAt: new Date().toISOString(),
    };
    opsStore.payments.set(payment.id, payment);

    invoice.paidPaise += payload.amountPaise;
    invoice.balanceDuePaise -= payload.amountPaise;
    invoice.status = invoice.balanceDuePaise === 0 ? 'PAID' : 'PARTIALLY_PAID';

    return { payment, invoice, idempotentReplay: false };
  }

  /**
   * Returns hospital financial analytics with strict separation between:
   * - Invoiced Revenue (gross billed on finalized/paid invoices)
   * - Accounting Recognized Revenue (invoiced minus credit notes)
   * - Collected Cash (actual captured payments)
   * - Outstanding Receivables (unpaid balance due)
   */
  static getFinancialAnalytics(hospitalId: string) {
    const invoices = Array.from(opsStore.invoices.values()).filter(
      (i) => i.hospitalId === hospitalId && i.status !== 'DRAFT' && i.status !== 'VOID'
    );
    const payments = Array.from(opsStore.payments.values()).filter(
      (p) => p.hospitalId === hospitalId && p.status === 'CAPTURED'
    );
    const expenses = Array.from(opsStore.expenses.values()).filter(
      (e) => e.hospitalId === hospitalId && e.status === 'PAID'
    );

    const grossInvoicedPaise = invoices.reduce((acc, i) => acc + i.totalPaise, 0);
    const totalCreditNotesPaise = invoices.reduce((acc, i) => acc + i.creditNotePaise, 0);
    const accountingRevenuePaise = grossInvoicedPaise - totalCreditNotesPaise;
    const collectedCashPaise = payments.reduce((acc, p) => acc + p.amountPaise, 0);
    const outstandingReceivablesPaise = invoices.reduce((acc, i) => acc + i.balanceDuePaise, 0);
    const paidExpensesPaise = expenses.reduce((acc, e) => acc + e.amountPaise, 0);

    return {
      hospitalId,
      currency: 'INR',
      unit: 'PAISE',
      grossInvoicedPaise,
      totalCreditNotesPaise,
      accountingRevenuePaise,
      collectedCashPaise,
      outstandingReceivablesPaise,
      paidExpensesPaise,
      netOperatingCashflowPaise: collectedCashPaise - paidExpensesPaise,
      invoiceCount: invoices.length,
      capturedPaymentCount: payments.length,
    };
  }
}
