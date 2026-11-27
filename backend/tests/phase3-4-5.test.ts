process.env.DISABLE_AUTH_RATE_LIMIT_FOR_TEST = 'true';
import { describe, it, before, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import http from 'http';
import { createApp } from '../src/app';
import { db } from '../src/database/prisma';
import { seedDatabaseIfEmpty } from '../src/database/seed';
import { clinicalStore } from '../src/modules/clinical/clinical.service';
import { opsStore } from '../src/modules/operations/operations.service';
import { directoryStore } from '../src/modules/directory/directory.service';
import { EmailDeliveryService } from '../src/utils/email';
import { SmsOtpDeliveryService } from '../src/utils/sms';
import { env } from '../src/config/env';

function buildMinimalValidPng(): Buffer {
  // Valid PNG signature + minimal IHDR + IEND bytes for magic-byte & size validation
  return Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
    0x89, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e,
    0x44, 0xae, 0x42, 0x60, 0x82,
  ]);
}

describe('MediCore Phases 3, 4 & 5: Patient Auth, Onboarding/Profile & Home Dashboard', () => {
  let server: http.Server;
  let baseUrl: string;
  let sentSms: Array<{ to: string; otpCode: string; purpose: 'LOGIN' | 'REGISTER' }> = [];

  const testHospitalId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

  before(async () => {
    db.reset();
    clinicalStore.reset();
    opsStore.reset();
    directoryStore.records.clear();
    await seedDatabaseIfEmpty();

    db.hospitals.set(testHospitalId, {
      id: testHospitalId,
      name: 'Apex Heart & Multi-Specialty Institute',
      slug: 'apex-heart',
      category: 'SUPER_SPECIALTY',
      status: 'ACTIVE',
      address: 'Kanke Road, Near Rock Garden',
      city: 'Ranchi',
      state: 'Jharkhand',
      pincode: '834008',
      primaryPhone: '+91 651 223 4455',
      officialEmail: 'contact@apexheart.in',
      clinicalLicenseNumber: 'CEA-JHK-2026-099',
      totalBeds: 300,
      departments: ['Cardiology', 'Neurology', 'General Medicine'],
      about: 'Tertiary care hospital',
      operatingHours: '24x7 Emergency & OPD 08:00-20:00',
      cancellationPolicyHours: 4,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address() as any;
        baseUrl = `http://127.0.0.1:${address.port}/api/v1`;
        resolve();
      });
    });
  });

  afterEach(() => {
    SmsOtpDeliveryService.setTestTransport(null);
    EmailDeliveryService.setTestTransport(null);
    sentSms = [];
  });

  after(async () => {
    SmsOtpDeliveryService.setTestTransport(null);
    EmailDeliveryService.setTestTransport(null);
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('Phase 3.1: Rejects privileged role injection, invalid OTP, missing terms, duplicate phone, and registers via Phone + OTP without password', async () => {
    // 0. Unconfigured SMS provider in test env reports honestly without exposing devOtpPreview
    const unconfRes = await fetch(`${baseUrl}/auth/patient/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '+919876500001', purpose: 'REGISTER' }),
    });
    assert.equal(unconfRes.status, 200);
    const unconfBody = await unconfRes.json();
    assert.equal(unconfBody.data.smsDeliveryConfigured, false);
    assert.equal(unconfBody.data.otpSent, false);
    assert.equal(unconfBody.data.devOtpPreview, undefined, 'Must never expose OTP preview in test/production');

    // Backdate/clear unconfigured OTP so test transport flow can request cleanly
    db.phoneOtps.clear();
    SmsOtpDeliveryService.setTestTransport(async (req) => {
      sentSms.push({ to: req.to, otpCode: req.otpCode, purpose: req.purpose });
      return { messageId: `sms-${sentSms.length}` };
    });

    const otpReq = await fetch(`${baseUrl}/auth/patient/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '+919876500001', purpose: 'REGISTER' }),
    });
    assert.equal(otpReq.status, 200);
    const otpReqBody = await otpReq.json();
    assert.equal(otpReqBody.data.smsDeliveryConfigured, true);
    assert.equal(otpReqBody.data.otpSent, true);
    assert.equal(otpReqBody.data.devOtpPreview, undefined);
    assert.equal(sentSms.length, 1);
    const validOtp = sentSms[0].otpCode;
    assert.match(validOtp, /^\d{6}$/);

    // 1. Privileged role attempt rejected (403)
    const privRes = await fetch(`${baseUrl}/auth/patient/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Hacker User',
        phone: '+919876500001',
        otpCode: validOtp,
        termsAccepted: true,
        role: 'HOSPITAL_ADMIN',
      }),
    });
    assert.equal(privRes.status, 403);
    const privBody = await privRes.json();
    assert.equal(privBody.error.code, 'PRIVILEGED_ROLE_NOT_ALLOWED');

    // 2. Wrong OTP rejected (400)
    const badOtpRes = await fetch(`${baseUrl}/auth/patient/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Test Patient',
        phone: '+919876500001',
        otpCode: '000000',
        termsAccepted: true,
      }),
    });
    assert.equal(badOtpRes.status, 400);

    // 3. Terms not accepted rejected (400)
    const noTermsRes = await fetch(`${baseUrl}/auth/patient/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Test Patient',
        phone: '+919876500001',
        otpCode: validOtp,
        termsAccepted: false,
      }),
    });
    assert.equal(noTermsRes.status, 400);

    // 4. Valid Phone + OTP registration creates passwordless verified patient
    const okRes = await fetch(`${baseUrl}/auth/patient/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Nishant Kumar',
        phone: '9876500001', // 10-digit Indian mobile -> normalizes to +919876500001
        otpCode: validOtp,
        dateOfBirth: '1994-05-12',
        gender: 'Male',
        termsAccepted: true,
      }),
    });
    assert.equal(okRes.status, 201);
    const okBody = await okRes.json();
    assert.deepEqual(okBody.data.user.globalRoles, ['PATIENT']);
    assert.equal(okBody.data.user.activeHospitalId, null, 'Patient must NOT be auto-linked to any hospital');
    assert.equal(okBody.data.user.phone, '+919876500001');
    assert.equal(okBody.data.user.isPhoneVerified, true);
    assert.equal(okBody.data.phoneVerified, true);

    const storedUser = db.users.get(okBody.data.user.id);
    assert.ok(storedUser);
    assert.equal(storedUser.passwordHash, null, 'Phone+OTP users have no passwordHash');

    // 5. Duplicate phone rejected (409) on both OTP request and register
    const dupOtpReq = await fetch(`${baseUrl}/auth/patient/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '+919876500001', purpose: 'REGISTER' }),
    });
    assert.equal(dupOtpReq.status, 409);

    const dupPhoneRes = await fetch(`${baseUrl}/auth/patient/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Another User',
        phone: '+919876500001',
        otpCode: '123456',
        termsAccepted: true,
      }),
    });
    assert.equal(dupPhoneRes.status, 409);
  });

  it('Phase 3.2: Supports Phone + OTP login, blocks staff on /auth/patient/otp/verify, enforces refresh token rotation & reuse detection, logout & logout-all', async () => {
    SmsOtpDeliveryService.setTestTransport(async (req) => {
      sentSms.push({ to: req.to, otpCode: req.otpCode, purpose: req.purpose });
      return { messageId: `sms-${sentSms.length}` };
    });

    // Seed a staff-only user (DOCTOR)
    const staffId = crypto.randomUUID();
    db.users.set(staffId, {
      id: staffId,
      fullName: 'Dr. Staff Member',
      email: 'dr.staff@medicore.in',
      phone: '+919800000010',
      passwordHash: null,
      isEmailVerified: false,
      isPhoneVerified: true,
      isActive: true,
      activeHospitalId: testHospitalId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    db.userRoles.set(crypto.randomUUID(), {
      id: crypto.randomUUID(),
      userId: staffId,
      roleCode: 'DOCTOR',
      hospitalId: testHospitalId,
      membershipId: null,
      assignedAt: new Date(),
    });

    // Staff blocked on Android patient-only OTP verification endpoint
    await fetch(`${baseUrl}/auth/patient/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '+919800000010', purpose: 'LOGIN' }),
    });
    const staffOtp1 = sentSms[sentSms.length - 1].otpCode;

    const staffBlockedRes = await fetch(`${baseUrl}/auth/patient/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: '+919800000010',
        otpCode: staffOtp1,
      }),
    });
    assert.equal(staffBlockedRes.status, 403);
    const staffBlockedBody = await staffBlockedRes.json();
    assert.equal(staffBlockedBody.error.code, 'PATIENT_ROLE_REQUIRED');

    // Web staff login on /auth/otp/verify succeeds (prior OTP was consumed before role check, so fresh request works immediately)
    await fetch(`${baseUrl}/auth/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '+919800000010', purpose: 'LOGIN' }),
    });
    const staffOtp2 = sentSms[sentSms.length - 1].otpCode;

    const staffWebRes = await fetch(`${baseUrl}/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: '+919800000010',
        otpCode: staffOtp2,
      }),
    });
    assert.equal(staffWebRes.status, 200);

    // Patient logs in with mobile number + OTP
    await fetch(`${baseUrl}/auth/patient/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '+919876500001', purpose: 'LOGIN' }),
    });
    const pOtp1 = sentSms[sentSms.length - 1].otpCode;

    const phoneLoginRes = await fetch(`${baseUrl}/auth/patient/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: '+919876500001',
        otpCode: pOtp1,
        deviceInfo: 'Pixel 8 Pro',
      }),
    });
    assert.equal(phoneLoginRes.status, 200);
    const session1 = await phoneLoginRes.json();
    const rt1 = session1.data.refreshToken;

    // Refresh token rotates rt1 -> rt2
    const refresh1 = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: rt1 }),
    });
    assert.equal(refresh1.status, 200);
    const refreshedData = await refresh1.json();
    const rt2 = refreshedData.data.refreshToken;
    assert.notEqual(rt1, rt2);

    // Reuse detection: replaying old rt1 must fail AND revoke the whole token family (including rt2!)
    const replayRes = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: rt1 }),
    });
    assert.equal(replayRes.status, 401);

    const rt2AfterReplay = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: rt2 }),
    });
    assert.equal(rt2AfterReplay.status, 401, 'Entire refresh token family must be revoked after reuse detection');

    // Create two fresh sessions then test logout-all
    await fetch(`${baseUrl}/auth/patient/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '+919876500001', purpose: 'LOGIN' }),
    });
    const sA = await (
      await fetch(`${baseUrl}/auth/patient/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '+919876500001', otpCode: sentSms[sentSms.length - 1].otpCode }),
      })
    ).json();

    await fetch(`${baseUrl}/auth/patient/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '+919876500001', purpose: 'LOGIN' }),
    });
    const sB = await (
      await fetch(`${baseUrl}/auth/patient/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '+919876500001', otpCode: sentSms[sentSms.length - 1].otpCode }),
      })
    ).json();

    const logoutAllRes = await fetch(`${baseUrl}/auth/logout-all`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${sA.data.accessToken}` },
    });
    assert.equal(logoutAllRes.status, 200);

    // Session B refresh token is now revoked
    const refreshAfterAll = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: sB.data.refreshToken }),
    });
    assert.equal(refreshAfterAll.status, 401);
  });

  it('Phase 3.3: Enforces OTP resend cooldown, invalidates OTP after MAX_OTP_ATTEMPTS, and allows fresh OTP issuance', async () => {
    SmsOtpDeliveryService.setTestTransport(async (req) => {
      sentSms.push({ to: req.to, otpCode: req.otpCode, purpose: req.purpose });
      return { messageId: `sms-${sentSms.length}` };
    });

    const otpReq1 = await fetch(`${baseUrl}/auth/patient/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '+919876500002', purpose: 'REGISTER' }),
    });
    assert.equal(otpReq1.status, 200);
    assert.equal(sentSms.length, 1);
    const firstOtp = sentSms[0].otpCode;

    // Immediate resend hits cooldown (429)
    const cooldownRes = await fetch(`${baseUrl}/auth/patient/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '+919876500002', purpose: 'REGISTER' }),
    });
    assert.equal(cooldownRes.status, 429);
    const cooldownBody = await cooldownRes.json();
    assert.equal(cooldownBody.error.code, 'OTP_RESEND_COOLDOWN');

    // Exceed MAX_OTP_ATTEMPTS with wrong codes during registration
    for (let i = 0; i < env.MAX_OTP_ATTEMPTS; i++) {
      const failAttempt = await fetch(`${baseUrl}/auth/patient/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Meera Iyer',
          phone: '+919876500002',
          otpCode: '999999',
          termsAccepted: true,
        }),
      });
      assert.equal(failAttempt.status, 400);
    }

    // Even the previously valid OTP is now invalidated after MAX_OTP_ATTEMPTS
    const invalidatedRes = await fetch(`${baseUrl}/auth/patient/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Meera Iyer',
        phone: '+919876500002',
        otpCode: firstOtp,
        termsAccepted: true,
      }),
    });
    assert.equal(invalidatedRes.status, 400);

    // Request fresh OTP & complete registration
    const otpReq2 = await fetch(`${baseUrl}/auth/patient/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '+919876500002', purpose: 'REGISTER' }),
    });
    assert.equal(otpReq2.status, 200);
    const freshOtp = sentSms[1].otpCode;

    const regOk = await fetch(`${baseUrl}/auth/patient/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Meera Iyer',
        phone: '+919876500002',
        otpCode: freshOtp,
        termsAccepted: true,
      }),
    });
    assert.equal(regOk.status, 201);

    // Verify old registration OTP cannot be reused for login
    const replayLogin = await fetch(`${baseUrl}/auth/patient/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '+919876500002', otpCode: freshOtp }),
    });
    assert.equal(replayLogin.status, 401);

    // Fresh LOGIN OTP works
    const loginOtpReq = await fetch(`${baseUrl}/auth/patient/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '+919876500002', purpose: 'LOGIN' }),
    });
    assert.equal(loginOtpReq.status, 200);
    const loginOtp = sentSms[sentSms.length - 1].otpCode;

    const newLoginOk = await fetch(`${baseUrl}/auth/patient/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '+919876500002', otpCode: loginOtp }),
    });
    assert.equal(newLoginOk.status, 200);
  });

  it('Phase 4 & 5: Profile CRUD, immutable contacts, postal validation, consent-gated health info, multipart photo upload/fetch/delete & real Home Dashboard', async () => {
    SmsOtpDeliveryService.setTestTransport(async (req) => {
      sentSms.push({ to: req.to, otpCode: req.otpCode, purpose: req.purpose });
      return { messageId: `sms-${sentSms.length}` };
    });

    // Log in Nishant with Phone + OTP
    await fetch(`${baseUrl}/auth/patient/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '+919876500001', purpose: 'LOGIN' }),
    });
    const nishantOtp = sentSms[sentSms.length - 1].otpCode;

    const loginRes = await fetch(`${baseUrl}/auth/patient/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '+919876500001', otpCode: nishantOtp }),
    });
    assert.equal(loginRes.status, 200);
    const loginData = await loginRes.json();
    const token = loginData.data.accessToken;

    // Register a second patient to test isolation
    await fetch(`${baseUrl}/auth/patient/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '+919876500003', purpose: 'REGISTER' }),
    });
    const rohanOtp = sentSms[sentSms.length - 1].otpCode;

    const secondReg = await fetch(`${baseUrl}/auth/patient/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Rohan Das',
        phone: '+919876500003',
        otpCode: rohanOtp,
        termsAccepted: true,
      }),
    });
    assert.equal(secondReg.status, 201);
    const secondToken = (await secondReg.json()).data.accessToken;

    // 1. Personal info cannot alter verified phone silently
    const phoneChangeBlocked = await fetch(`${baseUrl}/patient/profile/personal`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Nishant Kumar',
        phone: '+919876599999',
      }),
    });
    assert.equal(phoneChangeBlocked.status, 403);

    // 2. Country-aware postal code validation rejects bad Indian PIN
    const badPinRes = await fetch(`${baseUrl}/patient/profile/address`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        street: '14 Lalpur Main Road',
        city: 'Ranchi',
        state: 'Jharkhand',
        postalCode: '000',
        country: 'India',
      }),
    });
    assert.equal(badPinRes.status, 400);

    // Valid Indian PIN saves
    const goodAddrRes = await fetch(`${baseUrl}/patient/profile/address`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        houseNumber: '42-B',
        street: 'Lalpur Main Road',
        locality: 'Lalpur',
        city: 'Ranchi',
        state: 'Jharkhand',
        postalCode: '834001',
        country: 'India',
      }),
    });
    assert.equal(goodAddrRes.status, 200);

    // 3. Emergency contact rejects same phone as patient login phone
    const samePhoneEc = await fetch(`${baseUrl}/patient/profile/emergency-contacts`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Self',
        phone: '+919876500001',
        relationship: 'Self',
      }),
    });
    assert.equal(samePhoneEc.status, 400);

    // Distinct emergency contact succeeds & creates completion = 100% WITHOUT optional health/photo!
    const validEc = await fetch(`${baseUrl}/patient/profile/emergency-contacts`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Anjali Kumar',
        phone: '+919876500088',
        relationship: 'Spouse',
        isPrimary: true,
      }),
    });
    assert.equal(validEc.status, 201);
    const ecBody = await validEc.json();
    assert.equal(ecBody.data.profile.profileCompletion.percent, 100);
    assert.equal(ecBody.data.profile.profileCompletion.isComplete, true);
    const ecId = ecBody.data.contact.id;

    // Cross-patient emergency contact delete must be blocked (403)
    const crossDeleteEc = await fetch(`${baseUrl}/patient/profile/emergency-contacts/${ecId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${secondToken}` },
    });
    assert.equal(crossDeleteEc.status, 403);

    // Onboarding complete succeeds once required sections exist
    const onboardingRes = await fetch(`${baseUrl}/patient/onboarding/complete`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(onboardingRes.status, 200);
    const onboardingBody = await onboardingRes.json();
    assert.equal(onboardingBody.data.patient.onboardingCompleted, true);

    // 4. Optional health information requires explicit consentGranted = true
    const noConsentHealth = await fetch(`${baseUrl}/patient/profile/health-information`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        consentGranted: false,
        bloodGroup: 'B+',
        knownAllergies: ['Penicillin'],
      }),
    });
    assert.equal(noConsentHealth.status, 400);

    const consentHealth = await fetch(`${baseUrl}/patient/profile/health-information`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        consentGranted: true,
        bloodGroup: 'B+',
        knownAllergies: ['Penicillin'],
        existingConditions: ['Asthma'],
        currentMedications: ['Salbutamol inhaler'],
      }),
    });
    assert.equal(consentHealth.status, 200);
    const healthBody = await consentHealth.json();
    assert.equal(healthBody.data.healthInformation.bloodGroup, 'B+');
    assert.equal(healthBody.data.healthInformation.consentGranted, true);

    // 5. Profile Photo Upload rejects spoofed/corrupt MIME bytes and accepts genuine PNG multipart
    const spoofedForm = new FormData();
    spoofedForm.append('photo', new Blob([Buffer.from('<html>not an image</html>')], { type: 'image/png' }), 'evil.png');
    const badPhotoRes = await fetch(`${baseUrl}/patient/profile/photo`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: spoofedForm,
    });
    assert.equal(badPhotoRes.status, 400);

    const realPngForm = new FormData();
    realPngForm.append('photo', new Blob([buildMinimalValidPng()], { type: 'image/png' }), 'avatar.png');
    const goodPhotoRes = await fetch(`${baseUrl}/patient/profile/photo`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: realPngForm,
    });
    assert.equal(goodPhotoRes.status, 200);
    const photoMeta = await goodPhotoRes.json();
    assert.equal(photoMeta.data.profilePhoto.mimeType, 'image/png');

    // Fetch uploaded photo privately with Bearer token; unauthenticated blocked with 401
    const unauthPhotoGet = await fetch(`${baseUrl}/patient/profile/photo`);
    assert.equal(unauthPhotoGet.status, 401);

    const authPhotoGet = await fetch(`${baseUrl}/patient/profile/photo`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(authPhotoGet.status, 200);
    assert.equal(authPhotoGet.headers.get('content-type'), 'image/png');

    // 6. Phase 5 Home Dashboard returns genuine database state & empty clinical lists (no fake 94/100 or dummy records)
    const dashRes = await fetch(`${baseUrl}/patient/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(dashRes.status, 200);
    const dashBody = await dashRes.json();
    assert.equal(dashBody.data.patient.firstName, 'Nishant');
    assert.equal(dashBody.data.patient.hasProfilePhoto, true);
    assert.equal(dashBody.data.healthOverview.bloodGroup, 'B+');
    assert.deepEqual(dashBody.data.healthOverview.knownAllergies, ['Penicillin']);
    assert.equal(dashBody.data.nextAppointment, null);
    assert.equal(dashBody.data.recentPrescriptions.length, 0);
    assert.equal(dashBody.data.recentLabReports.length, 0);
    assert.ok(dashBody.data.recentActivities.length >= 4);

    // Other patient sees clean isolated dashboard without Nishant's health data
    const otherDashRes = await fetch(`${baseUrl}/patient/dashboard`, {
      headers: { Authorization: `Bearer ${secondToken}` },
    });
    assert.equal(otherDashRes.status, 200);
    const otherDashBody = await otherDashRes.json();
    assert.equal(otherDashBody.data.patient.firstName, 'Rohan');
    assert.equal(otherDashBody.data.healthOverview.bloodGroup, null);
    assert.equal(otherDashBody.data.healthOverview.knownAllergies.length, 0);

    // Clean up photo file on disk via delete endpoint
    const delPhotoRes = await fetch(`${baseUrl}/patient/profile/photo`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(delPhotoRes.status, 200);
  });
});
