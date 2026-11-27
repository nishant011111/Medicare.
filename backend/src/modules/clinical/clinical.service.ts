import crypto from 'crypto';
import { ApiError } from '../../utils/errors';
import { db } from '../../database/prisma';

export interface PatientRecord {
  id: string;
  userId: string;
  globalPatientId: string;
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  bloodGroup: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  address: string;
  city: string;
  state: string;
  hospitalLinks: Array<{
    hospitalId: string;
    hospitalRegistrationNumber: string;
    status: string;
    consentToShareWithHospitalIds: string[];
  }>;
}

export interface DoctorRecord {
  id: string;
  userId: string;
  fullName: string;
  medicalLicenseNumber: string;
  qualification: string;
  specialization: string;
  experienceYears: number;
  hospitalId: string;
  departmentId: string;
  departmentName: string;
  consultationFee: number;
  slotDurationMinutes: number;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
}

export interface AppointmentRecord {
  id: string;
  appointmentNumber: string;
  hospitalId: string;
  departmentId: string;
  doctorId: string;
  patientId: string;
  appointmentDate: string;
  slotStartTime: string;
  slotEndTime: string;
  timezone: string;
  type: 'OPD' | 'WALK_IN' | 'FOLLOW_UP';
  status: 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  reasonForVisit: string;
  bookedByUserId: string;
  statusHistory: Array<{
    fromStatus: string | null;
    toStatus: string;
    changedByUserId: string;
    changedByRole: string;
    notes?: string;
    changedAt: string;
  }>;
}

export interface EncounterRecord {
  id: string;
  patientId: string;
  hospitalId: string;
  doctorId: string;
  appointmentId?: string;
  status: 'DRAFT' | 'IN_PROGRESS' | 'FINALIZED' | 'AMENDED';
  version: number;
  symptoms: string;
  examinationFindings: string;
  assessment: string;
  diagnoses: Array<{ icd10Code: string; diagnosisName: string; classification: 'PRIMARY' | 'SECONDARY' }>;
  treatmentPlan?: {
    clinicalGoals: string;
    treatmentInstructions: string;
    followUpInstructions: string;
    reviewDate: string;
  };
  amendmentHistory: Array<{
    versionNumber: number;
    authorUserId: string;
    reason: string;
    symptoms: string;
    assessment: string;
    amendedAt: string;
  }>;
  finalizedAt?: string;
  createdAt: string;
}

export interface VitalRecord {
  id: string;
  patientId: string;
  hospitalId: string;
  systolicBp: number;
  diastolicBp: number;
  heartRateBpm: number;
  temperatureCelsius: number;
  respiratoryRate: number;
  oxygenSaturation: number;
  heightCm: number;
  weightKg: number;
  bmi: number;
  measurementSource: string;
  recordedByUserId: string;
  recordedAt: string;
}

export interface PrescriptionRecord {
  id: string;
  prescriptionNumber: string;
  patientId: string;
  doctorId: string;
  hospitalId: string;
  encounterId: string;
  status: 'DRAFT' | 'SIGNED' | 'DISPENSED' | 'CANCELLED';
  digitalSignature?: string;
  signedAt?: string;
  items: Array<{
    medicineName: string;
    strength: string;
    dosage: string;
    route: string;
    frequency: string;
    durationDays: number;
    quantity: number;
    instructions: string;
  }>;
}

class ClinicalStore {
  patients = new Map<string, PatientRecord>();
  doctors = new Map<string, DoctorRecord>();
  appointments = new Map<string, AppointmentRecord>();
  encounters = new Map<string, EncounterRecord>();
  vitals = new Map<string, interfaceVitalRecord[]>();
  allergies = new Map<string, Array<{ id: string; hospitalId: string; allergen: string; reaction: string; severity: string }>>();
  prescriptions = new Map<string, PrescriptionRecord>();

  reset() {
    this.patients.clear();
    this.doctors.clear();
    this.appointments.clear();
    this.encounters.clear();
    this.vitals.clear();
    this.allergies.clear();
    this.prescriptions.clear();
  }
}

export const clinicalStore = new ClinicalStore();

