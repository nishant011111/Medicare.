import crypto from 'crypto';
import { db, withTransaction } from '../../database/prisma';
import { ApiError } from '../../utils/errors';
import { buildSimplePdfBuffer } from '../../utils/pdf';
import {
  InvoiceRecord,
  opsStore,
  PaymentReceiptRecord,
  PaymentRecord,
  RefundRecord,
} from '../operations/operations.service';
import { SecurityAndNotificationService } from '../security/security.service';
import { getPaymentGatewayProvider } from './payment-gateway.provider';

function formatInrFromPaise(paise: number): string {
  const sign = paise < 0 ? '-' : '';
  const abs = Math.abs(paise);
  const rupees = Math.floor(abs / 100);
  const cents = String(abs % 100).padStart(2, '0');
  return `${sign}INR ${rupees}.${cents}`;
}

function getTodayYmd(): string {
  return new Date().toISOString().slice(0, 10);
}

function isInvoiceOverdue(invoice: InvoiceRecord): boolean {
  if (invoice.balanceDuePaise <= 0) return false;
  if (invoice.status !== 'FINALIZED' && invoice.status !== 'PARTIALLY_PAID') return false;
  if (!invoice.dueDate) return false;
  return invoice.dueDate < getTodayYmd();
}

function resolveHospitalName(hospitalId: string): string {
  const h = db.hospitals.get(hospitalId);
  return h?.name || 'MediCore Partner Hospital';
}

function resolvePatientIdentifiers(userId: string): Set<string> {
  const ids = new Set<string>([userId]);
  const profile = db.patientProfiles.get(userId) || Array.from(db.patientProfiles.values()).find((p) => p.userId === userId);
  if (profile) {
    ids.add(profile.id);
    ids.add(profile.userId);
  }
  return ids;
}

function isVerifiedSuccessStatus(status: PaymentRecord['status']): boolean {
  return status === 'SUCCESS' || status === 'CAPTURED';
}

export interface PatientInvoiceSummaryDto {
  id: string;
  invoiceNumber: string;
  hospitalId: string;
  hospitalName: string;
  status: InvoiceRecord['status'];
  displayStatus: 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'VOID' | 'DRAFT';
  isOverdue: boolean;
  invoiceDate: string;
  dueDate: string | null;
  subtotalPaise: number;
  discountPaise: number;
  taxPaise: number;
  creditNotePaise: number;
  paidPaise: number;
  insuranceSettledPaise: number;
  totalPaise: number;
  balanceDuePaise: number;
  itemCount: number;
  createdAt: string;
}

export class PatientBillingService {
  private static toSummaryDto(inv: InvoiceRecord): PatientInvoiceSummaryDto {
    const overdue = isInvoiceOverdue(inv);
    let displayStatus: PatientInvoiceSummaryDto['displayStatus'] = 'PENDING';
    if (inv.status === 'PAID' || inv.balanceDuePaise === 0) displayStatus = 'PAID';
    else if (inv.status === 'VOID') displayStatus = 'VOID';
    else if (inv.status === 'DRAFT') displayStatus = 'DRAFT';
    else if (overdue) displayStatus = 'OVERDUE';
    else if (inv.status === 'PARTIALLY_PAID' || inv.paidPaise > 0) displayStatus = 'PARTIALLY_PAID';

    return {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      hospitalId: inv.hospitalId,
      hospitalName: resolveHospitalName(inv.hospitalId),
      status: inv.status,
      displayStatus,
      isOverdue: overdue,
      invoiceDate: inv.invoiceDate || inv.createdAt.slice(0, 10),
      dueDate: inv.dueDate || null,
      subtotalPaise: inv.subtotalPaise,
      discountPaise: inv.discountPaise,
      taxPaise: inv.taxPaise,
      creditNotePaise: inv.creditNotePaise,
      paidPaise: inv.paidPaise,
      insuranceSettledPaise: inv.insuranceSettledPaise,
      totalPaise: inv.totalPaise,
      balanceDuePaise: inv.balanceDuePaise,
      itemCount: inv.items.length,
      createdAt: inv.createdAt,
    };
  }

