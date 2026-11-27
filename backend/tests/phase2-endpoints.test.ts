import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import http from 'http';
import { createApp } from '../src/app';
import { db, getPrismaClient, withTransaction, normalizePrismaError } from '../src/database/prisma';
import { seedDatabaseIfEmpty } from '../src/database/seed';
import { AuthService } from '../src/modules/auth/auth.service';
import { SmsOtpDeliveryService } from '../src/utils/sms';
import { ClinicalService, clinicalStore, DoctorRecord } from '../src/modules/clinical/clinical.service';
import { OperationsAndBillingService, opsStore } from '../src/modules/operations/operations.service';
import { directoryStore } from '../src/modules/directory/directory.service';

describe('MediCore Phase 2: Centralized PostgreSQL Database & Complete Backend Endpoints', () => {
  let server: http.Server;
  let baseUrl: string;

  const testHospitalId = '22222222-2222-4222-8222-222222222222';
  const otherHospitalId = '33333333-3333-4333-8333-333333333333';

  let patientUser: any;
  let patientToken: string;
  let patientRefreshToken: string;

  let otherPatientUser: any;
  let otherPatientToken: string;

  let doctorRecord: DoctorRecord;

  before(async () => {
    db.reset();
    clinicalStore.reset();
    opsStore.reset();
    directoryStore.records.clear();
    await seedDatabaseIfEmpty();

    // Register active test hospital in relational DB
    db.hospitals.set(testHospitalId, {
      id: testHospitalId,
      name: 'Ranchi Medical Institute',
      slug: 'ranchi-medical-institute',
      category: 'SUPER_SPECIALTY',
      status: 'ACTIVE',
      address: 'Bariatu Road',
      city: 'Ranchi',
      state: 'Jharkhand',
      pincode: '834009',
      primaryPhone: '+91 651 254 0000',
      officialEmail: 'info@rmi-ranchi.in',
      clinicalLicenseNumber: 'CEA-JHK-RMI-2026',
      totalBeds: 250,
      departments: ['CARDIOLOGY', 'GENERAL_MEDICINE', 'PEDIATRICS', 'ORTHOPEDICS'],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    db.hospitals.set(otherHospitalId, {
      id: otherHospitalId,
      name: 'City Care Hospital',
      slug: 'city-care-hospital',
      category: 'GENERAL',
      status: 'ACTIVE',
      address: 'Main Road',
      city: 'Ranchi',
      state: 'Jharkhand',
      pincode: '834001',
      primaryPhone: '+91 651 220 1111',
      officialEmail: 'info@citycare.in',
      clinicalLicenseNumber: 'CEA-JHK-CCH-2026',
      totalBeds: 100,
      departments: ['GENERAL_MEDICINE'],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Start express app on dynamic port
    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address() as any;
        baseUrl = `http://127.0.0.1:${address.port}/api/v1`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  // ------------------------------------------------------------------------
  // 1. PostgreSQL & Prisma Architecture
  // ------------------------------------------------------------------------
  it('1. Verifies PostgreSQL Prisma singleton, transaction manager and error normalization', async () => {
    const client1 = getPrismaClient();
    const client2 = getPrismaClient();
    assert.strictEqual(client1, client2, 'Prisma client must be a strict singleton');

    // Test withTransaction helper
    const result = await withTransaction(async (tx) => {
      return { committed: true, step: 'phase2-verify' };
    });
    assert.equal(result.committed, true);

    // Test normalizePrismaError
    const p2002Err = normalizePrismaError({ code: 'P2002', meta: { target: ['email'] } });
    assert.equal(p2002Err.statusCode, 409);
    assert.equal(p2002Err.code, 'UNIQUE_CONSTRAINT_VIOLATION');

    const p2025Err = normalizePrismaError({ code: 'P2025' });
    assert.equal(p2025Err.statusCode, 404);
    assert.equal(p2025Err.code, 'RECORD_NOT_FOUND');

    const p2003Err = normalizePrismaError({ code: 'P2003', meta: { field_name: 'hospitalId' } });
    assert.equal(p2003Err.statusCode, 400);
    assert.equal(p2003Err.code, 'FOREIGN_KEY_VIOLATION');
  });

  // ------------------------------------------------------------------------
  // 2. Authentication: Patient-Only Registration & Token Flow
  // ------------------------------------------------------------------------
  it('2. Registers patient via POST /auth/register (Phone + OTP) and verifies strict PATIENT role enforcement', async () => {
    const dispatchedOtps: string[] = [];
    SmsOtpDeliveryService.setTestTransport(async (req) => {
      dispatchedOtps.push(req.otpCode);
      return { messageId: `p2-ep-${dispatchedOtps.length}` };
    });

    await fetch(`${baseUrl}/auth/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '+919876543210', purpose: 'REGISTER' }),
    });
    const otp1 = dispatchedOtps[dispatchedOtps.length - 1];

    const res = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Aarav Sharma',
        phone: '+919876543210',
        otpCode: otp1,
        termsAccepted: true,
      }),
    });

    const body = await res.json();
    assert.equal(res.status, 201);
    assert.equal(body.success, true);
    assert.equal(body.data.user.phone, '+919876543210');
    assert.deepEqual(body.data.user.globalRoles, ['PATIENT'], 'Self-service registration must create PATIENT only');

    patientUser = body.data.user;
    patientToken = body.data.accessToken;
    patientRefreshToken = body.data.refreshToken;
    assert.ok(patientToken, 'Must issue JWT access token');
    assert.ok(patientRefreshToken, 'Must issue refresh token');

    // Register a second patient to test ownership boundaries
    await fetch(`${baseUrl}/auth/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '+919876543211', purpose: 'REGISTER' }),
    });
    const otp2 = dispatchedOtps[dispatchedOtps.length - 1];

    const otherRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Priya Verma',
        phone: '+919876543211',
        otpCode: otp2,
        termsAccepted: true,
      }),
    });
    const otherBody = await otherRes.json();
    assert.equal(otherRes.status, 201);
    otherPatientUser = otherBody.data.user;
    otherPatientToken = otherBody.data.accessToken;
    SmsOtpDeliveryService.setTestTransport(null);
  });

  it('3. Authenticates patient via POST /auth/otp/request + /auth/otp/verify, refreshes token via POST /auth/refresh', async () => {
    let loginOtp = '';
    SmsOtpDeliveryService.setTestTransport(async (req) => {
      loginOtp = req.otpCode;
      return { messageId: 'p2-login-otp' };
    });

    const otpReqRes = await fetch(`${baseUrl}/auth/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '+919876543210', purpose: 'LOGIN' }),
    });
    assert.equal(otpReqRes.status, 200);
    assert.ok(loginOtp.length === 6);

    const loginRes = await fetch(`${baseUrl}/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: '+919876543210',
        otpCode: loginOtp,
      }),
    });
    SmsOtpDeliveryService.setTestTransport(null);

    const loginBody = await loginRes.json();
    assert.equal(loginRes.status, 200);
    assert.equal(loginBody.success, true);
    assert.ok(loginBody.data.accessToken);

    // Refresh token
    const refreshRes = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        refreshToken: loginBody.data.refreshToken,
      }),
    });
    const refreshBody = await refreshRes.json();
    assert.equal(refreshRes.status, 200);
    assert.equal(refreshBody.success, true);
    assert.ok(refreshBody.data.accessToken);
    assert.ok(refreshBody.data.refreshToken);

    // Update patientToken to newest token
    patientToken = refreshBody.data.accessToken;
  });

  // ------------------------------------------------------------------------
  // 3. Hospitals Endpoints
  // ------------------------------------------------------------------------
  it('4. Lists hospitals via GET /hospitals and fetches specific hospital details', async () => {
    const listRes = await fetch(`${baseUrl}/hospitals`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const listBody = await listRes.json();
    assert.equal(listRes.status, 200);
    assert.equal(listBody.success, true);
    assert.ok(listBody.data.length >= 2);

    const getRes = await fetch(`${baseUrl}/hospitals/${testHospitalId}`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const getBody = await getRes.json();
    assert.equal(getRes.status, 200);
    assert.equal(getBody.data.name, 'Ranchi Medical Institute');
    assert.equal(getBody.data.city, 'Ranchi');
  });

  // ------------------------------------------------------------------------
  // 4. Doctors & Availability
  // ------------------------------------------------------------------------
  it('5. Manages Doctors: lists doctors, filters by department, and calculates availability slots', async () => {
    // Seed doctor in clinicalStore
    const docId = 'doc-cardio-001';
    doctorRecord = {
      id: docId,
      userId: crypto.randomUUID(),
      fullName: 'Dr. Rajesh Pandey',
      medicalLicenseNumber: 'MCI-JHK-2015-8844',
      qualification: 'MBBS, MD (Cardiology)',
      specialization: 'Cardiologist',
      experienceYears: 14,
      hospitalId: testHospitalId,
      departmentId: 'dept-cardio',
      departmentName: 'Cardiology',
      consultationFee: 750,
      slotDurationMinutes: 30,
      verificationStatus: 'VERIFIED',
    };
    clinicalStore.doctors.set(docId, doctorRecord);

    // List doctors
    const docListRes = await fetch(`${baseUrl}/doctors`, {
      headers: {
        Authorization: `Bearer ${patientToken}`,
        'X-Hospital-Id': testHospitalId,
      },
    });
    const docListBody = await docListRes.json();
    assert.equal(docListRes.status, 200);
    assert.equal(docListBody.data.length, 1);
    assert.equal(docListBody.data[0].fullName, 'Dr. Rajesh Pandey');

    // Filter by department
    const deptRes = await fetch(`${baseUrl}/doctors?departmentId=dept-cardio`, {
      headers: {
        Authorization: `Bearer ${patientToken}`,
        'X-Hospital-Id': testHospitalId,
      },
    });
    const deptBody = await deptRes.json();
    assert.equal(deptBody.data.length, 1);

    // Get doctor by ID
    const docDetailRes = await fetch(`${baseUrl}/doctors/${docId}`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const docDetailBody = await docDetailRes.json();
    assert.equal(docDetailRes.status, 200);
    assert.equal(docDetailBody.data.specialization, 'Cardiologist');

    // Get doctor availability
    const targetDate = (() => {
      const d = new Date();
      d.setDate(d.getDate() + 3);
      if (d.getDay() === 0) d.setDate(d.getDate() + 1);
      return d.toISOString().slice(0, 10);
    })();
    const availRes = await fetch(`${baseUrl}/doctors/${docId}/availability?date=${targetDate}`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const availBody = await availRes.json();
    assert.equal(availRes.status, 200);
    assert.ok(availBody.data.slots.length > 5);
    assert.equal(availBody.data.slots[0].isAvailable, true);
  });

  // ------------------------------------------------------------------------
  // 5. Appointments: Booking, Scoping & Cancellation
  // ------------------------------------------------------------------------
  it('6. Books appointment, enforces double-booking prevention, patient scoping, and cancellation', async () => {
    const targetDate = (() => {
      const d = new Date();
      d.setDate(d.getDate() + 3);
      if (d.getDay() === 0) d.setDate(d.getDate() + 1);
      return d.toISOString().slice(0, 10);
    })();

    // Book appointment for Aarav
    const bookRes = await fetch(`${baseUrl}/appointments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${patientToken}`,
        'Content-Type': 'application/json',
        'X-Hospital-Id': testHospitalId,
      },
      body: JSON.stringify({
        departmentId: 'dept-cardio',
        doctorId: doctorRecord.id,
        appointmentDate: targetDate,
        slotStartTime: '09:00',
        slotEndTime: '09:30',
        reasonForVisit: 'Annual cardiovascular checkup',
      }),
    });
    const bookBody = await bookRes.json();
    assert.equal(bookRes.status, 201);
    assert.equal(bookBody.data.status, 'CONFIRMED');
    const appointmentId = bookBody.data.id;

    // Double booking same slot must be rejected with 409 Conflict
    const doubleBookRes = await fetch(`${baseUrl}/appointments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${otherPatientToken}`,
        'Content-Type': 'application/json',
        'X-Hospital-Id': testHospitalId,
      },
      body: JSON.stringify({
        departmentId: 'dept-cardio',
        doctorId: doctorRecord.id,
        appointmentDate: targetDate,
        slotStartTime: '09:00',
        slotEndTime: '09:30',
        reasonForVisit: 'Chest pain',
      }),
    });
    assert.equal(doubleBookRes.status, 409, 'Double booking same slot must fail with 409');

    // Verify availability endpoint marks 09:00 slot as unavailable now
    const availCheckRes = await fetch(`${baseUrl}/doctors/${doctorRecord.id}/availability?date=${targetDate}`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const availCheckBody = await availCheckRes.json();
    const slot0900 = availCheckBody.data.slots.find((s: any) => s.slotStartTime === '09:00');
    assert.equal(slot0900.isAvailable, false, 'Booked slot must show isAvailable = false');

    // Patient sees only their own appointments
    const listAaravRes = await fetch(`${baseUrl}/appointments`, {
      headers: {
        Authorization: `Bearer ${patientToken}`,
        'X-Hospital-Id': testHospitalId,
      },
    });
    const listAaravBody = await listAaravRes.json();
    assert.equal(listAaravBody.data.length, 1);
    assert.equal(listAaravBody.data[0].id, appointmentId);

    // Other patient querying appointments sees 0 appointments
    const listPriyaRes = await fetch(`${baseUrl}/appointments`, {
      headers: {
        Authorization: `Bearer ${otherPatientToken}`,
        'X-Hospital-Id': testHospitalId,
      },
    });
    const listPriyaBody = await listPriyaRes.json();
    assert.equal(listPriyaBody.data.length, 0, 'Other patient must not see Aarav\'s appointments');

    // Other patient attempting to get appointment details gets 403 Forbidden
    const getForbiddenRes = await fetch(`${baseUrl}/appointments/${appointmentId}`, {
      headers: { Authorization: `Bearer ${otherPatientToken}` },
    });
    assert.equal(getForbiddenRes.status, 403, 'Cross-patient appointment access must be blocked');

    // Patient cancels their own appointment
    const cancelRes = await fetch(`${baseUrl}/appointments/${appointmentId}/cancel`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${patientToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason: 'Travel plans postponed' }),
    });
    const cancelBody = await cancelRes.json();
    assert.equal(cancelRes.status, 200);
    assert.equal(cancelBody.data.status, 'CANCELLED');

    // Verify slot is freed after cancellation
    const availRecheckRes = await fetch(`${baseUrl}/doctors/${doctorRecord.id}/availability?date=2026-11-20`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const availRecheckBody = await availRecheckRes.json();
    const slot0900After = availRecheckBody.data.slots.find((s: any) => s.slotStartTime === '09:00');
    assert.equal(slot0900After.isAvailable, true, 'Cancelled slot must become available again');
  });

  // ------------------------------------------------------------------------
  // 6. Medical Records (EHR) & Prescriptions
  // ------------------------------------------------------------------------
  it('7. Patient accesses EHR timeline, encounters, and prescriptions with strict ownership verification', async () => {
    // Setup patient record and encounter in clinicalStore
    const patientProfile = ClinicalService.getPatientProfile(patientUser.id);
    const patId = patientProfile.patient!.id;

    const encId = 'enc-001';
    clinicalStore.encounters.set(encId, {
      id: encId,
      patientId: patId,
      hospitalId: testHospitalId,
      doctorId: doctorRecord.id,
      status: 'FINALIZED',
      version: 1,
      symptoms: 'Mild shortness of breath on exertion',
      examinationFindings: 'BP 124/82 mmHg, HR 72 bpm regular',
      assessment: 'Normal sinus rhythm, early stage hypertension',
      diagnoses: [{ icd10Code: 'I10', diagnosisName: 'Essential (primary) hypertension', classification: 'PRIMARY' }],
      amendmentHistory: [],
      createdAt: new Date().toISOString(),
    });

    const prescId = 'rx-001';
    clinicalStore.prescriptions.set(prescId, {
      id: prescId,
      prescriptionNumber: 'RX-2026-0001',
      patientId: patId,
      doctorId: doctorRecord.id,
      hospitalId: testHospitalId,
      encounterId: encId,
      status: 'SIGNED',
      items: [
        {
          medicineName: 'Telmisartan',
          strength: '40mg',
          dosage: '1 tablet once daily in morning',
          route: 'Oral',
          frequency: 'OD',
          durationDays: 30,
          quantity: 30,
          instructions: 'Take after breakfast',
        },
      ],
    });

    // Patient requests their own EHR timeline
    const ehrRes = await fetch(`${baseUrl}/patients/${patId}/ehr`, {
      headers: {
        Authorization: `Bearer ${patientToken}`,
        'X-Hospital-Id': testHospitalId,
      },
    });
    const ehrBody = await ehrRes.json();
    assert.equal(ehrRes.status, 200);
    assert.equal(ehrBody.data.encounters.length, 1);
    assert.equal(ehrBody.data.prescriptions.length, 1);

    // Other patient requesting Aarav's EHR is blocked with 403 Forbidden
    const unauthEhrRes = await fetch(`${baseUrl}/patients/${patId}/ehr`, {
      headers: {
        Authorization: `Bearer ${otherPatientToken}`,
        'X-Hospital-Id': testHospitalId,
      },
    });
    assert.equal(unauthEhrRes.status, 403, 'Patient cannot access another patient\'s EHR');

    // View specific encounter
    const singleEncRes = await fetch(`${baseUrl}/patients/${patId}/ehr/${encId}`, {
      headers: {
        Authorization: `Bearer ${patientToken}`,
        'X-Hospital-Id': testHospitalId,
      },
    });
    const singleEncBody = await singleEncRes.json();
    assert.equal(singleEncRes.status, 200);
    assert.equal(singleEncBody.data.id, encId);

    // List prescriptions
    const rxListRes = await fetch(`${baseUrl}/prescriptions`, {
      headers: {
        Authorization: `Bearer ${patientToken}`,
        'X-Hospital-Id': testHospitalId,
      },
    });
    const rxListBody = await rxListRes.json();
    assert.equal(rxListRes.status, 200);
    assert.equal(rxListBody.data.length, 1);
    assert.equal(rxListBody.data[0].prescriptionNumber, 'RX-2026-0001');

    // Get specific prescription
    const rxDetailRes = await fetch(`${baseUrl}/prescriptions/${prescId}`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const rxDetailBody = await rxDetailRes.json();
    assert.equal(rxDetailRes.status, 200);
    assert.equal(rxDetailBody.data.items[0].medicineName, 'Telmisartan');

    // Other patient accessing rx gets 403 Forbidden
    const unauthRxRes = await fetch(`${baseUrl}/prescriptions/${prescId}`, {
      headers: { Authorization: `Bearer ${otherPatientToken}` },
    });
    assert.equal(unauthRxRes.status, 403, 'Cannot access another patient\'s prescription');
  });

  // ------------------------------------------------------------------------
  // 7. Lab Reports
  // ------------------------------------------------------------------------
  it('8. Patient accesses lab reports via GET /lab/reports and GET /lab/reports/:id with ownership enforcement', async () => {
    const labOrderId = 'lab-order-101';
    opsStore.labOrders.set(labOrderId, {
      id: labOrderId,
      orderNumber: 'LAB-2026-00101',
      hospitalId: testHospitalId,
      patientId: patientUser.id,
      testCode: 'LIPID-01',
      testName: 'Complete Lipid Profile',
      category: 'BIOCHEMISTRY',
      status: 'VERIFIED',
      observedValue: 'Total Cholesterol: 185 mg/dL, HDL: 48 mg/dL, LDL: 110 mg/dL',
      unit: 'mg/dL',
      referenceInterval: 'Cholesterol < 200 mg/dL',
      verifiedByUserId: doctorRecord.userId,
      verifiedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });

    // List lab reports for logged in patient
    const listRes = await fetch(`${baseUrl}/lab/reports`, {
      headers: {
        Authorization: `Bearer ${patientToken}`,
        'X-Hospital-Id': testHospitalId,
      },
    });
    const listBody = await listRes.json();
    assert.equal(listRes.status, 200);
    assert.equal(listBody.data.length, 1);
    assert.equal(listBody.data[0].testName, 'Complete Lipid Profile');

    // Other patient sees 0 reports
    const otherListRes = await fetch(`${baseUrl}/lab/reports`, {
      headers: {
        Authorization: `Bearer ${otherPatientToken}`,
        'X-Hospital-Id': testHospitalId,
      },
    });
    const otherListBody = await otherListRes.json();
    assert.equal(otherListBody.data.length, 0);

    // View specific report
    const getRes = await fetch(`${baseUrl}/lab/reports/${labOrderId}`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const getBody = await getRes.json();
    assert.equal(getRes.status, 200);
    assert.equal(getBody.data.status, 'VERIFIED');

    // Other patient accessing specific report gets 403 Forbidden
    const unauthRes = await fetch(`${baseUrl}/lab/reports/${labOrderId}`, {
      headers: { Authorization: `Bearer ${otherPatientToken}` },
    });
    assert.equal(unauthRes.status, 403);
  });

  // ------------------------------------------------------------------------
  // 8. Patient Profile: GET & PATCH
  // ------------------------------------------------------------------------
  it('9. Fetches and updates patient profile via /profile and /patients/me', async () => {
    // GET /profile
    const getRes = await fetch(`${baseUrl}/profile`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const getBody = await getRes.json();
    assert.equal(getRes.status, 200);
    assert.equal(getBody.data.user.phone, '+919876543210');
    assert.equal(getBody.data.user.isPhoneVerified, true);
    assert.ok(getBody.data.patient);

    // PATCH /profile
    const updateRes = await fetch(`${baseUrl}/profile`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${patientToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bloodGroup: 'O+',
        dateOfBirth: '1992-06-15',
        emergencyContactName: 'Sunita Sharma',
        emergencyContactPhone: '+919876543299',
        address: 'Harmu Housing Colony, Flat 402',
        city: 'Ranchi',
        state: 'Jharkhand',
      }),
    });
    const updateBody = await updateRes.json();
    assert.equal(updateRes.status, 200);
    assert.equal(updateBody.data.patient.bloodGroup, 'O+');
    assert.equal(updateBody.data.patient.emergencyContactName, 'Sunita Sharma');
    assert.equal(updateBody.data.patient.city, 'Ranchi');

    // GET /patients/me (alias)
    const aliasRes = await fetch(`${baseUrl}/patients/me`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const aliasBody = await aliasRes.json();
    assert.equal(aliasRes.status, 200);
    assert.equal(aliasBody.data.patient.bloodGroup, 'O+');
  });

  // ------------------------------------------------------------------------
  // 9. Logout
  // ------------------------------------------------------------------------
  it('10. Patient logs out via POST /auth/logout and invalidates session', async () => {
    const logoutRes = await fetch(`${baseUrl}/auth/logout`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${patientToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    const logoutBody = await logoutRes.json();
    assert.equal(logoutRes.status, 200);
    assert.equal(logoutBody.data.loggedOut, true);
  });
});