export class ClinicalService {
  static listPatients(hospitalId: string, search?: string) {
    const all = Array.from(clinicalStore.patients.values()).filter((p) =>
      p.hospitalLinks.some((l) => l.hospitalId === hospitalId || l.consentToShareWithHospitalIds.includes(hospitalId))
    );
    if (!search) return all;
    const q = search.toLowerCase();
    return all.filter(
      (p) =>
        p.fullName.toLowerCase().includes(q) ||
        p.globalPatientId.toLowerCase().includes(q) ||
        p.phone.includes(q)
    );
  }

  static registerPatientInHospital(hospitalId: string, payload: Partial<PatientRecord> & { fullName: string; phone: string }) {
    const id = crypto.randomUUID();
    const globalId = `MC-GLOBAL-2026-${String(clinicalStore.patients.size + 1).padStart(4, '0')}`;
    const regNo = `HOSP-REG-${Date.now().toString().slice(-5)}`;
    const record: PatientRecord = {
      id,
      userId: payload.userId || crypto.randomUUID(),
      globalPatientId: globalId,
      fullName: payload.fullName,
      email: payload.email || `${id.slice(0, 6)}@patient.medicore.in`,
      phone: payload.phone,
      dateOfBirth: payload.dateOfBirth || '1990-01-01',
      gender: payload.gender || 'Female',
      bloodGroup: payload.bloodGroup || 'B+',
      emergencyContactName: payload.emergencyContactName || 'Emergency Contact',
      emergencyContactPhone: payload.emergencyContactPhone || payload.phone,
      address: payload.address || 'Main Road',
      city: payload.city || 'Ranchi',
      state: payload.state || 'Jharkhand',
      hospitalLinks: [
        {
          hospitalId,
          hospitalRegistrationNumber: regNo,
          status: 'ACTIVE',
          consentToShareWithHospitalIds: [],
        },
      ],
    };
    clinicalStore.patients.set(id, record);
    return record;
  }

  static grantCrossHospitalEhrConsent(patientId: string, sourceHospitalId: string, targetHospitalId: string) {
    const patient = clinicalStore.patients.get(patientId);
    if (!patient) throw ApiError.notFound('Patient not found');
    const link = patient.hospitalLinks.find((l) => l.hospitalId === sourceHospitalId);
    if (!link) throw ApiError.forbidden('Patient has no primary link at source hospital');
    if (!link.consentToShareWithHospitalIds.includes(targetHospitalId)) {
      link.consentToShareWithHospitalIds.push(targetHospitalId);
    }
    return patient;
  }

  static bookAppointment(
    hospitalId: string,
    bookedByUserId: string,
    payload: {
      departmentId: string;
      doctorId: string;
      patientId: string;
      appointmentDate: string;
      slotStartTime: string;
      slotEndTime: string;
      type?: 'OPD' | 'WALK_IN' | 'FOLLOW_UP';
      reasonForVisit: string;
    }
  ) {
    // Prevent double-booking of the same doctor + date + slotStartTime unless cancelled
    const conflict = Array.from(clinicalStore.appointments.values()).find(
      (a) =>
        a.doctorId === payload.doctorId &&
        a.appointmentDate === payload.appointmentDate &&
        a.slotStartTime === payload.slotStartTime &&
        a.status !== 'CANCELLED'
    );
    if (conflict) {
      throw ApiError.conflict(
        `Slot ${payload.slotStartTime} on ${payload.appointmentDate} is already booked for this doctor`,
        'SLOT_ALREADY_BOOKED'
      );
    }

    const id = crypto.randomUUID();
    const record: AppointmentRecord = {
      id,
      appointmentNumber: `APT-${Date.now().toString().slice(-6)}`,
      hospitalId,
      departmentId: payload.departmentId,
      doctorId: payload.doctorId,
      patientId: payload.patientId,
      appointmentDate: payload.appointmentDate,
      slotStartTime: payload.slotStartTime,
      slotEndTime: payload.slotEndTime,
      timezone: 'Asia/Kolkata',
      type: payload.type || 'OPD',
      status: 'CONFIRMED',
      reasonForVisit: payload.reasonForVisit,
      bookedByUserId,
      statusHistory: [
        {
          fromStatus: null,
          toStatus: 'CONFIRMED',
          changedByUserId: bookedByUserId,
          changedByRole: 'PATIENT',
          notes: 'Appointment booked and confirmed',
          changedAt: new Date().toISOString(),
        },
      ],
    };
    clinicalStore.appointments.set(id, record);
    return record;
  }