  private static assertPatientOwnsInvoice(userId: string, invoiceId: string): InvoiceRecord {
    const inv = opsStore.invoices.get(invoiceId);
    if (!inv) {
      throw ApiError.notFound('Invoice not found', 'INVOICE_NOT_FOUND');
    }
    const ownedIds = resolvePatientIdentifiers(userId);
    if (!ownedIds.has(inv.patientId)) {
      throw ApiError.forbidden('You do not have permission to access this invoice', 'FORBIDDEN_INVOICE_ACCESS');
    }
    return inv;
  }

  private static assertPatientOwnsPayment(userId: string, paymentId: string): PaymentRecord {
    const pay = opsStore.payments.get(paymentId);
    if (!pay) {
      throw ApiError.notFound('Payment transaction not found', 'PAYMENT_NOT_FOUND');
    }
    const ownedIds = resolvePatientIdentifiers(userId);
    if (!ownedIds.has(pay.patientId)) {
      throw ApiError.forbidden('You do not have permission to access this payment', 'FORBIDDEN_PAYMENT_ACCESS');
    }
    return pay;
  }

  static getPatientDashboard(
    userId: string,
    query: {
      status?: 'ALL' | 'PENDING' | 'PAID' | 'PARTIALLY_PAID' | 'OVERDUE';
      sortBy?: 'newest' | 'oldest' | 'highest_due' | 'due_date';
      search?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const ownedIds = resolvePatientIdentifiers(userId);
    const allInvoices = Array.from(opsStore.invoices.values())
      .filter((inv) => ownedIds.has(inv.patientId) && inv.status !== 'DRAFT' && inv.status !== 'VOID');

    let totalOutstandingPaise = 0;
    let totalPaidPaise = 0;
    let pendingCount = 0;
    let partialCount = 0;
    let paidCount = 0;
    let overdueCount = 0;

    const summaries = allInvoices.map((inv) => {
      const dto = this.toSummaryDto(inv);
      totalOutstandingPaise += inv.balanceDuePaise;
      totalPaidPaise += inv.paidPaise;
      if (dto.displayStatus === 'PAID') paidCount += 1;
      else if (dto.displayStatus === 'OVERDUE') {
        overdueCount += 1;
        pendingCount += 1;
      } else if (dto.displayStatus === 'PARTIALLY_PAID') {
        partialCount += 1;
      } else if (dto.displayStatus === 'PENDING') {
        pendingCount += 1;
      }
      return dto;
    });

    const filterStatus = query.status || 'ALL';
    const searchLower = (query.search || '').trim().toLowerCase();
    const filtered = summaries.filter((s) => {
      if (filterStatus === 'PENDING' && s.displayStatus !== 'PENDING' && s.displayStatus !== 'OVERDUE') {
        return false;
      }
      if (filterStatus === 'PAID' && s.displayStatus !== 'PAID') return false;
      if (filterStatus === 'PARTIALLY_PAID' && s.displayStatus !== 'PARTIALLY_PAID') return false;
      if (filterStatus === 'OVERDUE' && !s.isOverdue) return false;
      if (searchLower) {
        const matchesNum = s.invoiceNumber.toLowerCase().includes(searchLower);
        const matchesHosp = s.hospitalName.toLowerCase().includes(searchLower);
        if (!matchesNum && !matchesHosp) return false;
      }
      return true;
    });

    const sortBy = query.sortBy || 'newest';
    filtered.sort((a, b) => {
      if (sortBy === 'oldest') return a.createdAt.localeCompare(b.createdAt);
      if (sortBy === 'highest_due') return b.balanceDuePaise - a.balanceDuePaise;
      if (sortBy === 'due_date') return (a.dueDate || '9999-12-31').localeCompare(b.dueDate || '9999-12-31');
      return b.createdAt.localeCompare(a.createdAt);
    });

    const page = query.page || 1;
    const limit = query.limit || 20;
    const start = (page - 1) * limit;
    const pagedInvoices = filtered.slice(start, start + limit);

    const recentTransactions = Array.from(opsStore.payments.values())
      .filter((p) => ownedIds.has(p.patientId))
      .sort((a, b) => (b.paidAt || b.createdAt || '').localeCompare(a.paidAt || a.createdAt || ''))
      .slice(0, 10)
      .map((p) => {
        const inv = opsStore.invoices.get(p.invoiceId);
        return {
          ...p,
          hospitalName: resolveHospitalName(p.hospitalId),
          invoiceNumber: inv?.invoiceNumber || null,
          receiptAvailable: Boolean(p.receiptNumber && opsStore.paymentReceipts.get(p.id)),
        };
      });

    return {
      summary: {
        currency: 'INR',
        totalOutstandingPaise,
        totalPaidPaise,
        pendingInvoiceCount: pendingCount,
        partialInvoiceCount: partialCount,
        paidInvoiceCount: paidCount,
        overdueInvoiceCount: overdueCount,
      },
      invoices: pagedInvoices,
      recentTransactions,
      meta: {
        page,
        limit,
        total: filtered.length,
      },
    };
  }

  static getInvoiceDetail(userId: string, invoiceId: string) {
    const inv = this.assertPatientOwnsInvoice(userId, invoiceId);
    if (inv.status === 'DRAFT') {
      throw ApiError.notFound('Invoice not yet finalized', 'INVOICE_NOT_FINALIZED');
    }
    const payments = Array.from(opsStore.payments.values())
      .filter((p) => p.invoiceId === inv.id)
      .sort((a, b) => (b.paidAt || b.createdAt || '').localeCompare(a.paidAt || a.createdAt || ''))
      .map((p) => ({
        ...p,
        receiptAvailable: Boolean(p.receiptNumber && opsStore.paymentReceipts.get(p.id)),
      }));

    return {
      ...this.toSummaryDto(inv),
      notes: inv.notes || null,
      items: inv.items,
      creditNotes: inv.creditNotes,
      payments,
    };
  }

  static generateInvoicePdf(userId: string, invoiceId: string): { fileName: string; buffer: Buffer } {
    const detail = this.getInvoiceDetail(userId, invoiceId);
    const lines = [
      { text: `Hospital: ${detail.hospitalName}`, bold: true },
      { text: `Invoice Number: ${detail.invoiceNumber}   |   Status: ${detail.displayStatus}` },
      { text: `Invoice Date: ${detail.invoiceDate}${detail.dueDate ? `   |   Due Date: ${detail.dueDate}` : ''}`, spacingAfter: 16 },
      { text: 'Line Items:', bold: true },
      ...detail.items.map(
        (item, idx) => ({
          text: `${idx + 1}. ${item.description} (${item.serviceCategory}) x${item.quantity} = ${formatInrFromPaise(item.lineTotalPaise)}`,
        })
      ),
      { text: '------------------------------------------------------------', spacingAfter: 12 },
      { text: `Subtotal: ${formatInrFromPaise(detail.subtotalPaise)}` },
      { text: `Discount: ${formatInrFromPaise(detail.discountPaise)}` },
      { text: `Tax: ${formatInrFromPaise(detail.taxPaise)}` },
      { text: `Total Billed: ${formatInrFromPaise(detail.totalPaise)}`, bold: true },
      { text: `Paid to Date: ${formatInrFromPaise(detail.paidPaise)}` },
      { text: `Balance Due: ${formatInrFromPaise(detail.balanceDuePaise)}`, bold: true },
    ];
    return {
      fileName: `MediCore-Invoice-${detail.invoiceNumber}.pdf`,
      buffer: buildSimplePdfBuffer('MediCore Clinical Invoice', lines),
    };
  }

  static async createPaymentOrder(
    userId: string,
    invoiceId: string,
    payload: {
      amountPaise?: number;
      method: 'UPI' | 'CARD' | 'NET_BANKING' | 'BANK_TRANSFER';
      methodDetail?: string;
      idempotencyKey: string;
    }
  ) {
    const inv = this.assertPatientOwnsInvoice(userId, invoiceId);

    // Idempotent replay protection
    const existingByKey = Array.from(opsStore.payments.values()).find(
      (p) => p.idempotencyKey === payload.idempotencyKey
    );
    if (existingByKey) {
      const ownedIds = resolvePatientIdentifiers(userId);
      if (!ownedIds.has(existingByKey.patientId)) {
        throw ApiError.forbidden('Idempotency key conflict with another account', 'IDEMPOTENCY_CONFLICT');
      }
      return {
        idempotentReplay: true,
        payment: existingByKey,
        gatewayOrder: {
          provider: existingByKey.gatewayProvider || 'RAZORPAY',
          gatewayOrderId: existingByKey.gatewayOrderId || '',
          amountPaise: existingByKey.amountPaise,
          currency: existingByKey.currency || 'INR',
          keyId: null,
          mode: 'sandbox',
        },
      };
    }

    if (inv.status === 'DRAFT' || inv.status === 'VOID') {
      throw ApiError.badRequest('This invoice cannot accept payments', 'INVOICE_NOT_PAYABLE');
    }
    if (inv.balanceDuePaise <= 0 || inv.status === 'PAID') {
      throw ApiError.conflict('Invoice is already fully paid', 'INVOICE_ALREADY_PAID');
    }

    const amountPaise = payload.amountPaise ?? inv.balanceDuePaise;
    if (!Number.isInteger(amountPaise) || amountPaise <= 0) {
      throw ApiError.badRequest('Payment amount must be greater than zero', 'INVALID_PAYMENT_AMOUNT');
    }
    if (amountPaise > inv.balanceDuePaise) {
      throw ApiError.badRequest('Payment amount cannot exceed remaining balance due', 'OVERPAYMENT_NOT_ALLOWED');
    }

    // Prevent concurrent active pending order for same invoice unless previous failed/cancelled
    const activePending = Array.from(opsStore.payments.values()).find(
      (p) => p.invoiceId === inv.id && (p.status === 'CREATED' || p.status === 'PENDING')
    );
    if (activePending) {
      throw ApiError.conflict(
        'An active payment session is already in progress for this invoice. Complete or cancel it before creating a new order.',
        'DUPLICATE_ACTIVE_PAYMENT_ORDER'
      );
    }

    const paymentId = crypto.randomUUID();
    const provider = getPaymentGatewayProvider();
    const gatewayOrder = await provider.createOrder({
      paymentId,
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      hospitalId: inv.hospitalId,
      patientId: inv.patientId,
      amountPaise,
      currency: 'INR',
      method: payload.method,
      idempotencyKey: payload.idempotencyKey,
    });

    const record: PaymentRecord = {
      id: paymentId,
      receiptNumber: null,
      hospitalId: inv.hospitalId,
      invoiceId: inv.id,
      patientId: inv.patientId,
      amountPaise,
      currency: 'INR',
      method: payload.method,
      methodDetail: payload.methodDetail || null,
      status: 'PENDING',
      gatewayProvider: gatewayOrder.provider,
      gatewayOrderId: gatewayOrder.gatewayOrderId,
      idempotencyKey: payload.idempotencyKey,
      paidAt: null,
      createdAt: new Date().toISOString(),
    };
    opsStore.payments.set(paymentId, record);

    db.logAudit({
      userId,
      hospitalId: inv.hospitalId,
      action: 'PATIENT_PAYMENT_ORDER_CREATED',
      entityType: 'Payment',
      entityId: paymentId,
      ipAddress: null,
      userAgent: null,
      metadata: {
        invoiceId: inv.id,
        amountPaise,
        method: payload.method,
        gatewayOrderId: gatewayOrder.gatewayOrderId,
      },
    });

    return {
      idempotentReplay: false,
      payment: record,
      gatewayOrder,
    };
  }

  private static async finalizeVerifiedPayment(
    payment: PaymentRecord,
    actorUserId: string | null,
    details: { gatewayPaymentId?: string; gatewaySignature?: string; source: 'CLIENT_VERIFY' | 'WEBHOOK' }
  ) {
    if (isVerifiedSuccessStatus(payment.status)) {
      const invoice = opsStore.invoices.get(payment.invoiceId);
      const receipt = opsStore.paymentReceipts.get(payment.id) || null;
      return { payment, invoice, receipt, alreadyVerified: true };
    }

    if (payment.status === 'CANCELLED' || payment.status === 'FAILED' || payment.status === 'REFUNDED') {
      throw ApiError.conflict(`Cannot verify payment in ${payment.status} state`, 'PAYMENT_TERMINAL_STATE');
    }

    return await withTransaction(async () => {
      const invoice = opsStore.invoices.get(payment.invoiceId);
      if (!invoice) {
        throw ApiError.notFound('Associated invoice not found', 'INVOICE_NOT_FOUND');
      }
      if (payment.amountPaise > invoice.balanceDuePaise) {
        throw ApiError.conflict('Payment amount exceeds remaining invoice balance', 'INVOICE_BALANCE_CHANGED');
      }

      const nowIso = new Date().toISOString();
      const receiptNumber = `RCP-${Date.now().toString().slice(-6)}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

      payment.status = 'SUCCESS';
      payment.gatewayPaymentId = details.gatewayPaymentId || payment.gatewayPaymentId;
      payment.gatewaySignature = details.gatewaySignature || payment.gatewaySignature;
      payment.receiptNumber = receiptNumber;
      payment.verifiedAt = nowIso;
      payment.paidAt = nowIso;

      invoice.paidPaise += payment.amountPaise;
      invoice.balanceDuePaise = Math.max(0, invoice.balanceDuePaise - payment.amountPaise);
      invoice.status = invoice.balanceDuePaise === 0 ? 'PAID' : 'PARTIALLY_PAID';

      const receipt: PaymentReceiptRecord = {
        id: crypto.randomUUID(),
        receiptNumber,
        paymentId: payment.id,
        invoiceId: invoice.id,
        hospitalId: invoice.hospitalId,
        patientId: payment.patientId,
        amountPaise: payment.amountPaise,
        currency: payment.currency || 'INR',
        issuedAt: nowIso,
      };
      opsStore.paymentReceipts.set(payment.id, receipt);

      db.logAudit({
        userId: actorUserId,
        hospitalId: invoice.hospitalId,
        action: 'PAYMENT_VERIFIED_AND_CAPTURED',
        entityType: 'Payment',
        entityId: payment.id,
        ipAddress: null,
        userAgent: null,
        metadata: {
          source: details.source,
          invoiceId: invoice.id,
          amountPaise: payment.amountPaise,
          receiptNumber,
        },
      });

      const targetUserId =
        db.patientProfiles.get(payment.patientId)?.userId ||
        Array.from(db.patientProfiles.values()).find((p) => p.id === payment.patientId)?.userId ||
        payment.patientId;
      SecurityAndNotificationService.enqueueOutboxNotification({
        idempotencyKey: `payment-receipt:${payment.id}`,
        hospitalId: invoice.hospitalId,
        recipientUserId: targetUserId,
        category: 'FINANCIAL',
        eventType: 'PAYMENT_RECEIPT_ISSUED',
        authenticatedBody: `Verified payment of ${formatInrFromPaise(payment.amountPaise)} received for invoice ${invoice.invoiceNumber} (Receipt ${receiptNumber}).`,
        deepLinkRoute: `medicore://billing/receipt/${payment.id}`,
      });

      return { payment, invoice, receipt, alreadyVerified: false };
    });
  }

  static async verifyPatientPayment(
    userId: string,
    paymentId: string,
    payload: { gatewayOrderId: string; gatewayPaymentId: string; gatewaySignature: string }
  ) {
    const payment = this.assertPatientOwnsPayment(userId, paymentId);
    if (payment.gatewayOrderId && payment.gatewayOrderId !== payload.gatewayOrderId) {
      throw ApiError.forbidden('Gateway order ID does not match payment record', 'ORDER_ID_MISMATCH');
    }

    const provider = getPaymentGatewayProvider();
    const isValid = provider.verifyClientSignature({
      gatewayOrderId: payload.gatewayOrderId,
      gatewayPaymentId: payload.gatewayPaymentId,
      gatewaySignature: payload.gatewaySignature,
    });
    if (!isValid) {
      db.logAudit({
        userId,
        hospitalId: payment.hospitalId,
        action: 'PAYMENT_SIGNATURE_VERIFICATION_FAILED',
        entityType: 'Payment',
        entityId: payment.id,
        ipAddress: null,
        userAgent: null,
        metadata: { invoiceId: payment.invoiceId },
      });
      throw ApiError.forbidden('Invalid payment gateway signature', 'INVALID_GATEWAY_SIGNATURE');
    }

    return await this.finalizeVerifiedPayment(payment, userId, {
      gatewayPaymentId: payload.gatewayPaymentId,
      gatewaySignature: payload.gatewaySignature,
      source: 'CLIENT_VERIFY',
    });
  }

  static cancelOrFailPayment(
    userId: string,
    paymentId: string,
    payload: { outcome: 'CANCELLED' | 'FAILED'; reason?: string }
  ) {
    const payment = this.assertPatientOwnsPayment(userId, paymentId);
    if (isVerifiedSuccessStatus(payment.status) || payment.status === 'REFUNDED') {
      throw ApiError.conflict('Verified payment cannot be cancelled directly; use refund request.', 'PAYMENT_ALREADY_SETTLED');
    }
    const nowIso = new Date().toISOString();
    payment.status = payload.outcome;
    if (payload.outcome === 'CANCELLED') {
      payment.cancelledAt = nowIso;
    } else {
      payment.failureReason = payload.reason || 'Payment declined by gateway';
    }
    db.logAudit({
      userId,
      hospitalId: payment.hospitalId,
      action: `PAYMENT_${payload.outcome}`,
      entityType: 'Payment',
      entityId: payment.id,
      ipAddress: null,
      userAgent: null,
      metadata: { reason: payload.reason || null },
    });
    return payment;
  }

  static getPaymentStatus(userId: string, paymentId: string) {
    const payment = this.assertPatientOwnsPayment(userId, paymentId);
    const inv = opsStore.invoices.get(payment.invoiceId);
    const receipt = opsStore.paymentReceipts.get(payment.id) || null;
    return {
      ...payment,
      hospitalName: resolveHospitalName(payment.hospitalId),
      invoiceNumber: inv?.invoiceNumber || null,
      invoiceStatus: inv?.status || null,
      invoiceBalanceDuePaise: inv?.balanceDuePaise ?? null,
      receiptAvailable: Boolean(receipt),
      receipt,
    };
  }

  static listPatientPayments(
    userId: string,
    query: { status?: string; page?: number; limit?: number }
  ) {
    const ownedIds = resolvePatientIdentifiers(userId);
    const filterStatus = query.status || 'ALL';
    const items = Array.from(opsStore.payments.values())
      .filter((p) => ownedIds.has(p.patientId))
      .filter((p) => {
        if (filterStatus === 'ALL') return true;
        if (filterStatus === 'SUCCESS') return isVerifiedSuccessStatus(p.status);
        return p.status === filterStatus;
      })
      .sort((a, b) => (b.paidAt || b.createdAt || '').localeCompare(a.paidAt || a.createdAt || ''))
      .map((p) => {
        const inv = opsStore.invoices.get(p.invoiceId);
        return {
          ...p,
          hospitalName: resolveHospitalName(p.hospitalId),
          invoiceNumber: inv?.invoiceNumber || null,
          receiptAvailable: Boolean(p.receiptNumber && opsStore.paymentReceipts.get(p.id)),
        };
      });

    const page = query.page || 1;
    const limit = query.limit || 20;
    const start = (page - 1) * limit;
    return {
      items: items.slice(start, start + limit),
      meta: { page, limit, total: items.length },
    };
  }

  static getPaymentReceipt(userId: string, paymentId: string) {
    const payment = this.assertPatientOwnsPayment(userId, paymentId);
    const receipt = opsStore.paymentReceipts.get(payment.id);
    if (!receipt || (!isVerifiedSuccessStatus(payment.status) && payment.status !== 'REFUND_PENDING' && payment.status !== 'REFUNDED')) {
      throw new ApiError(
        409,
        'RECEIPT_NOT_AVAILABLE',
        'Receipt is generated only after verified successful payment completion.'
      );
    }
    const inv = opsStore.invoices.get(payment.invoiceId);
    return {
      receipt,
      payment,
      hospitalName: resolveHospitalName(payment.hospitalId),
      invoiceNumber: inv?.invoiceNumber || '',
      invoiceItems: inv?.items || [],
    };
  }

  static generateReceiptPdf(userId: string, paymentId: string): { fileName: string; buffer: Buffer } {
    const data = this.getPaymentReceipt(userId, paymentId);
    const lines = [
      { text: `Hospital: ${data.hospitalName}`, bold: true },
      { text: `Receipt Number: ${data.receipt.receiptNumber}`, bold: true },
      { text: `Invoice Number: ${data.invoiceNumber}` },
      { text: `Payment Method: ${data.payment.method}${data.payment.methodDetail ? ` (${data.payment.methodDetail})` : ''}` },
      { text: `Payment Status: ${data.payment.status}` },
      { text: `Gateway Reference: ${data.payment.gatewayPaymentId || data.payment.gatewayOrderId || 'N/A'}` },
      { text: `Verified Timestamp: ${data.receipt.issuedAt}`, spacingAfter: 16 },
      { text: `Amount Paid: ${formatInrFromPaise(data.receipt.amountPaise)}`, bold: true, size: 12 },
    ];
    return {
      fileName: `MediCore-Receipt-${data.receipt.receiptNumber}.pdf`,
      buffer: buildSimplePdfBuffer('MediCore Verified Payment Receipt', lines),
    };
  }

  static async processGatewayWebhook(
    providerName: string,
    rawBody: string | Buffer,
    signatureHeader: string,
    payload: {
      eventId?: string;
      eventType?: string;
      gatewayOrderId?: string;
      gatewayPaymentId?: string;
      failureReason?: string;
    }
  ) {
    const provider = getPaymentGatewayProvider();
    if (!provider.verifyWebhookSignature(rawBody, signatureHeader)) {
      throw ApiError.forbidden('Invalid payment webhook signature', 'INVALID_WEBHOOK_SIGNATURE');
    }

    const eventId = payload.eventId || crypto.createHash('sha256').update(rawBody).digest('hex');
    if (opsStore.processedWebhookEvents.has(eventId)) {
      return { processed: true, idempotentReplay: true, eventId };
    }
    opsStore.processedWebhookEvents.add(eventId);

    const payment = Array.from(opsStore.payments.values()).find(
      (p) =>
        (payload.gatewayOrderId && p.gatewayOrderId === payload.gatewayOrderId) ||
        (payload.gatewayPaymentId && p.gatewayPaymentId === payload.gatewayPaymentId)
    );
    if (!payment) {
      return { processed: false, idempotentReplay: false, eventId, reason: 'Payment reference not found' };
    }

    if (payload.eventType === 'payment.captured') {
      await this.finalizeVerifiedPayment(payment, null, {
        gatewayPaymentId: payload.gatewayPaymentId,
        source: 'WEBHOOK',
      });
    } else if (payload.eventType === 'payment.failed') {
      if (!isVerifiedSuccessStatus(payment.status)) {
        payment.status = 'FAILED';
        payment.failureReason = payload.failureReason || 'Payment failed via gateway webhook';
      }
    }

    return { processed: true, idempotentReplay: false, eventId, provider: providerName, paymentStatus: payment.status };
  }

  // Staff Billing Operations (strictly excluded from DOCTOR and PATIENT roles)
  static listHospitalInvoices(hospitalId: string) {
    return Array.from(opsStore.invoices.values())
      .filter((i) => i.hospitalId === hospitalId)
      .map((i) => this.toSummaryDto(i));
  }

  static listHospitalPayments(hospitalId: string) {
    return Array.from(opsStore.payments.values())
      .filter((p) => p.hospitalId === hospitalId)
      .sort((a, b) => (b.paidAt || b.createdAt || '').localeCompare(a.paidAt || a.createdAt || ''));
  }

  static initiateStaffRefund(
    hospitalId: string,
    actorUserId: string,
    payload: { paymentId: string; amountPaise: number; reason: string }
  ): RefundRecord {
    const payment = opsStore.payments.get(payload.paymentId);
    if (!payment || payment.hospitalId !== hospitalId) {
      throw ApiError.notFound('Payment not found in this hospital', 'PAYMENT_NOT_FOUND');
    }
    if (!isVerifiedSuccessStatus(payment.status)) {
      throw ApiError.badRequest('Refunds can only be initiated for verified successful payments', 'PAYMENT_NOT_REFUNDABLE');
    }
    if (payload.amountPaise > payment.amountPaise) {
      throw ApiError.badRequest('Refund amount cannot exceed captured payment amount', 'REFUND_EXCEEDS_PAYMENT');
    }

    const refund: RefundRecord = {
      id: crypto.randomUUID(),
      refundNumber: `RFD-${Date.now().toString().slice(-6)}`,
      paymentId: payment.id,
      invoiceId: payment.invoiceId,
      hospitalId,
      patientId: payment.patientId,
      amountPaise: payload.amountPaise,
      reason: payload.reason,
      status: 'REQUESTED',
      requestedById: actorUserId,
      createdAt: new Date().toISOString(),
    };
    payment.status = 'REFUND_PENDING';
    opsStore.refunds.set(refund.id, refund);
    return refund;
  }

  static processStaffRefund(hospitalId: string, actorUserId: string, refundId: string) {
    const refund = opsStore.refunds.get(refundId);
    if (!refund || refund.hospitalId !== hospitalId) {
      throw ApiError.notFound('Refund record not found in this hospital', 'REFUND_NOT_FOUND');
    }
    if (refund.status === 'PROCESSED') {
      return { refund, idempotentReplay: true };
    }
    const payment = opsStore.payments.get(refund.paymentId);
    const invoice = opsStore.invoices.get(refund.invoiceId);
    if (!payment || !invoice) {
      throw ApiError.notFound('Associated payment or invoice not found');
    }

    const nowIso = new Date().toISOString();
    refund.status = 'PROCESSED';
    refund.approvedById = actorUserId;
    refund.processedAt = nowIso;
    payment.status = 'REFUNDED';
    invoice.paidPaise = Math.max(0, invoice.paidPaise - refund.amountPaise);
    invoice.balanceDuePaise += refund.amountPaise;
    invoice.status = invoice.paidPaise > 0 ? 'PARTIALLY_PAID' : 'FINALIZED';

    db.logAudit({
      userId: actorUserId,
      hospitalId,
      action: 'STAFF_REFUND_PROCESSED',
      entityType: 'Refund',
      entityId: refund.id,
      ipAddress: null,
      userAgent: null,
      metadata: { paymentId: payment.id, amountPaise: refund.amountPaise },
    });

    return { refund, payment, invoice, idempotentReplay: false };
  }
}
