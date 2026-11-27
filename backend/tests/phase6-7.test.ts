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
import { hashPassword } from '../src/utils/crypto';
import { SmsOtpDeliveryService } from '../src/utils/sms';

function futureDateString(daysAhead: number): { dateStr: string; dayOfWeek: number } {
  const now = new Date();
  const target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysAhead));
  return {
    dateStr: target.toISOString().slice(0, 10),
    dayOfWeek: target.getUTCDay(),
  };
}

describe('MediCore Phases 6 & 7: Hospital & Doctor Discovery + Appointment Booking & Scheduling', () => {
  let server: http.Server;
  let baseUrl: string;

  const hospAId = '11111111-1111-4111-8111-111111111111';
  const hospBId = '22222222-2222-4222-8222-222222222222';
  const doc1Id = '33333333-3333-4333-8333-333333333333';
  const doc2Id = '44444444-4444-4444-8444-444444444444';

  let patient1Token: string;
  let patient2Token: string;
  let staffToken: string;

  const targetFuture = futureDateString(3);
  const nextFuture = futureDateString(4);

  before(async () => {
    db.reset();
    clinicalStore.reset();
    opsStore.reset();
    directoryStore.records.clear();
    await seedDatabaseIfEmpty();

    // Seed verified active Hospital A and unverified directory Hospital B
    db.hospitals.set(hospAId, {
      id: hospAId,
      name: 'Medanta Abdur Razzaque Ansari Memorial',
      slug: 'medanta-ranchi',
      category: 'SUPER_SPECIALTY',
      status: 'ACTIVE',
      address: 'Irba, Ormanjhi',
      city: 'Ranchi',
      state: 'Jharkhand',
      pincode: '835217',
      primaryPhone: '+91 651 712 3100',
      officialEmail: 'ranchi@medanta.org',
      clinicalLicenseNumber: 'CEA-JHK-MED-01',
      totalBeds: 200,
      departments: ['Cardiology', 'Orthopedics'],
      about: 'Tertiary specialty care center in Ranchi.',
      operatingHours: 'Mon-Sat 09:00-18:00',
      cancellationPolicyHours: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    directoryStore.records.set(hospBId, {
      id: hospBId,
      directoryCode: 'HOSP-RNC-02',
      displayName: 'Jamshedpur Community Clinic',
      city: 'Jamshedpur',
      state: 'Jharkhand',
      pincode: '831001',
      address: 'Bistupur Main Road',
      primaryPhone: '+91 657 222 1000',
      email: null,
      website: null,
      facilityType: 'GENERAL_CLINIC',
      ownershipType: 'TRUST',
      specialties: ['General Medicine', 'Pediatrics'],
      emergencyAvailable: false,
      verificationStatus: 'PENDING_VERIFICATION',
    });

    // Seed Doctor 1 with explicit schedule on targetFuture.dayOfWeek and nextFuture.dayOfWeek
    clinicalStore.doctors.set(doc1Id, {
      id: doc1Id,
      userId: crypto.randomUUID(),
      fullName: 'Dr. Ananya Sen',
      medicalLicenseNumber: 'MCI-JHK-4021',
      qualification: 'MBBS, MD, DM (Cardiology)',
      specialization: 'Cardiologist',
      experienceYears: 12,
      bio: 'Senior interventional cardiologist focusing on preventive cardiology.',
      profilePhotoUrl: null,
      hospitalId: hospAId,
      departmentId: 'dept-cardio',
      departmentName: 'Cardiology',
      consultationFee: 800,
      slotDurationMinutes: 30,
      verificationStatus: 'VERIFIED',
    });

    // Seed Doctor 2 at Hospital B with NO bio & NO fee (to ensure zero fabricated values) and NO schedule configured
    clinicalStore.doctors.set(doc2Id, {
      id: doc2Id,
      userId: crypto.randomUUID(),
      fullName: 'Dr. Vikram Mehta',
      medicalLicenseNumber: 'MCI-JHK-5590',
      qualification: 'MBBS, MD',
      specialization: 'Pediatrician',
      experienceYears: 6,
      bio: null,
      profilePhotoUrl: null,
      hospitalId: hospBId,
      departmentId: 'dept-peds',
      departmentName: 'Pediatrics',
      consultationFee: null,
      slotDurationMinutes: 30,
      verificationStatus: 'VERIFIED',
    });

    clinicalStore.doctorAvailabilities.set(doc1Id, [
      {
        id: crypto.randomUUID(),
        doctorId: doc1Id,
        hospitalId: hospAId,
        dayOfWeek: targetFuture.dayOfWeek,
        startTime: '10:00',
        endTime: '12:00',
        slotDurationMinutes: 30,
        timezone: 'Asia/Kolkata',
        isActive: true,
      },
      {
        id: crypto.randomUUID(),
        doctorId: doc1Id,
        hospitalId: hospAId,
        dayOfWeek: nextFuture.dayOfWeek,
        startTime: '14:00',
        endTime: '15:30',
        slotDurationMinutes: 30,
        timezone: 'Asia/Kolkata',
        isActive: true,
      },
    ]);

    // Block 11:00 - 11:30 slot on targetFuture date for Doctor 1
    clinicalStore.doctorBlockedTimes.set(doc1Id, [
      {
        id: crypto.randomUUID(),
        doctorId: doc1Id,
        hospitalId: hospAId,
        blockedDate: targetFuture.dateStr,
        startTime: '11:00',
        endTime: '11:30',
        isFullDayLeave: false,
        reason: 'Cath lab procedure',
      },
    ]);

    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address() as any;
        baseUrl = `http://127.0.0.1:${address.port}/api/v1`;
        resolve();
      });
    });

    let capturedOtp = '';
    SmsOtpDeliveryService.setTestTransport(async (req) => {
      capturedOtp = req.otpCode;
      return { messageId: 'p67-otp' };
    });

    // Register Patient 1 & Patient 2 via Phone + OTP
    await fetch(`${baseUrl}/auth/patient/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '+919911000001', purpose: 'REGISTER' }),
    });
    const p1Res = await fetch(`${baseUrl}/auth/patient/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Kiran Verma',
        phone: '+919911000001',
        otpCode: capturedOtp,
        termsAccepted: true,
      }),
    });
    patient1Token = (await p1Res.json()).data.accessToken;

    await fetch(`${baseUrl}/auth/patient/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '+919911000002', purpose: 'REGISTER' }),
    });
    const p2Res = await fetch(`${baseUrl}/auth/patient/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Sneha Gupta',
        phone: '+919911000002',
        otpCode: capturedOtp,
        termsAccepted: true,
      }),
    });
    patient2Token = (await p2Res.json()).data.accessToken;

    // Seed Doctor staff user to verify patient role enforcement on discovery endpoints
    const docUserId = crypto.randomUUID();
    db.users.set(docUserId, {
      id: docUserId,
      fullName: 'Dr. Staff Only',
      email: 'staff.only@medicore.in',
      phone: '+919911000099',
      passwordHash: await hashPassword('StrongPassword1!'),
      isEmailVerified: true,
      isPhoneVerified: true,
      isActive: true,
      activeHospitalId: hospAId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    db.userRoles.set(crypto.randomUUID(), {
      id: crypto.randomUUID(),
      userId: docUserId,
      roleCode: 'DOCTOR',
      hospitalId: hospAId,
      membershipId: null,
      assignedAt: new Date(),
    });
    await fetch(`${baseUrl}/auth/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '+919911000099', purpose: 'LOGIN' }),
    });
    const staffLogin = await fetch(`${baseUrl}/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '+919911000099', otpCode: capturedOtp }),
    });
    SmsOtpDeliveryService.setTestTransport(null);
    staffToken = (await staffLogin.json()).data.accessToken;
  });

  after(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('Phase 6: Discovers hospitals & doctors with search, city, specialty, pagination, verification truthfulness & role checks', async () => {
    // 1. Unauthenticated access rejected (401)
    const unauth = await fetch(`${baseUrl}/patient/hospitals`);
    assert.equal(unauth.status, 401);

    // 2. Non-patient staff role rejected on patient discovery endpoints (403)
    const staffBlocked = await fetch(`${baseUrl}/patient/hospitals`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert.equal(staffBlocked.status, 403);

    // 3. List hospitals with pagination and filters
    const page1Res = await fetch(`${baseUrl}/patient/hospitals?page=1&limit=1`, {
      headers: { Authorization: `Bearer ${patient1Token}` },
    });
    assert.equal(page1Res.status, 200);
    const page1Body = await page1Res.json();
    assert.equal(page1Body.data.length, 1);
    assert.ok(page1Body.meta.total >= 2, 'Total hospitals should include directory + newly seeded hospitals');
    assert.equal(page1Body.meta.totalPages, page1Body.meta.total);

    // Search & verifiedOnly filter
    const ranchiRes = await fetch(`${baseUrl}/patient/hospitals?city=Ranchi&verifiedOnly=true`, {
      headers: { Authorization: `Bearer ${patient1Token}` },
    });
    const ranchiBody = await ranchiRes.json();
    assert.equal(ranchiRes.status, 200);
    assert.ok(ranchiBody.data.length >= 1);
    const matchedMedanta = ranchiBody.data.find((h: any) => h.id === hospAId);
    assert.ok(matchedMedanta, 'Verified active test hospital in Ranchi must be returned');
    assert.equal(matchedMedanta.isVerified, true);
    assert.equal(matchedMedanta.doctorCount, 1);

    // Unverified directory hospital honestly shows isVerified = false
    const jsrRes = await fetch(`${baseUrl}/patient/hospitals?city=Jamshedpur`, {
      headers: { Authorization: `Bearer ${patient1Token}` },
    });
    const jsrBody = await jsrRes.json();
    assert.equal(jsrBody.data.length, 1);
    assert.equal(jsrBody.data[0].isVerified, false);
    assert.equal(jsrBody.data[0].verificationStatus, 'PENDING_VERIFICATION');

    // Specialty search filter
    const specRes = await fetch(`${baseUrl}/patient/hospitals?specialty=Pediatrics&city=Jamshedpur`, {
      headers: { Authorization: `Bearer ${patient1Token}` },
    });
    const specBody = await specRes.json();
    assert.equal(specBody.data.length, 1);
    assert.equal(specBody.data[0].id, hospBId);

    // Hospital details + hospital doctors
    const detailRes = await fetch(`${baseUrl}/patient/hospitals/${hospAId}`, {
      headers: { Authorization: `Bearer ${patient1Token}` },
    });
    assert.equal(detailRes.status, 200);
    const detailBody = await detailRes.json();
    assert.equal(detailBody.data.hospital.name, 'Medanta Abdur Razzaque Ansari Memorial');
    assert.equal(detailBody.data.availableDoctors.length, 1);
    assert.equal(detailBody.data.availableDoctors[0].fullName, 'Dr. Ananya Sen');

    // Doctor detail preserves null bio/fee cleanly without fabricating placeholders
    const doc2Res = await fetch(`${baseUrl}/patient/doctors/${doc2Id}`, {
      headers: { Authorization: `Bearer ${patient1Token}` },
    });
    assert.equal(doc2Res.status, 200);
    const doc2Body = await doc2Res.json();
    assert.equal(doc2Body.data.bio, null);
    assert.equal(doc2Body.data.consultationFee, null);
    assert.equal(doc2Body.data.isAvailable, false);
    assert.equal(doc2Body.data.scheduleSummary.length, 0);

    // Invalid ID format returns 400; missing UUID returns 404
    const badId = await fetch(`${baseUrl}/patient/doctors/not@valid!id`, {
      headers: { Authorization: `Bearer ${patient1Token}` },
    });
    assert.equal(badId.status, 400);

    const missingId = await fetch(`${baseUrl}/patient/doctors/${crypto.randomUUID()}`, {
      headers: { Authorization: `Bearer ${patient1Token}` },
    });
    assert.equal(missingId.status, 404);

    // Specialties filter options endpoint
    const filtersRes = await fetch(`${baseUrl}/patient/specialties`, {
      headers: { Authorization: `Bearer ${patient1Token}` },
    });
    assert.equal(filtersRes.status, 200);
    const filtersBody = await filtersRes.json();
    assert.ok(filtersBody.data.specialties.includes('Cardiology'));
    assert.ok(filtersBody.data.cities.includes('Ranchi'));
  });

  it('Phase 7: Evaluates real schedule availability, protects against simultaneous concurrent double booking, enforces cross-patient isolation & cancellation policy', async () => {
    // 1. Doctor without schedule returns empty slots (no fake defaults)
    const unconfiguredAvail = await fetch(
      `${baseUrl}/patient/doctors/${doc2Id}/availability?date=${targetFuture.dateStr}`,
      { headers: { Authorization: `Bearer ${patient1Token}` } }
    );
    assert.equal(unconfiguredAvail.status, 200);
    const unconfiguredData = await unconfiguredAvail.json();
    assert.equal(unconfiguredData.data.hasScheduleConfigured, false);
    assert.equal(unconfiguredData.data.slots.length, 0);

    // 2. Doctor 1 availability shows 10:00-12:00 slots with 11:00 explicitly blocked
    const availRes = await fetch(
      `${baseUrl}/patient/doctors/${doc1Id}/availability?date=${targetFuture.dateStr}&days=14`,
      { headers: { Authorization: `Bearer ${patient1Token}` } }
    );
    assert.equal(availRes.status, 200);
    const availData = await availRes.json();
    assert.equal(availData.data.hasScheduleConfigured, true);
    const slot1000 = availData.data.slots.find((s: any) => s.startTime === '10:00');
    const slot1100 = availData.data.slots.find((s: any) => s.startTime === '11:00');
    assert.equal(slot1000.isAvailable, true);
    assert.equal(slot1100.isBlocked, true);
    assert.equal(slot1100.isAvailable, false);
    assert.equal(slot1100.unavailableReason, 'Cath lab procedure');
    assert.ok(availData.data.availableDates.some((d: any) => d.date === targetFuture.dateStr));

    // 3. Reject hospital/doctor mismatch
    const mismatchRes = await fetch(`${baseUrl}/patient/appointments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${patient1Token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hospitalId: hospBId,
        doctorId: doc1Id,
        appointmentDate: targetFuture.dateStr,
        slotStartTime: '10:00',
        type: 'OPD',
        reasonForVisit: 'Checkup',
      }),
    });
    assert.equal(mismatchRes.status, 400);

    // 4. Reject booking blocked slot (11:00)
    const blockedRes = await fetch(`${baseUrl}/patient/appointments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${patient1Token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hospitalId: hospAId,
        doctorId: doc1Id,
        appointmentDate: targetFuture.dateStr,
        slotStartTime: '11:00',
        type: 'OPD',
        reasonForVisit: 'Consultation',
      }),
    });
    assert.equal(blockedRes.status, 400);

    // 5. Simultaneous concurrent booking race on 10:00 slot -> exactly 1 succeeds (201) and 1 fails (409)
    const [r1, r2] = await Promise.all([
      fetch(`${baseUrl}/patient/appointments`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${patient1Token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hospitalId: hospAId,
          doctorId: doc1Id,
          appointmentDate: targetFuture.dateStr,
          slotStartTime: '10:00',
          type: 'OPD',
          reasonForVisit: 'Palpitations follow up',
        }),
      }),
      fetch(`${baseUrl}/patient/appointments`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${patient2Token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hospitalId: hospAId,
          doctorId: doc1Id,
          appointmentDate: targetFuture.dateStr,
          slotStartTime: '10:00',
          type: 'OPD',
          reasonForVisit: 'Chest tightness',
        }),
      }),
    ]);

    const statuses = [r1.status, r2.status].sort();
    assert.deepEqual(statuses, [201, 409], 'Concurrent booking of identical slot must allow 1 winner and return 409 Conflict for loser');

    const winnerResponse = r1.status === 201 ? await r1.json() : await r2.json();
    const winnerToken = r1.status === 201 ? patient1Token : patient2Token;
    const loserToken = r1.status === 201 ? patient2Token : patient1Token;
    const appointmentId = winnerResponse.data.appointment.id;
    assert.equal(winnerResponse.data.appointment.status, 'CONFIRMED');
    assert.equal(winnerResponse.data.notificationDispatch.pushConfigured, false);
    assert.equal(winnerResponse.data.notificationDispatch.smsConfigured, false);
    assert.equal(winnerResponse.data.notificationDispatch.inAppNotificationQueued, true);

    // 6. Cross-patient appointment read and cancel must return 403 Forbidden
    const crossGet = await fetch(`${baseUrl}/patient/appointments/${appointmentId}`, {
      headers: { Authorization: `Bearer ${loserToken}` },
    });
    assert.equal(crossGet.status, 403);

    const crossCancel = await fetch(`${baseUrl}/patient/appointments/${appointmentId}/cancel`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${loserToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Unauthorized attempt' }),
    });
    assert.equal(crossCancel.status, 403);

    // 7. Winner lists upcoming appointments and sees 1, loser sees 0
    const upcomingWinner = await fetch(`${baseUrl}/patient/appointments/upcoming`, {
      headers: { Authorization: `Bearer ${winnerToken}` },
    });
    assert.equal((await upcomingWinner.json()).data.length, 1);

    const upcomingLoser = await fetch(`${baseUrl}/patient/appointments/upcoming`, {
      headers: { Authorization: `Bearer ${loserToken}` },
    });
    assert.equal((await upcomingLoser.json()).data.length, 0);

    // 8. Winner cancels appointment -> slot becomes available again and moves to PAST
    const cancelOk = await fetch(`${baseUrl}/patient/appointments/${appointmentId}/cancel`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${winnerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Rescheduling for next week' }),
    });
    assert.equal(cancelOk.status, 200);
    const cancelledBody = await cancelOk.json();
    assert.equal(cancelledBody.data.appointment.status, 'CANCELLED');
    assert.equal(cancelledBody.data.appointment.canCancel, false);

    // Cancelling already-cancelled appointment returns 400
    const cancelAgain = await fetch(`${baseUrl}/patient/appointments/${appointmentId}/cancel`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${winnerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Second attempt' }),
    });
    assert.equal(cancelAgain.status, 400);

    // Past tab now contains the cancelled appointment
    const pastRes = await fetch(`${baseUrl}/patient/appointments?filter=PAST`, {
      headers: { Authorization: `Bearer ${winnerToken}` },
    });
    const pastBody = await pastRes.json();
    assert.equal(pastBody.data.length, 1);
    assert.equal(pastBody.data[0].id, appointmentId);

    // Re-check availability: 10:00 is free again
    const availAfterCancel = await fetch(
      `${baseUrl}/patient/doctors/${doc1Id}/availability?date=${targetFuture.dateStr}`,
      { headers: { Authorization: `Bearer ${patient2Token}` } }
    );
    const slotAfterCancel = (await availAfterCancel.json()).data.slots.find((s: any) => s.startTime === '10:00');
    assert.equal(slotAfterCancel.isAvailable, true);
  });
});