  static recordVitals(
    hospitalId: string,
    recordedByUserId: string,
    payload: {
      patientId: string;
      systolicBp: number;
      diastolicBp: number;
      heartRateBpm: number;
      temperatureCelsius: number;
      respiratoryRate: number;
      oxygenSaturation: number;
      heightCm: number;
      weightKg: number;
      measurementSource?: string;
    }
  ) {
    const heightM = payload.heightCm / 100;
    const bmi = Number((payload.weightKg / (heightM * heightM)).toFixed(2));
    const entry: interfaceVitalRecord = {
      id: crypto.randomUUID(),
      patientId: payload.patientId,
      hospitalId,
      systolicBp: payload.systolicBp,
      diastolicBp: payload.diastolicBp,
      heartRateBpm: payload.heartRateBpm,
      temperatureCelsius: payload.temperatureCelsius,
      respiratoryRate: payload.respiratoryRate,
      oxygenSaturation: payload.oxygenSaturation,
      heightCm: payload.heightCm,
      weightKg: payload.weightKg,
      bmi,
      measurementSource: payload.measurementSource || 'Ward Vital Monitor',
      recordedByUserId,
      recordedAt: new Date().toISOString(),
    };
    const existing = clinicalStore.vitals.get(payload.patientId) || [];
    existing.unshift(entry);
    clinicalStore.vitals.set(payload.patientId, existing);
    return entry;
  }

  static amendFinalizedEncounter(
    encounterId: string,
    hospitalId: string,
    authorUserId: string,
    payload: { reason: string; symptoms: string; assessment: string }
  ) {
    const enc = clinicalStore.encounters.get(encounterId);
    if (!enc || enc.hospitalId !== hospitalId) {
      throw ApiError.notFound('Encounter not found in this hospital');
    }
    if (!payload.reason || payload.reason.trim().length < 5) {
      throw ApiError.badRequest('Amendment reason is required for finalized clinical encounters');
    }
    // Preserve previous snapshot in amendmentHistory rather than silently overwriting
    enc.amendmentHistory.push({
      versionNumber: enc.version,
      authorUserId,
      reason: payload.reason,
      symptoms: enc.symptoms,
      assessment: enc.assessment,
      amendedAt: new Date().toISOString(),
    });
    enc.version += 1;
    enc.status = 'AMENDED';
    enc.symptoms = payload.symptoms;
    enc.assessment = payload.assessment;
    db.logAudit({
      userId: authorUserId,
      hospitalId,
      action: 'CLINICAL_ENCOUNTER_AMENDED',
      entityType: 'Encounter',
      entityId: encounterId,
      ipAddress: null,
      userAgent: null,
      metadata: { newVersion: enc.version, reason: payload.reason },
    });
    return enc;
  }

  static getPatientEhrTimeline(patientId: string, hospitalId: string) {
    const patient = clinicalStore.patients.get(patientId);
    if (!patient) throw ApiError.notFound('Patient not found');
    const authorized = patient.hospitalLinks.some(
      (l) => l.hospitalId === hospitalId || l.consentToShareWithHospitalIds.includes(hospitalId)
    );
    if (!authorized) {
      throw ApiError.forbidden(
        'Cross-hospital EHR access denied without explicit patient consent',
        'EHR_CONSENT_REQUIRED'
      );
    }

    const encounters = Array.from(clinicalStore.encounters.values()).filter((e) => e.patientId === patientId);
    const vitals = clinicalStore.vitals.get(patientId) || [];
    const allergies = clinicalStore.allergies.get(patientId) || [];
    const prescriptions = Array.from(clinicalStore.prescriptions.values()).filter((p) => p.patientId === patientId);

    return {
      patient,
      allergies,
      vitals,
      encounters,
      prescriptions,
    };
  }
}
