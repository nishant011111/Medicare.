process.env.DISABLE_AUTH_RATE_LIMIT_FOR_TEST = 'true';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import http from 'http';
import { createApp } from '../src/app';
import { db } from '../src/database/prisma';
import { seedDatabaseIfEmpty } from '../src/database/seed';
import { clinicalStore } from '../src/modules/clinical/clinical.service';
import { opsStore } from '../src/modules/operations/operations.service';
import { directoryStore } from '../src/modules/directory/directory.service';
import { StructuredLogger } from '../src/modules/security/security.service';
import { SmsOtpDeliveryService } from '../src/utils/sms';

function dateOffset(daysOffset: number): string {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysOffset));
  return d.toISOString().slice(0, 10);
}

describe('MediCore Phase 10: Medicine Reminders & Medication Tracking', () => {
  let server: http.Server;
  let baseUrl: string;

  const hospitalId = '11111111-1111-4111-8111-111111111111';
  const doctorId = '33333333-3333-4333-8333-333333333333';

  let patient1Token: string;
  let patient1UserId: string;
  let patient2Token: string;

  const activeRxId = 'rx-p10-active-01';
  const activeMedItemId = 'med-p10-telmisartan';
  const activeMedItem2Id = 'med-p10-metformin';
  const completedRxId = 'rx-p10-completed-02';
  const completedMedItemId = 'med-p10-azithromycin';
  const discontinuedRxId = 'rx-p10-cancelled-03';
  const discontinuedMedItemId = 'med-p10-ibuprofen';

  let createdReminderId: string;
  let secondReminderId: string;
  let recordedDoseId: string;

  before(async () => {
    db.reset();
    clinicalStore.reset();
    opsStore.reset();
    directoryStore.records.clear();
    await seedDatabaseIfEmpty();

    db.hospitals.set(hospitalId, {
      id: hospitalId,
      name: 'Rajendra Institute of Medical Sciences (RIMS)',
      registrationNumber: 'CEA-JHK-001',
      category: 'TEACHING_HOSPITAL',
      logoUrl: null,
      address: 'Bariatu Road',
      city: 'Ranchi',
      state: 'Jharkhand',
      contactEmail: 'care@rimsranchi.ac.in',
      contactPhone: '+91-651-2541533',
      totalBeds: 1200,
      availableBeds: 220,
      status: 'ACTIVE',
      departments: ['Cardiology', 'Endocrinology', 'General Medicine'],
      createdByUserId: null,
      approvedByUserId: null,
      approvedAt: new Date(),
      rejectionReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    clinicalStore.doctors.set(doctorId, {
      id: doctorId,
      userId: crypto.randomUUID(),
      fullName: 'Dr. Arvind Choudhary',
      medicalLicenseNumber: 'MCI-JHK-9901',
      qualification: 'MBBS, MD, DM (Cardiology)',
      specialization: 'Cardiology',
      experienceYears: 15,
      hospitalId,
      departmentId: 'dept-cardio',
      departmentName: 'Cardiology',
      slotDurationMinutes: 30,
      verificationStatus: 'VERIFIED',
    });

    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as { port: number };
        baseUrl = `http://127.0.0.1:${addr.port}/api`;
        resolve();
      });
    });

    const sentOtps = new Map<string, string>();
    SmsOtpDeliveryService.setTestTransport(async (req) => {
      sentOtps.set(req.to, req.otpCode);
      return { messageId: `p10-${Date.now()}` };
    });

    // Register Patient 1 & Patient 2 via Phone + OTP patient auth endpoints
    const otp1Res = await fetch(`${baseUrl}/auth/patient/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '+919876500110', purpose: 'REGISTER' }),
    });
    assert.equal(otp1Res.status, 200);
    const otp1 = sentOtps.get('+919876500110')!;
    assert.ok(otp1);

    const reg1 = await fetch(`${baseUrl}/auth/patient/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Aarav Sharma',
        phone: '+919876500110',
        otpCode: otp1,
        termsAccepted: true,
      }),
    });
    const reg1Body = await reg1.json();
    assert.equal(reg1.status, 201);
    patient1Token = reg1Body.data.accessToken;
    patient1UserId = reg1Body.data.user.id;

    const otp2Res = await fetch(`${baseUrl}/auth/patient/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '+919876500220', purpose: 'REGISTER' }),
    });
    assert.equal(otp2Res.status, 200);
    const otp2 = sentOtps.get('+919876500220')!;
    assert.ok(otp2);

    const reg2 = await fetch(`${baseUrl}/auth/patient/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Priya Verma',
        phone: '+919876500220',
        otpCode: otp2,
        termsAccepted: true,
      }),
    });
    const reg2Body = await reg2.json();
    assert.equal(reg2.status, 201);
    patient2Token = reg2Body.data.accessToken;

    const p1Profile = Array.from(db.patientProfiles.values()).find((p) => p.userId === patient1UserId)!;

    // Seed Active, Completed & Discontinued prescriptions issued by Dr. Choudhary
    clinicalStore.prescriptions.set(activeRxId, {
      id: activeRxId,
      prescriptionNumber: 'RX-2026-1001',
      patientId: p1Profile.id,
      doctorId,
      hospitalId,
      encounterId: 'enc-p10-01',
      status: 'SIGNED',
      signedAt: `${dateOffset(-2)}T09:30:00.000Z`,
      items: [
        {
          id: activeMedItemId,
          medicineName: 'Telmisartan',
          strength: '40 mg',
          dosage: '1 tablet',
          route: 'Oral',
          frequency: 'Once daily',
          durationDays: 30,
          quantity: 30,
          instructions: 'Take after morning meal with water',
          specialInstructions: 'Monitor home blood pressure weekly; avoid potassium supplements unless advised.',
          startDate: dateOffset(-2),
          endDate: dateOffset(27),
        },
        {
          id: activeMedItem2Id,
          medicineName: 'Metformin SR',
          strength: '500 mg',
          dosage: '1 tablet',
          route: 'Oral',
          frequency: 'Twice daily',
          durationDays: 30,
          quantity: 60,
          instructions: 'Take immediately after breakfast and dinner',
          specialInstructions: 'Do not crush sustained-release tablet.',
          startDate: dateOffset(-2),
          endDate: dateOffset(27),
        },
      ],
    });

    clinicalStore.prescriptions.set(completedRxId, {
      id: completedRxId,
      prescriptionNumber: 'RX-2026-0915',
      patientId: p1Profile.id,
      doctorId,
      hospitalId,
      encounterId: 'enc-p10-02',
      status: 'DISPENSED',
      signedAt: `${dateOffset(-20)}T11:00:00.000Z`,
      items: [
        {
          id: completedMedItemId,
          medicineName: 'Azithromycin',
          strength: '500 mg',
          dosage: '1 tablet',
          route: 'Oral',
          frequency: 'Once daily',
          durationDays: 5,
          quantity: 5,
          instructions: 'Complete the full 5-day course',
          startDate: dateOffset(-20),
          endDate: dateOffset(-16),
        },
      ],
    });

    clinicalStore.prescriptions.set(discontinuedRxId, {
      id: discontinuedRxId,
      prescriptionNumber: 'RX-2026-0988',
      patientId: p1Profile.id,
      doctorId,
      hospitalId,
      encounterId: 'enc-p10-03',
      status: 'CANCELLED',
      signedAt: `${dateOffset(-10)}T14:00:00.000Z`,
      items: [
        {
          id: discontinuedMedItemId,
          medicineName: 'Ibuprofen',
          strength: '400 mg',
          dosage: '1 tablet',
          route: 'Oral',
          frequency: 'As needed',
          durationDays: 5,
          quantity: 10,
          instructions: 'Take after food if needed for pain',
          isDiscontinued: true,
          discontinuedAt: dateOffset(-7),
          discontinuationReason: 'Switched by clinician due to gastric irritation',
        },
      ],
    });
  });

  after(async () => {
    SmsOtpDeliveryService.setTestTransport(null);
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('1. Rejects unauthenticated requests & fetches Patient 1 medications grouped by status without inventing data', async () => {
    const unauth = await fetch(`${baseUrl}/patient/medications`);
    assert.equal(unauth.status, 401);

    const res = await fetch(`${baseUrl}/patient/medications`, {
      headers: { Authorization: `Bearer ${patient1Token}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);

    assert.equal(body.data.counts.total, 4);
    assert.equal(body.data.counts.active, 2);
    assert.equal(body.data.counts.completed, 1);
    assert.equal(body.data.counts.discontinued, 1);

    assert.equal(body.data.active[0].isPrescriptionReadOnly, true);
    assert.equal(body.data.active[0].doctorName, 'Dr. Arvind Choudhary');
    assert.equal(body.data.adherenceSummary.adherencePercent, null); // No fake 94% or 100% score!

    // Patient 2 has zero prescriptions -> empty arrays, zero invented medicines
    const p2Res = await fetch(`${baseUrl}/patient/medications`, {
      headers: { Authorization: `Bearer ${patient2Token}` },
    });
    const p2Body = await p2Res.json();
    assert.equal(p2Res.status, 200);
    assert.equal(p2Body.data.counts.total, 0);
    assert.equal(p2Body.data.medications.length, 0);
  });

  it('2. Fetches medication detail & enforces cross-patient access isolation (403)', async () => {
    const detailRes = await fetch(`${baseUrl}/patient/medications/${activeMedItemId}`, {
      headers: { Authorization: `Bearer ${patient1Token}` },
    });
    assert.equal(detailRes.status, 200);
    const detail = await detailRes.json();
    assert.equal(detail.data.medication.medicineName, 'Telmisartan');
    assert.equal(detail.data.medication.strength, '40 mg');
    assert.equal(detail.data.medication.route, 'Oral');
    assert.equal(detail.data.medication.prescriptionNumber, 'RX-2026-1001');
    assert.match(detail.data.medication.specialInstructions, /Monitor home blood pressure/);

    // Cross-patient access blocked with 403 Forbidden
    const crossRes = await fetch(`${baseUrl}/patient/medications/${activeMedItemId}`, {
      headers: { Authorization: `Bearer ${patient2Token}` },
    });
    assert.equal(crossRes.status, 403);
  });

  it('3. Creates personal reminders with multiple doses/day without modifying clinician instructions', async () => {
    // Reject reminder creation on discontinued medication
    const discontAttempt = await fetch(`${baseUrl}/patient/medication-reminders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${patient1Token}`,
      },
      body: JSON.stringify({
        medicationId: discontinuedMedItemId,
        scheduleType: 'DAILY',
        reminderTimes: ['09:00'],
        startDate: dateOffset(0),
      }),
    });
    assert.equal(discontAttempt.status, 400);

    // Reject invalid time format & invalid date range
    const invalidTime = await fetch(`${baseUrl}/patient/medication-reminders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${patient1Token}`,
      },
      body: JSON.stringify({
        medicationId: activeMedItem2Id,
        scheduleType: 'DAILY',
        reminderTimes: ['25:99'],
        startDate: dateOffset(0),
      }),
    });
    assert.equal(invalidTime.status, 400);

    // Create twice-daily personal reminder for Metformin SR
    const createRes = await fetch(`${baseUrl}/patient/medication-reminders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${patient1Token}`,
      },
      body: JSON.stringify({
        medicationId: activeMedItem2Id,
        label: 'After breakfast & dinner',
        scheduleType: 'DAILY',
        reminderTimes: ['20:30', '08:30'],
        timezone: 'Asia/Kolkata',
        startDate: dateOffset(-1),
        endDate: dateOffset(27),
        personalNotes: 'Keep water bottle nearby',
      }),
    });
    assert.equal(createRes.status, 201);
    const created = await createRes.json();
    createdReminderId = created.data.id;
    assert.deepEqual(created.data.reminderTimes, ['08:30', '20:30']); // Sorted cleanly
    assert.equal(created.data.personalNotes, 'Keep water bottle nearby');
    assert.match(created.data.isReminderOnlyNotice, /Separate from clinician-issued/);

    // Original clinician instructions remain untouched
    const medCheck = await fetch(`${baseUrl}/patient/medications/${activeMedItem2Id}`, {
      headers: { Authorization: `Bearer ${patient1Token}` },
    });
    const medCheckBody = await medCheck.json();
    assert.equal(medCheckBody.data.medication.instructions, 'Take immediately after breakfast and dinner');
    assert.equal(medCheckBody.data.reminders.length, 1);

    // Create second reminder for Telmisartan using SPECIFIC_DAYS and America/New_York timezone
    const createSecond = await fetch(`${baseUrl}/patient/medication-reminders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${patient1Token}`,
      },
      body: JSON.stringify({
        medicationId: activeMedItemId,
        scheduleType: 'SPECIFIC_DAYS',
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
        reminderTimes: ['07:30'],
        timezone: 'America/New_York',
        startDate: dateOffset(-1),
      }),
    });
    assert.equal(createSecond.status, 201);
    secondReminderId = (await createSecond.json()).data.id;
  });

  it('4. Lists today schedule & upcoming/missed slots cleanly and edits personal reminder', async () => {
    const listRes = await fetch(
      `${baseUrl}/patient/medication-reminders?timezone=Asia/Kolkata`,
      { headers: { Authorization: `Bearer ${patient1Token}` } }
    );
    assert.equal(listRes.status, 200);
    const listBody = await listRes.json();
    assert.equal(listBody.data.items.length, 2);
    assert.equal(listBody.data.todaySchedule.length, 3); // 07:30, 08:30, 20:30

    // Edit Metformin reminder time & disable/re-enable
    const patchRes = await fetch(`${baseUrl}/patient/medication-reminders/${createdReminderId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${patient1Token}`,
      },
      body: JSON.stringify({
        reminderTimes: ['09:00', '21:00'],
        personalNotes: 'Updated personal reminder time',
      }),
    });
    assert.equal(patchRes.status, 200);
    const patched = await patchRes.json();
    assert.deepEqual(patched.data.reminderTimes, ['09:00', '21:00']);

    // Patient 2 cannot edit Patient 1's reminder (403)
    const crossPatch = await fetch(`${baseUrl}/patient/medication-reminders/${createdReminderId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${patient2Token}`,
      },
      body: JSON.stringify({ isEnabled: false }),
    });
    assert.equal(crossPatch.status, 403);
  });

  it('5. Records doses (TAKEN, SKIPPED, SNOOZED), blocks duplicates (409), and audits corrections (PATCH)', async () => {
    const today = dateOffset(0);

    // Record TAKEN dose
    const takeRes = await fetch(`${baseUrl}/patient/medication-doses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${patient1Token}`,
      },
      body: JSON.stringify({
        medicationId: activeMedItem2Id,
        reminderId: createdReminderId,
        scheduledDate: today,
        scheduledTime: '09:00',
        status: 'TAKEN',
        notes: 'Took with breakfast',
      }),
    });
    assert.equal(takeRes.status, 201);
    const takenBody = await takeRes.json();
    recordedDoseId = takenBody.data.id;
    assert.equal(takenBody.data.status, 'TAKEN');

    // Duplicate prevention on exact same slot -> 409 Conflict
    const dupRes = await fetch(`${baseUrl}/patient/medication-doses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${patient1Token}`,
      },
      body: JSON.stringify({
        medicationId: activeMedItem2Id,
        reminderId: createdReminderId,
        scheduledDate: today,
        scheduledTime: '09:00',
        status: 'TAKEN',
      }),
    });
    assert.equal(dupRes.status, 409);
    const dupBody = await dupRes.json();
    assert.equal(dupBody.error.code, 'DUPLICATE_DOSE_RECORD');

    // Record SNOOZED dose for evening slot, then transition SNOOZED -> TAKEN via PATCH
    const snoozeRes = await fetch(`${baseUrl}/patient/medication-doses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${patient1Token}`,
      },
      body: JSON.stringify({
        medicationId: activeMedItem2Id,
        reminderId: createdReminderId,
        scheduledDate: today,
        scheduledTime: '21:00',
        status: 'SNOOZED',
        snoozeMinutes: 15,
      }),
    });
    assert.equal(snoozeRes.status, 201);
    const snoozeBody = await snoozeRes.json();
    assert.equal(snoozeBody.data.status, 'SNOOZED');
    assert.ok(snoozeBody.data.snoozedUntil);

    const snoozeCompleteRes = await fetch(`${baseUrl}/patient/medication-doses/${snoozeBody.data.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${patient1Token}`,
      },
      body: JSON.stringify({ status: 'TAKEN' }),
    });
    assert.equal(snoozeCompleteRes.status, 200);
    const snoozeCompleted = await snoozeCompleteRes.json();
    assert.equal(snoozeCompleted.data.status, 'TAKEN');
    assert.equal(snoozeCompleted.data.previousStatus, 'SNOOZED');

    // Correcting final state TAKEN -> SKIPPED requires correctionReason
    const missingReasonRes = await fetch(`${baseUrl}/patient/medication-doses/${recordedDoseId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${patient1Token}`,
      },
      body: JSON.stringify({ status: 'SKIPPED' }),
    });
    assert.equal(missingReasonRes.status, 400);

    const auditedCorrectionRes = await fetch(`${baseUrl}/patient/medication-doses/${recordedDoseId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${patient1Token}`,
      },
      body: JSON.stringify({
        status: 'SKIPPED',
        correctionReason: 'Tapped taken by mistake; skipped morning meal due to fasting lab test',
      }),
    });
    assert.equal(auditedCorrectionRes.status, 200);
    const correctedBody = await auditedCorrectionRes.json();
    assert.equal(correctedBody.data.status, 'SKIPPED');
    assert.equal(correctedBody.data.previousStatus, 'TAKEN');
    assert.ok(correctedBody.data.correctedAt);

    // Cross-patient dose modification rejected (403)
    const crossDoseRes = await fetch(`${baseUrl}/patient/medication-doses/${recordedDoseId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${patient2Token}`,
      },
      body: JSON.stringify({ status: 'TAKEN', correctionReason: 'Unauthorized' }),
    });
    assert.equal(crossDoseRes.status, 403);

    // Verify adherence summary (1 TAKEN, 1 SKIPPED => 50%)
    const dosesListRes = await fetch(`${baseUrl}/patient/medication-doses`, {
      headers: { Authorization: `Bearer ${patient1Token}` },
    });
    assert.equal(dosesListRes.status, 200);
    const dosesListBody = await dosesListRes.json();
    assert.equal(dosesListBody.data.items.length, 2);
    assert.equal(dosesListBody.data.adherenceSummary.takenCount, 1);
    assert.equal(dosesListBody.data.adherenceSummary.skippedCount, 1);
    assert.equal(dosesListBody.data.adherenceSummary.adherencePercent, 50);
  });

  it('6. Deletes personal reminder while preserving historical dose logs & confirms PHI redaction in logger', async () => {
    const delRes = await fetch(`${baseUrl}/patient/medication-reminders/${secondReminderId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${patient1Token}` },
    });
    assert.equal(delRes.status, 200);

    // Dose history remains preserved
    const dosesAfterDel = await fetch(`${baseUrl}/patient/medication-doses`, {
      headers: { Authorization: `Bearer ${patient1Token}` },
    });
    const dosesBody = await dosesAfterDel.json();
    assert.equal(dosesBody.data.items.length, 2);

    // Ensure StructuredLogger strips sensitive medication strings
    const sanitized = StructuredLogger.sanitizePayload({
      action: 'PATIENT_MEDICATION_REMINDER_CREATED',
      medicineName: 'Telmisartan',
      personalNotes: 'After breakfast',
    });
    assert.equal(sanitized.medicineName, '[REDACTED_SENSITIVE]');
    assert.equal(sanitized.personalNotes, '[REDACTED_SENSITIVE]');
  });
});
