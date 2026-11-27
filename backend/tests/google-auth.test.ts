import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp } from '../src/app';
import { db } from '../src/database/prisma';
import { seedDatabaseIfEmpty } from '../src/database/seed';
import { setGoogleTokenVerifierForTest } from '../src/utils/firebaseToken';

let server: http.Server;
let baseUrl = '';

test.before(async () => {
  await seedDatabaseIfEmpty();
  const app = createApp();
  server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => {
    server.once('listening', () => resolve());
  });
  const addr = server.address();
  if (addr && typeof addr === 'object') {
    baseUrl = `http://127.0.0.1:${addr.port}`;
  }
});

test.after(async () => {
  setGoogleTokenVerifierForTest(null);
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
});

test('POST /api/v1/auth/google supports Google Sign-Up, Google Sign-In, bootstrap admin, and rejects unregistered/patient logins', async () => {
  const mockTokens = new Map<
    string,
    { uid: string; email: string; emailVerified: boolean; fullName: string; picture: string | null }
  >([
    [
      'valid-new-doctor-token-1234567890',
      {
        uid: 'firebase-uid-doc-1',
        email: 'dr.ananya.google@medicore.test',
        emailVerified: true,
        fullName: 'Dr. Ananya Roy',
        picture: null,
      },
    ],
    [
      'valid-bootstrap-admin-token-1234567890',
      {
        uid: 'firebase-uid-admin-1',
        email: 'nishant00511@gmail.com',
        emailVerified: true,
        fullName: 'Nishant Admin',
        picture: null,
      },
    ],
    [
      'valid-existing-patient-token-1234567890',
      {
        uid: 'firebase-uid-patient-1',
        email: 'patient.google@medicore.test',
        emailVerified: true,
        fullName: 'Test Patient',
        picture: null,
      },
    ],
  ]);

  setGoogleTokenVerifierForTest(async (token) => {
    const found = mockTokens.get(token);
    if (!found) {
      throw new Error('Unknown test token');
    }
    return found;
  });

  // 1. SIGN_IN with unregistered Google user returns 404 GOOGLE_ACCOUNT_NOT_FOUND
  const unregSignInRes = await fetch(`${baseUrl}/api/v1/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      idToken: 'valid-new-doctor-token-1234567890',
      mode: 'SIGN_IN',
    }),
  });
  assert.equal(unregSignInRes.status, 404);
  const unregBody = (await unregSignInRes.json()) as { error?: { code?: string } };
  assert.equal(unregBody.error?.code, 'GOOGLE_ACCOUNT_NOT_FOUND');

  // 2. SIGN_UP creates new verified DOCTOR staff account and issues tokens
  const signUpRes = await fetch(`${baseUrl}/api/v1/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      idToken: 'valid-new-doctor-token-1234567890',
      mode: 'SIGN_UP',
      role: 'DOCTOR',
      department: 'Cardiology',
      termsAccepted: true,
    }),
  });
  assert.equal(signUpRes.status, 201);
  const signUpBody = (await signUpRes.json()) as {
    success: boolean;
    data: {
      isNewAccount: boolean;
      accessToken: string;
      refreshToken: string;
      user: { email: string; isEmailVerified: boolean; activeRoles: string[] };
    };
  };
  assert.equal(signUpBody.success, true);
  assert.equal(signUpBody.data.isNewAccount, true);
  assert.equal(signUpBody.data.user.email, 'dr.ananya.google@medicore.test');
  assert.equal(signUpBody.data.user.isEmailVerified, true);
  assert.ok(signUpBody.data.user.activeRoles.includes('DOCTOR'));
  assert.ok(signUpBody.data.accessToken.length > 20);

  // 3. Subsequent SIGN_IN with the same Google account succeeds with 200
  const signInRes = await fetch(`${baseUrl}/api/v1/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      idToken: 'valid-new-doctor-token-1234567890',
      mode: 'SIGN_IN',
      role: 'DOCTOR',
    }),
  });
  assert.equal(signInRes.status, 200);
  const signInBody = (await signInRes.json()) as {
    data: { isNewAccount: boolean; accessToken: string };
  };
  assert.equal(signInBody.data.isNewAccount, false);
  assert.ok(signInBody.data.accessToken.length > 20);

  // 4. Bootstrap admin auto-provisions SUPER_ADMIN on SIGN_IN
  const adminRes = await fetch(`${baseUrl}/api/v1/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      idToken: 'valid-bootstrap-admin-token-1234567890',
      mode: 'SIGN_IN',
    }),
  });
  assert.equal(adminRes.status, 201);
  const adminBody = (await adminRes.json()) as {
    data: { user: { globalRoles: string[]; email: string } };
  };
  assert.equal(adminBody.data.user.email, 'nishant00511@gmail.com');
  assert.ok(adminBody.data.user.globalRoles.includes('SUPER_ADMIN'));

  // 5. Patient-only Google email is blocked from web console login
  const patId = 'pat-google-block-test';
  db.users.set(patId, {
    id: patId,
    fullName: 'Test Patient',
    email: 'patient.google@medicore.test',
    phone: null,
    passwordHash: null,
    isEmailVerified: true,
    isPhoneVerified: false,
    isActive: true,
    activeHospitalId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  db.userRoles.set('role-pat-google-block', {
    id: 'role-pat-google-block',
    userId: patId,
    roleCode: 'PATIENT',
    hospitalId: null,
    membershipId: null,
    assignedAt: new Date(),
  });

  const patientBlockedRes = await fetch(`${baseUrl}/api/v1/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      idToken: 'valid-existing-patient-token-1234567890',
      mode: 'SIGN_IN',
    }),
  });
  assert.equal(patientBlockedRes.status, 403);
  const patientBlockedBody = (await patientBlockedRes.json()) as { error?: { code?: string } };
  assert.equal(patientBlockedBody.error?.code, 'WEB_STAFF_ONLY');
});
