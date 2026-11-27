import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import http from 'http';
import { createApp } from '../src/app';
import { db } from '../src/database/prisma';
import { seedDatabaseIfEmpty } from '../src/database/seed';
import { AuthService } from '../src/modules/auth/auth.service';
import { EmailDeliveryService } from '../src/utils/email';
import { SmsOtpDeliveryService } from '../src/utils/sms';
import { InMemoryLoginAttemptStore } from '../src/utils/loginAttemptStore';
import { clinicalStore } from '../src/modules/clinical/clinical.service';

async function startServer(app: ReturnType<typeof createApp>) {
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const addr = server.address() as { port: number };
  return { server, baseUrl: `http://127.0.0.1:${addr.port}/api/v1` };
}

async function stopServer(server: http.Server | null) {
  if (!server) return;
  await new Promise<void>((resolve) => server.close(() => resolve()));
}

function getFutureDateIso(daysAhead = 2): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  // Ensure we pick a weekday (Mon-Sat) so default doctor schedule is active
  if (d.getDay() === 0) {
    d.setDate(d.getDate() + 1);
  }
  return d.toISOString().slice(0, 10);
}

describe('MediCore Security: Login Attempt Limits, Keyless Mail Service & Patient Appointment Scheduler', () => {
  let serverA: http.Server | null = null;
  let serverB: http.Server | null = null;
  let baseUrlA = '';
  let baseUrlB = '';
  const sharedStore = new InMemoryLoginAttemptStore();

  before(async () => {
    process.env.DISABLE_AUTH_RATE_LIMIT_FOR_TEST = 'true';
    process.env.ENFORCE_IP_LOGIN_VELOCITY = 'true';
    await seedDatabaseIfEmpty();
    AuthService.setLoginAttemptStore(sharedStore);

    // Ensure at least one verified hospital and doctor exist for the AppointmentScheduler test
    if (clinicalStore.doctors.size === 0) {
      const now = new Date();
      const hospId = crypto.randomUUID();
      db.hospitals.set(hospId, {
        id: hospId,
        name: 'MediCore Clinical Center',
        registrationNumber: 'REG-TEST-001',
        type: 'PRIVATE',
        category: 'MULTISPECIALTY',
        email: 'desk@medicore-clinical.in',
        phone: '+919900001122',
        address: '100 Health Avenue',
        city: 'Ranchi',
        state: 'Jharkhand',
        country: 'India',
        pincode: '834001',
        bedCapacity: 120,
        departments: ['General Medicine', 'Cardiology'],
        status: 'VERIFIED',
        subscriptionPlan: 'PRO',
        verifiedAt: now,
        verifiedBy: null,
        createdAt: now,
        updatedAt: now,
      });
      const deptId = crypto.randomUUID();
      clinicalStore.departments.set(deptId, {
        id: deptId,
        hospitalId: hospId,
        name: 'General Medicine',
        code: 'GEN-01',
        description: 'Outpatient general medicine unit',
        floorLocation: 'Floor 1, Wing A',
        isActive: true,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });
      const docId = crypto.randomUUID();
      clinicalStore.doctors.set(docId, {
        id: docId,
        hospitalId: hospId,
        departmentId: deptId,
        departmentName: 'General Medicine',
        userId: null,
        fullName: 'Dr. Ananya Sharma',
        email: 'ananya.sharma@medicore-clinical.in',
        phone: '+919900002233',
        specialization: 'Internal Medicine',
        qualifications: 'MBBS, MD',
        registrationNumber: 'MCI-445566',
        experienceYears: 11,
        consultationFee: 600,
        slotDurationMinutes: 30,
        isAvailable: true,
        bio: 'Senior internal medicine consultant.',
        createdAt: now.toISOString(),
      });
    }

    const appA = createApp();
    appA.set('trust proxy', 1);
    const a = await startServer(appA);
    serverA = a.server;
    baseUrlA = a.baseUrl;

    const appB = createApp();
    appB.set('trust proxy', 1);
    const b = await startServer(appB);
    serverB = b.server;
    baseUrlB = b.baseUrl;
  });

  const sentOtpByPhone = new Map<string, string>();

  after(async () => {
    await stopServer(serverA);
    await stopServer(serverB);
    EmailDeliveryService.setTestTransport(null);
    SmsOtpDeliveryService.setTestTransport(null);
    await AuthService.resetLoginProtectionTrackers();
  });

  beforeEach(async () => {
    sentOtpByPhone.clear();
    SmsOtpDeliveryService.setTestTransport(async (req) => {
      sentOtpByPhone.set(req.to, req.otpCode);
      return { messageId: `sms-lockout-${Date.now()}` };
    });
    await AuthService.resetLoginProtectionTrackers();
  });

  let phoneSeq = 1000;
  async function registerPatientAccount(suffix: string) {
    phoneSeq += 1;
    const phone = `+91987654${phoneSeq}`;
    const otpReq = await fetch(`${baseUrlA}/auth/patient/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, purpose: 'REGISTER' }),
    });
    assert.equal(otpReq.status, 200);
    const regOtp = sentOtpByPhone.get(phone)!;
    assert.ok(regOtp);

    const res = await fetch(`${baseUrlA}/auth/patient/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: `Test Patient ${suffix}`,
        phone,
        otpCode: regOtp,
        termsAccepted: true,
      }),
    });
    assert.equal(res.status, 201);
    const json = (await res.json()) as any;
    return { phone, accessToken: json.data.accessToken as string, userId: json.data.user.id as string };
  }

  async function requestLoginOtp(phone: string, baseUrl = baseUrlA, ip = '10.10.0.1'): Promise<string> {
    const res = await fetch(`${baseUrl}/auth/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip },
      body: JSON.stringify({ phone, purpose: 'LOGIN' }),
    });
    assert.equal(res.status, 200);
    const code = sentOtpByPhone.get(phone);
    assert.ok(code, `Expected dispatched OTP for ${phone}`);
    return code;
  }

  it('Scenario 1: 4 consecutive failed OTP attempts return generic 401 without account enumeration', async () => {
    const { phone } = await registerPatientAccount('s1');
    await requestLoginOtp(phone, baseUrlA, '10.10.1.1');
    const nonExistentPhone = '+919999000111';

    for (let i = 1; i <= 4; i++) {
      const res = await fetch(`${baseUrlA}/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.10.1.1' },
        body: JSON.stringify({ phone, otpCode: `00000${i}` }),
      });
      assert.equal(res.status, 401);
      const body = (await res.json()) as any;
      assert.equal(body.error.code, 'INVALID_OTP');
      assert.equal(body.error.message, 'Invalid or expired OTP code');
    }

    const unknownRes = await fetch(`${baseUrlA}/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.10.1.2' },
      body: JSON.stringify({ phone: nonExistentPhone, otpCode: '111111' }),
    });
    assert.equal(unknownRes.status, 401);
    const unknownBody = (await unknownRes.json()) as any;
    assert.equal(unknownBody.error.code, 'INVALID_OTP');
    assert.equal(unknownBody.error.message, 'Invalid or expired OTP code');
  });

  it('Scenario 2: 5th consecutive failed OTP attempt triggers 15-minute temporary lockout', async () => {
    const { phone } = await registerPatientAccount('s2');
    await requestLoginOtp(phone, baseUrlA, '10.10.2.1');

    for (let i = 1; i <= 4; i++) {
      const res = await fetch(`${baseUrlA}/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.10.2.1' },
        body: JSON.stringify({ phone, otpCode: `00000${i}` }),
      });
      assert.equal(res.status, 401);
    }

    const fifth = await fetch(`${baseUrlA}/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.10.2.1' },
      body: JSON.stringify({ phone, otpCode: '000005' }),
    });
    assert.equal(fifth.status, 429);
    const body = (await fifth.json()) as any;
    assert.equal(body.error.code, 'ACCOUNT_LOGIN_LOCKED');
    assert.equal(body.error.details.waitingPeriodMinutes, 15);
    assert.equal(body.error.details.lockoutTier, 1);
    assert.equal(
      body.error.details.uiMessage,
      'Too many unsuccessful OTP verification attempts. Please try again after the displayed waiting period.'
    );
  });

  it('Scenario 3: Locked account stays blocked even with valid OTP and requesting a new OTP cannot bypass active lockout', async () => {
    const { phone } = await registerPatientAccount('s3');
    const validOtp = await requestLoginOtp(phone, baseUrlA, '10.10.3.1');

    for (let i = 1; i <= 5; i++) {
      await fetch(`${baseUrlA}/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.10.3.1' },
        body: JSON.stringify({ phone, otpCode: `00000${i}` }),
      });
    }

    // Valid OTP still blocked during active lockout
    const validAttempt = await fetch(`${baseUrlA}/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.10.3.1' },
      body: JSON.stringify({ phone, otpCode: validOtp }),
    });
    assert.equal(validAttempt.status, 429);
    const lockedJson = (await validAttempt.json()) as any;
    assert.equal(lockedJson.error.code, 'ACCOUNT_LOGIN_LOCKED');

    // Requesting a fresh OTP during active lockout must ALSO be blocked (429 ACCOUNT_LOGIN_LOCKED)
    const bypassOtpReq = await fetch(`${baseUrlA}/auth/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.10.3.2' },
      body: JSON.stringify({ phone, purpose: 'LOGIN' }),
    });
    assert.equal(bypassOtpReq.status, 429);
    const bypassJson = (await bypassOtpReq.json()) as any;
    assert.equal(bypassJson.error.code, 'ACCOUNT_LOGIN_LOCKED');
  });

  it('Scenario 4: Login succeeds after lockout expires; repeated lockout escalates progressively to 30 minutes (never permanent)', async () => {
    const { phone } = await registerPatientAccount('s4');

    // First lockout -> 15 minutes
    for (let i = 1; i <= 5; i++) {
      await fetch(`${baseUrlA}/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.10.4.1' },
        body: JSON.stringify({ phone, otpCode: `00000${i}` }),
      });
    }

    // Expire first lockout -> trigger 5 more failures -> progressive 30m lockout
    await AuthService.expireAccountLockoutForTest(phone);
    let secondLockRes: Response | null = null;
    for (let i = 1; i <= 5; i++) {
      secondLockRes = await fetch(`${baseUrlA}/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.10.4.2' },
        body: JSON.stringify({ phone, otpCode: `99999${i}` }),
      });
    }
    assert.ok(secondLockRes);
    assert.equal(secondLockRes.status, 429);
    const secondBody = (await secondLockRes.json()) as any;
    assert.equal(secondBody.error.details.lockoutTier, 2);
    assert.equal(secondBody.error.details.waitingPeriodMinutes, 30);

    // Expire second lockout -> request fresh OTP & verify -> succeeds (never permanently locked)
    await AuthService.expireAccountLockoutForTest(phone);
    const freshOtp = await requestLoginOtp(phone, baseUrlA, '10.10.4.3');
    const recoveredRes = await fetch(`${baseUrlA}/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.10.4.3' },
      body: JSON.stringify({ phone, otpCode: freshOtp }),
    });
    assert.equal(recoveredRes.status, 200);
    const recoveredJson = (await recoveredRes.json()) as any;
    assert.ok(recoveredJson.data.accessToken);
  });

  it('Scenario 5: Successful OTP login resets failed attempt counter and logs recovery audit event', async () => {
    const { phone, userId } = await registerPatientAccount('s5');
    const validOtp = await requestLoginOtp(phone, baseUrlA, '10.10.5.1');

    for (let i = 1; i <= 3; i++) {
      const res = await fetch(`${baseUrlA}/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.10.5.1' },
        body: JSON.stringify({ phone, otpCode: `00000${i}` }),
      });
      assert.equal(res.status, 401);
    }

    const okRes = await fetch(`${baseUrlA}/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.10.5.1' },
      body: JSON.stringify({ phone, otpCode: validOtp }),
    });
    assert.equal(okRes.status, 200);

    const stateAfter = await AuthService.getAccountLockState(phone);
    assert.equal(stateAfter, null);

    const recoveryAudit = db.auditLogs.find(
      (log) => log.userId === userId && log.action === 'AUTH_LOGIN_RECOVERED_AFTER_FAILURES'
    );
    assert.ok(recoveryAudit, 'Expected AUTH_LOGIN_RECOVERED_AFTER_FAILURES audit entry');

    // Confirm counter truly reset: 4 new failures should not lock yet
    for (let i = 1; i <= 4; i++) {
      const res = await fetch(`${baseUrlA}/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.10.5.2' },
        body: JSON.stringify({ phone, otpCode: `88888${i}` }),
      });
      assert.equal(res.status, 401);
    }
  });

  it('Scenario 6: Concurrent brute-force OTP verification requests are serialized atomically without race bypass', async () => {
    const { phone } = await registerPatientAccount('s6');

    const responses = await Promise.all(
      Array.from({ length: 10 }, (_, idx) =>
        fetch(`${baseUrlA}/auth/otp/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.10.6.1' },
          body: JSON.stringify({ phone, otpCode: `11111${idx}` }),
        })
      )
    );

    const statuses = responses.map((r) => r.status);
    const count401 = statuses.filter((s) => s === 401).length;
    const count429 = statuses.filter((s) => s === 429).length;
    assert.equal(count401, 4, `Expected exactly 4 unauthorized attempts before lockout, got ${count401}`);
    assert.equal(count429, 6, `Expected 6 locked responses (5th + 5 subsequent), got ${count429}`);
  });

  it('Scenario 7: Cross-IP failures against the same normalized phone still enforce 5-attempt lockout', async () => {
    const { phone } = await registerPatientAccount('s7');
    const localDigits = phone.replace(/^\+91/, '');
    const rotatingIps = ['203.0.113.10', '203.0.113.11', '203.0.113.12', '203.0.113.13', '203.0.113.14'];

    let finalStatus = 0;
    for (let i = 0; i < rotatingIps.length; i++) {
      // Alternate E.164 and bare 10-digit/whitespace formats to verify normalization
      const variantPhone = i % 2 === 0 ? phone : `  ${localDigits}  `;
      const res = await fetch(`${baseUrlA}/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': rotatingIps[i] },
        body: JSON.stringify({ phone: variantPhone, otpCode: `22222${i}` }),
      });
      finalStatus = res.status;
      if (i < 4) assert.equal(res.status, 401);
    }
    assert.equal(finalStatus, 429);
  });

  it('Scenario 8: Single-IP multi-account spraying triggers IP velocity block and logs suspicious IP without OTP secrets', async () => {
    const attackerIp = '198.51.100.77';
    const secretProbe = '739184';

    for (let i = 1; i <= 6; i++) {
      await fetch(`${baseUrlA}/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': attackerIp },
        body: JSON.stringify({
          phone: `+91987000001${i}`,
          otpCode: secretProbe,
        }),
      });
    }

    const blockedRes = await fetch(`${baseUrlA}/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': attackerIp },
      body: JSON.stringify({
        phone: '+919870000099',
        otpCode: secretProbe,
      }),
    });
    assert.equal(blockedRes.status, 429);
    const blockedBody = (await blockedRes.json()) as any;
    assert.equal(blockedBody.error.code, 'IP_LOGIN_RATE_LIMIT_EXCEEDED');

    const suspiciousLog = db.auditLogs.find(
      (log) => log.action === 'AUTH_SUSPICIOUS_IP_ACTIVITY' && log.ipAddress === attackerIp
    );
    assert.ok(suspiciousLog, 'Expected AUTH_SUSPICIOUS_IP_ACTIVITY audit log entry');

    // Ensure no audit log ever contains raw OTP codes
    const serializedAudit = JSON.stringify(db.auditLogs);
    assert.equal(serializedAudit.includes(secretProbe), false, 'Raw OTP must never appear in audit logs');
  });

  it('Scenario 9: Android patient endpoint /auth/patient/otp/verify enforces role restriction and lockout', async () => {
    const { phone } = await registerPatientAccount('s9');

    for (let i = 1; i <= 4; i++) {
      const res = await fetch(`${baseUrlA}/auth/patient/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.10.9.1' },
        body: JSON.stringify({ phone, otpCode: `33333${i}`, deviceInfo: 'MediCore-Android/1.0' }),
      });
      assert.equal(res.status, 401);
    }

    const lockedRes = await fetch(`${baseUrlA}/auth/patient/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.10.9.1' },
      body: JSON.stringify({ phone, otpCode: '333335', deviceInfo: 'MediCore-Android/1.0' }),
    });
    assert.equal(lockedRes.status, 429);

    await AuthService.expireAccountLockoutForTest(phone);
    const otp = await requestLoginOtp(phone, baseUrlA, '10.10.9.1');
    const successRes = await fetch(`${baseUrlA}/auth/patient/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.10.9.1' },
      body: JSON.stringify({ phone, otpCode: otp, deviceInfo: 'MediCore-Android/1.0' }),
    });
    assert.equal(successRes.status, 200);
    const okBody = (await successRes.json()) as any;
    assert.ok(okBody.data.accessToken);
    assert.ok(okBody.data.user.activeRoles.includes('PATIENT'));
  });

  it('Scenario 10: Two separate Express backend instances sharing one LoginAttemptStore enforce synchronized lockout', async () => {
    const { phone } = await registerPatientAccount('s10');

    // 3 failed attempts hit backend instance A
    for (let i = 1; i <= 3; i++) {
      const res = await fetch(`${baseUrlA}/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.10.10.1' },
        body: JSON.stringify({ phone, otpCode: `44444${i}` }),
      });
      assert.equal(res.status, 401);
    }

    // 4th attempt hits backend instance B -> still 401
    const fourthB = await fetch(`${baseUrlB}/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.10.10.2' },
      body: JSON.stringify({ phone, otpCode: '444444' }),
    });
    assert.equal(fourthB.status, 401);

    // 5th attempt hits backend instance B -> triggers lockout across BOTH A and B
    const fifthB = await fetch(`${baseUrlB}/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.10.10.2' },
      body: JSON.stringify({ phone, otpCode: '444445' }),
    });
    assert.equal(fifthB.status, 429);

    // Immediately verify instance A rejects as locked too
    const checkA = await fetch(`${baseUrlA}/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.10.10.3' },
      body: JSON.stringify({ phone, otpCode: '999999' }),
    });
    assert.equal(checkA.status, 429);
  });

  it('Keyless Mail Service: Reports unconfigured without SMTP vars and dispatches cleanly via pluggable transport without API keys', async () => {
    const prevSmtpHost = process.env.SMTP_HOST;
    const prevSmtpUser = process.env.SMTP_USER;
    const prevSmtpPass = process.env.SMTP_PASS;
    const dispatched: Array<{ to: string; subject: string; purpose: string }> = [];

    try {
      EmailDeliveryService.setTestTransport(null);
      delete process.env.SMTP_HOST;
      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASS;

      assert.equal(EmailDeliveryService.isConfigured(), false);
      assert.equal(EmailDeliveryService.getActiveProviderName(), 'UNCONFIGURED');

      const unconfiguredRes = await EmailDeliveryService.sendTransactionalEmail({
        to: 'patient@medicore-test.in',
        subject: 'MediCore Verification',
        text: 'Your code is 123456',
        purpose: 'EMAIL_VERIFICATION',
      });
      assert.equal(unconfiguredRes.configured, false);
      assert.equal(unconfiguredRes.delivered, false);
      assert.equal(unconfiguredRes.errorCode, 'EMAIL_PROVIDER_NOT_CONFIGURED');

      EmailDeliveryService.setTestTransport(async (msg) => {
        dispatched.push({ to: msg.to, subject: msg.subject, purpose: msg.purpose });
        return {
          delivered: true,
          configured: true,
          provider: 'TEST_TRANSPORT',
          messageId: 'local-msg-001',
          message: 'Dispatched via local transport',
        };
      });

      assert.equal(EmailDeliveryService.isConfigured(), true);
      assert.equal(EmailDeliveryService.getActiveProviderName(), 'TEST');

      const okResult = await EmailDeliveryService.sendTransactionalEmail({
        to: 'patient@medicore-test.in',
        subject: 'MediCore Verification',
        text: 'Your code is 123456',
        purpose: 'EMAIL_VERIFICATION',
      });

      assert.equal(okResult.configured, true);
      assert.equal(okResult.delivered, true);
      assert.equal(okResult.provider, 'CONFIGURED_TEST_TRANSPORT');
      assert.equal(okResult.messageId, 'local-msg-001');
      assert.equal(dispatched.length, 1);
      assert.equal(dispatched[0].to, 'patient@medicore-test.in');
    } finally {
      EmailDeliveryService.setTestTransport(null);
      if (prevSmtpHost === undefined) delete process.env.SMTP_HOST;
      else process.env.SMTP_HOST = prevSmtpHost;
      if (prevSmtpUser === undefined) delete process.env.SMTP_USER;
      else process.env.SMTP_USER = prevSmtpUser;
      if (prevSmtpPass === undefined) delete process.env.SMTP_PASS;
      else process.env.SMTP_PASS = prevSmtpPass;
    }
  });

  it('AppointmentScheduler Backend Flow: Self-registered patient discovers doctors, fetches slots, books, prevents double-booking, and cancels', async () => {
    const { accessToken } = await registerPatientAccount('scheduler');
    const authHeaders = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    const docsRes = await fetch(`${baseUrlA}/doctors`, { headers: authHeaders });
    assert.equal(docsRes.status, 200);
    const docsJson = (await docsRes.json()) as any;
    assert.ok(Array.isArray(docsJson.data) && docsJson.data.length > 0, 'Expected seeded doctors');

    const doctor = docsJson.data[0];
    assert.ok(doctor.hospitalName, 'Expected enriched hospitalName on doctor');

    const targetDate = getFutureDateIso(3);
    const availRes = await fetch(
      `${baseUrlA}/doctors/${encodeURIComponent(doctor.id)}/availability?date=${targetDate}`,
      { headers: authHeaders }
    );
    assert.equal(availRes.status, 200);
    const availJson = (await availRes.json()) as any;
    const openSlot = availJson.data.slots.find((s: any) => s.isAvailable);
    assert.ok(openSlot, 'Expected at least one open slot');

    // Book via POST /api/v1/appointments as a self-registered patient (activeHospitalId === null)
    const bookRes = await fetch(`${baseUrlA}/appointments`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        doctorId: doctor.id,
        appointmentDate: targetDate,
        slotStartTime: openSlot.slotStartTime,
        type: 'OPD',
        reasonForVisit: 'Annual preventive checkup',
      }),
    });
    assert.equal(bookRes.status, 201);
    const bookedJson = (await bookRes.json()) as any;
    assert.equal(bookedJson.data.status, 'CONFIRMED');
    assert.equal(bookedJson.data.doctorId, doctor.id);
    assert.ok(bookedJson.data.hospitalName);

    // Double-booking same slot must fail with 409 SLOT_ALREADY_BOOKED
    const dupRes = await fetch(`${baseUrlA}/appointments`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        doctorId: doctor.id,
        appointmentDate: targetDate,
        slotStartTime: openSlot.slotStartTime,
        type: 'OPD',
        reasonForVisit: 'Duplicate checkup',
      }),
    });
    assert.equal(dupRes.status, 409);

    // List appointments includes the booked appointment
    const listRes = await fetch(`${baseUrlA}/appointments`, { headers: authHeaders });
    assert.equal(listRes.status, 200);
    const listJson = (await listRes.json()) as any;
    assert.ok(listJson.data.some((a: any) => a.id === bookedJson.data.id));

    // Cancel appointment
    const cancelRes = await fetch(`${baseUrlA}/appointments/${bookedJson.data.id}/cancel`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ reason: 'Rescheduling' }),
    });
    assert.equal(cancelRes.status, 200);

    // Confirm clinicalStore shows CANCELLED
    assert.equal(clinicalStore.appointments.get(bookedJson.data.id)?.status, 'CANCELLED');
  });
});
