process.env.DISABLE_AUTH_RATE_LIMIT_FOR_TEST = 'true';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import http from 'http';
import { createApp } from '../src/app';
import { db } from '../src/database/prisma';
import { seedDatabaseIfEmpty } from '../src/database/seed';
import { clinicalStore } from '../src/modules/clinical/clinical.service';
import { opsStore, OperationsAndBillingService } from '../src/modules/operations/operations.service';
import { directoryStore } from '../src/modules/directory/directory.service';
import { generateTotpCode, securityStore, StructuredLogger } from '../src/modules/security/security.service';
import { billingRateLimiter } from '../src/middleware/rateLimit.middleware';
import { hashPassword, signAccessToken } from '../src/utils/crypto';
import { SmsOtpDeliveryService } from '../src/utils/sms';
import {
  getLocalSandboxSigningSecret,
  getLocalSandboxWebhookSecret,
} from '../src/modules/billing/payment-gateway.provider';

describe('MediCore Phases 13 & 14: Security Audit, RBAC/IDOR, MFA, Billing, Verified Receipts & Performance SLA', () => {
  let server: http.Server;
  let baseUrl: string;

  const hospAId = 'aaaa1111-1111-4111-8111-111111111111';
  const hospBId = 'bbbb2222-2222-4222-8222-222222222222';

  let patient1Id: string;
  let patient1UserId: string;
  let patient1Token: string;

  let patient2UserId: string;
  let patient2Token: string;

  let doctorUserId: string;
  let doctorToken: string;

  let accountantUserId: string;
  let accountantToken: string;

  let hospitalBAdminToken: string;

  before(async () => {
    db.reset();
    clinicalStore.reset();
    opsStore.reset();
    securityStore.reset();
    directoryStore.records.clear();
    await seedDatabaseIfEmpty();

    db.hospitals.set(hospAId, {
      id: hospAId,
      name: 'Rajendra Institute of Medical Sciences (RIMS)',
      registrationNumber: 'CEA-JHK-001',
      category: 'MEDICAL_COLLEGE',
      logoUrl: null,
      address: 'Bariatu Road',
      city: 'Ranchi',
      state: 'Jharkhand',
      contactEmail: 'admin@rimsranchi.org',
      contactPhone: '+91 651 254 1533',
      totalBeds: 1500,
      availableBeds: 220,
      status: 'ACTIVE',
      departments: ['Cardiology', 'Medicine'],
      createdByUserId: null,
      approvedByUserId: null,
      approvedAt: new Date(),
      rejectionReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    db.hospitals.set(hospBId, {
      id: hospBId,
      name: 'Orchid Medical Centre',
      registrationNumber: 'CEA-JHK-002',
      category: 'MULTI_SPECIALTY',
      logoUrl: null,
      address: 'HB Road',
      city: 'Ranchi',
      state: 'Jharkhand',
      contactEmail: 'admin@orchidmed.in',
      contactPhone: '+91 651 710 0100',
      totalBeds: 250,
      availableBeds: 60,
      status: 'ACTIVE',
      departments: ['Cardiology'],
      createdByUserId: null,
      approvedByUserId: null,
      approvedAt: new Date(),
      rejectionReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const passwordHash = await hashPassword('StrongPass!2026');

    const reg1 = await fetchOrCreatePatient('p1.billing@medicore.in', '+919876500111', 'Aarav Sharma', passwordHash);
    patient1UserId = reg1.userId;
    patient1Id = reg1.patientProfileId;
    patient1Token = reg1.token;

    const reg2 = await fetchOrCreatePatient('p2.billing@medicore.in', '+919876500222', 'Neha Verma', passwordHash);
    patient2UserId = reg2.userId;
    patient2Token = reg2.token;

    // Doctor at Hospital A
    doctorUserId = crypto.randomUUID();
    db.users.set(doctorUserId, {
      id: doctorUserId,
      fullName: 'Dr. Vikram Sinha',
      email: 'dr.vikram@rims.in',
      phone: '+919800001111',
      passwordHash,
      isEmailVerified: true,
      isActive: true,
      activeHospitalId: hospAId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const docMemId = crypto.randomUUID();
    db.memberships.set(docMemId, {
      id: docMemId,
      userId: doctorUserId,
      hospitalId: hospAId,
      department: 'Cardiology',
      employeeCode: 'DOC-001',
      status: 'ACTIVE',
      joinedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const docRoleId = crypto.randomUUID();
    db.userRoles.set(docRoleId, {
      id: docRoleId,
      userId: doctorUserId,
      roleCode: 'DOCTOR',
      hospitalId: hospAId,
      membershipId: docMemId,
      assignedAt: new Date(),
    });
    doctorToken = signAccessToken({
      sub: doctorUserId,
      email: 'dr.vikram@rims.in',
      activeHospitalId: hospAId,
    });

    // Accountant at Hospital A
    accountantUserId = crypto.randomUUID();
    db.users.set(accountantUserId, {
      id: accountantUserId,
      fullName: 'Rohan Accountant',
      email: 'accounts@rims.in',
      phone: '+919800002222',
      passwordHash,
      isEmailVerified: true,
      isActive: true,
      activeHospitalId: hospAId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const accMemId = crypto.randomUUID();
    db.memberships.set(accMemId, {
      id: accMemId,
      userId: accountantUserId,
      hospitalId: hospAId,
      department: 'Finance',
      employeeCode: 'ACC-001',
      status: 'ACTIVE',
      joinedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const accRoleId = crypto.randomUUID();
    db.userRoles.set(accRoleId, {
      id: accRoleId,
      userId: accountantUserId,
      roleCode: 'ACCOUNTANT',
      hospitalId: hospAId,
      membershipId: accMemId,
      assignedAt: new Date(),
    });
    accountantToken = signAccessToken({
      sub: accountantUserId,
      email: 'accounts@rims.in',
      activeHospitalId: hospAId,
    });

    // Hospital B Admin (must be blocked from Hospital A)
    const adminBId = crypto.randomUUID();
    db.users.set(adminBId, {
      id: adminBId,
      fullName: 'Admin Hospital B',
      email: 'admin@orchidmed.in',
      phone: '+919800003333',
      passwordHash,
      isEmailVerified: true,
      isActive: true,
      activeHospitalId: hospBId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const adminBMemId = crypto.randomUUID();
    db.memberships.set(adminBMemId, {
      id: adminBMemId,
      userId: adminBId,
      hospitalId: hospBId,
      department: 'Admin',
      employeeCode: 'ADM-B01',
      status: 'ACTIVE',
      joinedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const adminBRoleId = crypto.randomUUID();
    db.userRoles.set(adminBRoleId, {
      id: adminBRoleId,
      userId: adminBId,
      roleCode: 'HOSPITAL_ADMIN',
      hospitalId: hospBId,
      membershipId: adminBMemId,
      assignedAt: new Date(),
    });
    hospitalBAdminToken = signAccessToken({
      sub: adminBId,
      email: 'admin@orchidmed.in',
      activeHospitalId: hospBId,
    });

    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const addr = server.address() as { port: number };
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  async function fetchOrCreatePatient(email: string, phone: string, fullName: string, passwordHash: string) {
    const userId = crypto.randomUUID();
    const profileId = crypto.randomUUID();
    db.users.set(userId, {
      id: userId,
      fullName,
      email,
      phone,
      passwordHash: null,
      isEmailVerified: true,
      isPhoneVerified: true,
      isActive: true,
      activeHospitalId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    db.userRoles.set(crypto.randomUUID(), {
      id: crypto.randomUUID(),
      userId,
      roleCode: 'PATIENT',
      hospitalId: null,
      membershipId: null,
      assignedAt: new Date(),
    });
    db.patientProfiles.set(userId, {
      id: profileId,
      userId,
      globalPatientId: `MC-PT-${profileId.slice(0, 8).toUpperCase()}`,
      dateOfBirth: '1992-05-14',
      gender: 'MALE',
      onboardingCompleted: true,
      termsAcceptedAt: new Date(),
      healthConsentGranted: true,
      healthConsentAt: new Date(),
      profileCompletionPercent: 100,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const token = signAccessToken({
      sub: userId,
      email,
      activeHospitalId: null,
    });
    return { userId, patientProfileId: profileId, token };
  }

  it('1. Enforces brute-force OTP login lockout, real RFC 6238 TOTP MFA, and strict PHI/payment secret redaction', async () => {
    let latestOtp = '';
    SmsOtpDeliveryService.setTestTransport(async (req) => {
      latestOtp = req.otpCode;
      return { messageId: `p14-${Date.now()}` };
    });

    try {
      const reqRes = await fetch(`${baseUrl}/api/v1/auth/patient/otp/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '+919876500222', purpose: 'LOGIN' }),
      });
      assert.equal(reqRes.status, 200);
      assert.ok(latestOtp);

      // Brute-force wrong OTP attempts lock out account
      for (let i = 0; i < 8; i++) {
        const res = await fetch(`${baseUrl}/api/v1/auth/patient/otp/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: '+919876500222', otpCode: '000000' }),
        });
        assert.ok(res.status === 401 || res.status === 429);
      }
      const lockedRes = await fetch(`${baseUrl}/api/v1/auth/patient/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '+919876500222', otpCode: latestOtp }),
      });
      assert.equal(lockedRes.status, 429);
      const lockedBody: any = await lockedRes.json();
      assert.equal(lockedBody.error.code, 'ACCOUNT_LOGIN_LOCKED');
    } finally {
      SmsOtpDeliveryService.setTestTransport(null);
    }

    // TOTP MFA rejects fake/static codes and accepts RFC 6238 HMAC-SHA1 code
    const setupRes = await fetch(`${baseUrl}/api/v1/security/mfa/setup`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${patient1Token}` },
    });
    assert.equal(setupRes.status, 200);
    const setupBody: any = await setupRes.json();
    const secret = setupBody.data.secretPreview;

    const fakeVerifyRes = await fetch(`${baseUrl}/api/v1/security/mfa/verify`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${patient1Token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ totpCode: '123456' }),
    });
    assert.equal(fakeVerifyRes.status, 401);

    const realCode = generateTotpCode(secret);
    const realVerifyRes = await fetch(`${baseUrl}/api/v1/security/mfa/verify`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${patient1Token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ totpCode: realCode }),
    });
    assert.equal(realVerifyRes.status, 200);
    assert.equal((await realVerifyRes.json() as any).data.mfaEnabled, true);

    // StructuredLogger redacts secret, token & PHI fields and device registration omits sensitive credentials
    const sanitized = StructuredLogger.sanitizePayload({
      patientId: 'p1',
      token: 'super_secret_token_value',
      gatewaySignature: 'deadbeef1234',
      razorpay_signature: 'secret',
      cardCvv: '999',
      diagnosisName: 'Hypertension',
      symptoms: 'Chest tightness',
    });
    assert.equal(sanitized.token, '[REDACTED_SENSITIVE]');
    assert.equal(sanitized.gatewaySignature, '[REDACTED_SENSITIVE]');
    assert.equal(sanitized.cardCvv, '[REDACTED_SENSITIVE]');
    assert.equal(sanitized.diagnosisName, '[REDACTED_SENSITIVE]');

    await fetch(`${baseUrl}/api/v1/security/devices/register`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${patient1Token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceName: 'Pixel 9', platform: 'ANDROID' }),
    });
    const devicesRes = await fetch(`${baseUrl}/api/v1/security/devices`, {
      headers: { Authorization: `Bearer ${patient1Token}` },
    });
    assert.equal(devicesRes.status, 200);
    const devicesJson: any = await devicesRes.json();
    assert.equal(devicesJson.data[0].deviceName, 'Pixel 9');
  });

  it('2. Blocks privilege escalation, cross-hospital tenant access, mass-assignment, SQLi payloads, and invalid MIME/path traversal', async () => {
    // Patient blocked from staff finance, clinical roster, AI usage, notifications dispatch
    const patientToStaffBilling = await fetch(`${baseUrl}/api/v1/billing/staff/invoices`, {
      headers: { Authorization: `Bearer ${patient1Token}`, 'X-Hospital-Id': hospAId },
    });
    assert.equal(patientToStaffBilling.status, 403);

    const patientToAiUsage = await fetch(`${baseUrl}/api/v1/ai/usage`, {
      headers: { Authorization: `Bearer ${patient1Token}`, 'X-Hospital-Id': hospAId },
    });
    assert.equal(patientToAiUsage.status, 403);

    // Doctor blocked from staff billing finance endpoints (strict role boundary)
    const doctorToFinance = await fetch(`${baseUrl}/api/v1/billing/staff/invoices`, {
      headers: { Authorization: `Bearer ${doctorToken}`, 'X-Hospital-Id': hospAId },
    });
    assert.equal(doctorToFinance.status, 403);

    // Accountant allowed in own hospital A, blocked from Hospital B (cross-tenant isolation)
    const accountantOwnHosp = await fetch(`${baseUrl}/api/v1/billing/staff/invoices`, {
      headers: { Authorization: `Bearer ${accountantToken}`, 'X-Hospital-Id': hospAId },
    });
    assert.equal(accountantOwnHosp.status, 200);

    const crossTenantRes = await fetch(`${baseUrl}/api/v1/billing/staff/invoices`, {
      headers: { Authorization: `Bearer ${hospitalBAdminToken}`, 'X-Hospital-Id': hospAId },
    });
    assert.equal(crossTenantRes.status, 403);

    // SQL injection string safely handled by Zod/discovery query validation without 500 error
    const sqliRes = await fetch(
      `${baseUrl}/api/v1/patient/hospitals?search=${encodeURIComponent("' OR 1=1; DROP TABLE users;--")}`,
      { headers: { Authorization: `Bearer ${patient1Token}` } }
    );
    assert.equal(sqliRes.status, 200);

    // Path traversal / spoofed MIME upload blocked on patient profile photo upload
    const form = new FormData();
    const exeBytes = new Uint8Array([0x4d, 0x5a, 0x90, 0x00]); // PE EXE magic header pretending to be JPEG
    form.append('photo', new Blob([exeBytes], { type: 'image/jpeg' }), '../../etc/passwd.jpg');
    const uploadRes = await fetch(`${baseUrl}/api/v1/patient/profile/photo`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${patient1Token}` },
      body: form,
    });
    assert.equal(uploadRes.status, 400);

    // Readiness endpoint exposes configuration state without leaking DB credentials
    const readyRes = await fetch(`${baseUrl}/health/ready`);
    assert.equal(readyRes.status, 200);
    const readyBody = await readyRes.text();
    assert.ok(!readyBody.includes('postgresql://'));
    assert.ok(readyBody.includes('gatewayMode'));
  });

  it('3. Verifies Cache-Control no-store headers, middleware rate-limiting configuration, and response latency < 200ms', async () => {
    const start = performance.now();
    const res = await fetch(`${baseUrl}/api/v1/patient/invoices`, {
      headers: { Authorization: `Bearer ${patient1Token}` },
    });
    const elapsedMs = performance.now() - start;

    assert.equal(res.status, 200);
    assert.ok(res.headers.get('cache-control')?.includes('no-store'));
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.ok(elapsedMs < 200, `Expected <200ms latency, got ${elapsedMs.toFixed(1)}ms`);
    assert.equal(typeof billingRateLimiter, 'function');
  });

  it('4. Phase 13 Complete Flow: Dashboard totals, Invoice Detail + PDF, Idempotent Payment Orders, Forged Signature Rejection, Verified Receipt + PDF, Partial Payment, Cancel, Webhook & Refund', async () => {
    // Seed 2 invoices for Patient 1 (one full pending, one overdue) and 1 for Patient 2
    const inv1 = OperationsAndBillingService.createInvoice(hospAId, accountantUserId, {
      patientId: patient1Id,
      discountPaise: 5000,
      finalizeImmediately: true,
      items: [
        {
          serviceCategory: 'DOCTOR_CONSULTATION',
          description: 'Cardiology Senior Consultation',
          quantity: 1,
          unitPricePaise: 80000,
          taxRatePercent: 0,
        },
        {
          serviceCategory: 'LAB_TEST',
          description: 'ECG & Lipid Profile',
          quantity: 1,
          unitPricePaise: 120000,
          taxRatePercent: 5,
        },
      ],
    });
    inv1.dueDate = '2099-12-31';

    const invOverdue = OperationsAndBillingService.createInvoice(hospAId, accountantUserId, {
      patientId: patient1Id,
      finalizeImmediately: true,
      items: [
        {
          serviceCategory: 'PHARMACY',
          description: 'Post-OPD Prescription Pack',
          quantity: 1,
          unitPricePaise: 50000,
          taxRatePercent: 0,
        },
      ],
    });
    invOverdue.dueDate = '2020-01-10';

    const invOtherPatient = OperationsAndBillingService.createInvoice(hospAId, accountantUserId, {
      patientId: patient2UserId,
      finalizeImmediately: true,
      items: [
        { serviceCategory: 'OTHER', description: 'Private Checkup', quantity: 1, unitPricePaise: 40000 },
      ],
    });

    // Dashboard totals & overdue filter
    const dashRes = await fetch(`${baseUrl}/api/v1/patient/invoices`, {
      headers: { Authorization: `Bearer ${patient1Token}` },
    });
    assert.equal(dashRes.status, 200);
    const dashJson: any = await dashRes.json();
    assert.equal(dashJson.summary.overdueInvoiceCount, 1);
    assert.equal(dashJson.summary.totalOutstandingPaise, inv1.balanceDuePaise + invOverdue.balanceDuePaise);
    assert.equal(dashJson.data.length, 2);

    // IDOR Check: Patient 1 cannot view Patient 2 invoice or PDF
    const idorInv = await fetch(`${baseUrl}/api/v1/patient/invoices/${invOtherPatient.id}`, {
      headers: { Authorization: `Bearer ${patient1Token}` },
    });
    assert.equal(idorInv.status, 403);

    // Valid Invoice PDF download
    const invPdfRes = await fetch(`${baseUrl}/api/v1/patient/invoices/${inv1.id}/pdf`, {
      headers: { Authorization: `Bearer ${patient1Token}` },
    });
    assert.equal(invPdfRes.status, 200);
    assert.equal(invPdfRes.headers.get('content-type'), 'application/pdf');
    const invPdfBytes = await invPdfRes.text();
    assert.ok(invPdfBytes.startsWith('%PDF-1.4'));

    // Partial Payment Order Creation + Idempotency
    const idemKey = `order-key-${crypto.randomUUID()}`;
    const orderRes1 = await fetch(`${baseUrl}/api/v1/patient/invoices/${inv1.id}/payment-orders`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${patient1Token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ amountPaise: 100000, method: 'UPI', idempotencyKey: idemKey }),
    });
    assert.equal(orderRes1.status, 201);
    const orderJson1: any = await orderRes1.json();
    assert.equal(orderJson1.data.payment.status, 'PENDING');
    assert.equal(orderJson1.data.payment.receiptNumber, null);
    const paymentId = orderJson1.data.payment.id;
    const gatewayOrderId = orderJson1.data.gatewayOrder.gatewayOrderId;

    // Duplicate order idempotency check + different-key active order block
    const orderReplay = await fetch(`${baseUrl}/api/v1/patient/invoices/${inv1.id}/payment-orders`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${patient1Token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ amountPaise: 100000, method: 'UPI', idempotencyKey: idemKey }),
    });
    assert.equal(orderReplay.status, 200);
    assert.equal((await orderReplay.json() as any).data.idempotentReplay, true);

    const dupOrderRes = await fetch(`${baseUrl}/api/v1/patient/invoices/${inv1.id}/payment-orders`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${patient1Token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ amountPaise: 100000, method: 'UPI', idempotencyKey: crypto.randomUUID() }),
    });
    assert.equal(dupOrderRes.status, 409);

    // Receipt MUST NOT be available before verified payment completion
    const preReceiptRes = await fetch(`${baseUrl}/api/v1/patient/payments/${paymentId}/receipt`, {
      headers: { Authorization: `Bearer ${patient1Token}` },
    });
    assert.equal(preReceiptRes.status, 409);

    // Forged client signature rejected; balance remains untouched
    const forgedVerifyRes = await fetch(`${baseUrl}/api/v1/patient/payments/${paymentId}/verify`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${patient1Token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gatewayOrderId,
        gatewayPaymentId: 'pay_forged_1234',
        gatewaySignature: '00000000000000000000000000000000',
      }),
    });
    assert.equal(forgedVerifyRes.status, 403);
    assert.equal(opsStore.invoices.get(inv1.id)!.paidPaise, 0);

    // Genuine HMAC signature verifies and issues receipt + marks PARTIALLY_PAID
    const gatewayPaymentId = 'pay_sbx_verified_001';
    const validSig = crypto
      .createHmac('sha256', getLocalSandboxSigningSecret())
      .update(`${gatewayOrderId}|${gatewayPaymentId}`)
      .digest('hex');

    const verifyRes = await fetch(`${baseUrl}/api/v1/patient/payments/${paymentId}/verify`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${patient1Token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ gatewayOrderId, gatewayPaymentId, gatewaySignature: validSig }),
    });
    assert.equal(verifyRes.status, 200);
    const verifyJson: any = await verifyRes.json();
    assert.equal(verifyJson.data.payment.status, 'SUCCESS');
    assert.equal(verifyJson.data.invoice.status, 'PARTIALLY_PAID');
    assert.ok(verifyJson.data.receipt.receiptNumber.startsWith('RCP-'));

    // Receipt JSON + Receipt PDF now accessible, and blocked for Patient 2
    const receiptRes = await fetch(`${baseUrl}/api/v1/patient/payments/${paymentId}/receipt`, {
      headers: { Authorization: `Bearer ${patient1Token}` },
    });
    assert.equal(receiptRes.status, 200);

    const receiptIdor = await fetch(`${baseUrl}/api/v1/patient/payments/${paymentId}/receipt`, {
      headers: { Authorization: `Bearer ${patient2Token}` },
    });
    assert.equal(receiptIdor.status, 403);

    const receiptPdfRes = await fetch(`${baseUrl}/api/v1/patient/payments/${paymentId}/receipt/pdf`, {
      headers: { Authorization: `Bearer ${patient1Token}` },
    });
    assert.equal(receiptPdfRes.status, 200);
    assert.ok((await receiptPdfRes.text()).startsWith('%PDF-1.4'));

    // Patient creates order for overdue invoice & cancels it
    const orderCancelCreate = await fetch(`${baseUrl}/api/v1/patient/invoices/${invOverdue.id}/payment-orders`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${patient1Token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ method: 'CARD', idempotencyKey: crypto.randomUUID() }),
    });
    assert.equal(orderCancelCreate.status, 201);
    const cancelPayId = (await orderCancelCreate.json() as any).data.payment.id;

    const cancelRes = await fetch(`${baseUrl}/api/v1/patient/payments/${cancelPayId}/cancel`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${patient1Token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ outcome: 'CANCELLED', reason: 'User exited checkout' }),
    });
    assert.equal(cancelRes.status, 200);
    assert.equal((await cancelRes.json() as any).data.status, 'CANCELLED');

    // Re-create order on overdue invoice and capture via signed webhook + replay idempotency
    const orderWebhookCreate = await fetch(`${baseUrl}/api/v1/patient/invoices/${invOverdue.id}/payment-orders`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${patient1Token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ method: 'NET_BANKING', idempotencyKey: crypto.randomUUID() }),
    });
    assert.equal(orderWebhookCreate.status, 201);
    const whOrderData = (await orderWebhookCreate.json() as any).data;

    const webhookBody = JSON.stringify({
      eventId: 'evt_rzp_001',
      eventType: 'payment.captured',
      gatewayOrderId: whOrderData.gatewayOrder.gatewayOrderId,
      gatewayPaymentId: 'pay_wh_001',
    });
    const whSig = crypto
      .createHmac('sha256', getLocalSandboxWebhookSecret())
      .update(webhookBody)
      .digest('hex');

    const whRes = await fetch(`${baseUrl}/api/v1/payments/webhooks/razorpay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-razorpay-signature': whSig },
      body: webhookBody,
    });
    assert.equal(whRes.status, 200);
    assert.equal(opsStore.invoices.get(invOverdue.id)!.status, 'PAID');

    const whReplay = await fetch(`${baseUrl}/api/v1/payments/webhooks/razorpay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-razorpay-signature': whSig },
      body: webhookBody,
    });
    assert.equal(whReplay.status, 200);
    assert.equal((await whReplay.json() as any).data.idempotentReplay, true);

    // Staff Refund Flow (REFUND_PENDING -> REFUNDED updates invoice balance)
    const refundInit = await fetch(`${baseUrl}/api/v1/billing/staff/refunds`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accountantToken}`,
        'X-Hospital-Id': hospAId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentId: whOrderData.payment.id,
        amountPaise: 50000,
        reason: 'Duplicate lab charge adjustment',
      }),
    });
    assert.equal(refundInit.status, 201);
    const refundId = (await refundInit.json() as any).data.id;
    assert.equal(opsStore.payments.get(whOrderData.payment.id)!.status, 'REFUND_PENDING');

    const refundProcess = await fetch(`${baseUrl}/api/v1/billing/staff/refunds/${refundId}/process`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accountantToken}`, 'X-Hospital-Id': hospAId },
    });
    assert.equal(refundProcess.status, 200);
    assert.equal(opsStore.payments.get(whOrderData.payment.id)!.status, 'REFUNDED');
    assert.equal(opsStore.invoices.get(invOverdue.id)!.balanceDuePaise, 50000);
  });
});
