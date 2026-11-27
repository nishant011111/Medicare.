import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import http from 'http';
import os from 'os';
import path from 'path';
import { createApp } from '../src/app';
import { db } from '../src/database/prisma';
import { seedDatabaseIfEmpty } from '../src/database/seed';
import { clinicalStore } from '../src/modules/clinical/clinical.service';
import { opsStore } from '../src/modules/operations/operations.service';
import { directoryStore } from '../src/modules/directory/directory.service';
import { securityStore } from '../src/modules/security/security.service';
import { saasStore } from '../src/modules/saas/saas.service';
import { aiStore } from '../src/modules/ai/ai.service';
import {
  loadPersistedDatabase,
  persistDatabaseNow,
} from '../src/database/persistence';
import { EmailDeliveryService } from '../src/utils/email';

describe('Unified Web & Android Backend + Persistent Database', () => {
  let server: http.Server;
  let baseUrl: string;
  let tmpSnapshotPath: string;
  const capturedEmails: Array<{ to: string; subject: string; text: string }> = [];

  before(async () => {
    db.reset();
    clinicalStore.reset();
    opsStore.reset();
    directoryStore.records.clear();
    securityStore.reset();
    saasStore.resetPlansOnly();
    aiStore.conversations.clear();
    await seedDatabaseIfEmpty();

    EmailDeliveryService.setTestTransport(async (msg) => {
      capturedEmails.push({ to: msg.to, subject: msg.subject, text: msg.text });
      return { delivered: true, provider: 'TEST_CAPTURE' };
    });

    tmpSnapshotPath = path.join(os.tmpdir(), `medicore-unified-test-${Date.now()}.json`);
    const app = createApp();
    server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  after(async () => {
    EmailDeliveryService.setTestTransport(null);
    await new Promise<void>((resolve) => server.close(() => resolve()));
    try {
      if (fs.existsSync(tmpSnapshotPath)) {
        fs.unlinkSync(tmpSnapshotPath);
      }
    } catch {
      // ignore cleanup error
    }
  });

  it('exposes unified backend & shared Firestore database metadata in /health/ready', async () => {
    const res = await fetch(`${baseUrl}/health/ready`);
    const body = (await res.json()) as any;
    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.unifiedBackend, true);
    assert.ok(Array.isArray(body.sharedClients));
    assert.ok(body.sharedClients.includes('WEB_STAFF_CONSOLE'));
    assert.ok(body.sharedClients.includes('ANDROID_PATIENT_APP'));
    assert.equal(body.firestoreProjectId, 'bionic-realm-pt8c4');
    assert.equal(
      body.firestoreDatabaseId,
      'ai-studio-medicare-8567e0e2-d4bb-4849-9f8b-f0a01b6a07e0'
    );
  });

  it('persists records created via Android Patient & Web Staff flows across full in-memory reset/restart', async () => {
    // 1. Register/Sign in a patient via Android patient OTP flow (request -> verify)
    const otpReq = await fetch(`${baseUrl}/api/v1/auth/patient/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailOrPhone: 'aarav.shared@medicore.in',
        channel: 'EMAIL',
      }),
    });
    assert.equal(otpReq.status, 200);
    const emailPayload = capturedEmails.find((e) => e.to === 'aarav.shared@medicore.in');
    assert.ok(emailPayload, 'Expected OTP email to be delivered via EmailDeliveryService');
    const otpMatch = emailPayload.text.match(/\b(\d{6})\b/);
    assert.ok(otpMatch, 'Expected 6-digit OTP code in delivered email');
    const otpCode = otpMatch[1];

    const otpVerify = await fetch(`${baseUrl}/api/v1/auth/patient/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailOrPhone: 'aarav.shared@medicore.in',
        otpCode,
        channel: 'EMAIL',
      }),
    });
    const otpVerifyBody = (await otpVerify.json()) as any;
    assert.equal(otpVerify.status, 200);
    const patientUserId = otpVerifyBody.data.user.id;
    const patientToken = otpVerifyBody.data.accessToken;

    // 2. Update patient profile personal info & address from Android app
    const personalRes = await fetch(`${baseUrl}/api/v1/patient/profile/personal`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${patientToken}`,
      },
      body: JSON.stringify({
        fullName: 'Aarav Shared Patient',
        dateOfBirth: '1995-05-12',
        gender: 'Male',
      }),
    });
    assert.equal(personalRes.status, 200);

    const addressRes = await fetch(`${baseUrl}/api/v1/patient/profile/address`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${patientToken}`,
      },
      body: JSON.stringify({
        street: '14 Main Road',
        city: 'Ranchi',
        state: 'Jharkhand',
        postalCode: '834001',
        country: 'India',
      }),
    });
    assert.equal(addressRes.status, 200);

    // 3. Flush unified database to disk snapshot
    const persisted = persistDatabaseNow(tmpSnapshotPath);
    assert.equal(persisted, true);
    assert.equal(fs.existsSync(tmpSnapshotPath), true);

    // 4. Simulate a full server crash / process restart (wipe all RAM stores)
    db.reset();
    clinicalStore.reset();
    opsStore.reset();
    directoryStore.records.clear();
    assert.equal(db.users.has(patientUserId), false);
    assert.equal(directoryStore.records.size, 0);

    // 5. Hydrate from disk snapshot & run boot seed (must NOT wipe hydrated records!)
    const hydrated = loadPersistedDatabase(tmpSnapshotPath);
    assert.equal(hydrated, true);
    await seedDatabaseIfEmpty();

    // 6. Verify patient user, address, and 29 Ranchi hospitals survived the restart intact
    assert.equal(db.users.has(patientUserId), true);
    assert.equal(db.users.get(patientUserId)?.email, 'aarav.shared@medicore.in');
    assert.ok(db.users.get(patientUserId)?.createdAt instanceof Date);
    assert.equal(directoryStore.records.size, 29);

    const profileAfterRestart = await fetch(`${baseUrl}/api/v1/patient/profile`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const profileBody = (await profileAfterRestart.json()) as any;
    assert.equal(profileAfterRestart.status, 200);
    assert.equal(profileBody.data.user.fullName, 'Aarav Shared Patient');
    assert.equal(profileBody.data.address?.city, 'Ranchi');
  });
});
