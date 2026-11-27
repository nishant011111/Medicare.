import { db } from '../../database/prisma';
import { clinicalStore } from '../clinical/clinical.service';
import { directoryStore } from '../directory/directory.service';
import { opsStore } from '../operations/operations.service';
import { securityStore } from '../security/security.service';
import { PatientProfileService } from './patient-profile.service';

export class PatientDashboardService {
  private static resolveHospitalDisplay(hospitalId: string) {
    const h = db.hospitals.get(hospitalId);
    if (h) {
      return { id: h.id, name: h.name, city: h.city };
    }
    const dir = directoryStore.records.get(hospitalId);
    if (dir) {
      return { id: dir.id, name: dir.displayName, city: dir.city };
    }
    return { id: hospitalId, name: 'Hospital', city: '' };
  }

  private static resolveDoctorDisplay(doctorId: string) {
    const doc = clinicalStore.doctors.get(doctorId);
    if (doc) {
      return { id: doc.id, name: doc.fullName, specialization: doc.specialization };
    }
    return { id: doctorId, name: 'Doctor', specialization: '' };
  }

  static getDashboard(userId: string) {
    const fullProfile = PatientProfileService.getFullProfile(userId);
    const patientId = fullProfile.patient.id;

    const upcomingAppointments = this.getUpcomingAppointments(userId, 1, 5).items;
    const recentPrescriptions = this.getRecentPrescriptions(userId, 1, 5).items;
    const recentLabReports = this.getRecentLabReports(userId, 1, 5).items;
    const recentActivities = this.getActivities(userId, 1, 8).items;

    const healthInfo = fullProfile.healthInformation;
    const hospitalRecordedAllergies = (clinicalStore.allergies.get(patientId) || []).map((a) => a.allergen);
    const mergedAllergies = Array.from(
      new Set([...(healthInfo?.knownAllergies || []), ...hospitalRecordedAllergies])
    );

    const unreadNotificationCount = Array.from(securityStore.outbox.values()).filter(
      (n) => n.recipientUserId === userId && !n.readAt
    ).length;

    const allOwnedAppointments = Array.from(clinicalStore.appointments.values()).filter(
      (a) => a.patientId === patientId || a.patientId === userId || a.bookedByUserId === userId
    );
    const allOwnedRx = Array.from(clinicalStore.prescriptions.values()).filter(
      (p) => p.patientId === patientId || p.patientId === userId
    );
    const allOwnedLabs = Array.from(opsStore.labOrders.values()).filter(
      (l) => l.patientId === patientId || l.patientId === userId
    );

    return {
      patient: {
        id: fullProfile.patient.id,
        userId: fullProfile.user.id,
        globalPatientId: fullProfile.patient.globalPatientId,
        fullName: fullProfile.user.fullName,
        firstName: fullProfile.user.fullName.trim().split(/\s+/)[0] || fullProfile.user.fullName,
        email: fullProfile.user.email,
        phone: fullProfile.user.phone,
        isEmailVerified: fullProfile.user.isEmailVerified,
        hasProfilePhoto: Boolean(fullProfile.profilePhoto),
        profilePhotoUrl: fullProfile.profilePhoto?.url ?? null,
        onboardingCompleted: fullProfile.patient.onboardingCompleted,
        profileCompletionPercent: fullProfile.profileCompletion.percent,
        missingRequiredSections: fullProfile.profileCompletion.missingRequiredSections,
      },
      healthOverview: {
        healthConsentGranted: fullProfile.patient.healthConsentGranted,
        bloodGroup: healthInfo?.bloodGroup ?? null,
        knownAllergies: mergedAllergies,
        existingConditions: healthInfo?.existingConditions ?? [],
        currentMedications: healthInfo?.currentMedications ?? [],
        hasAnyHealthInfo: Boolean(
          healthInfo?.bloodGroup ||
            mergedAllergies.length > 0 ||
            (healthInfo?.existingConditions.length ?? 0) > 0 ||
            (healthInfo?.currentMedications.length ?? 0) > 0
        ),
      },
      nextAppointment: upcomingAppointments[0] ?? null,
      upcomingAppointments,
      recentPrescriptions,
      recentLabReports,
      recentActivities,
      quickStats: {
        upcomingAppointmentCount: upcomingAppointments.length,
        totalAppointmentCount: allOwnedAppointments.length,
        prescriptionCount: allOwnedRx.length,
        labReportCount: allOwnedLabs.length,
        linkedHospitalCount: fullProfile.hospitalAssociations.length,
      },
      unreadNotificationCount,
      serverTimestamp: new Date().toISOString(),
    };
  }

  static getUpcomingAppointments(userId: string, page = 1, limit = 10) {
    const profile = PatientProfileService.ensurePatientProfile(userId);
    const today = new Date().toISOString().slice(0, 10);

    const matching = Array.from(clinicalStore.appointments.values())
      .filter(
        (a) =>
          (a.patientId === profile.id || a.patientId === userId || a.bookedByUserId === userId) &&
          ['PENDING', 'CONFIRMED', 'CHECKED_IN'].includes(a.status) &&
          a.appointmentDate >= today
      )
      .sort((a, b) => {
        const dtA = `${a.appointmentDate}T${a.slotStartTime}`;
        const dtB = `${b.appointmentDate}T${b.slotStartTime}`;
        return dtA.localeCompare(dtB);
      })
      .map((a) => {
        const hospital = this.resolveHospitalDisplay(a.hospitalId);
        const doctor = this.resolveDoctorDisplay(a.doctorId);
        return {
          id: a.id,
          appointmentNumber: a.appointmentNumber,
          hospitalId: a.hospitalId,
          hospitalName: hospital.name,
          hospitalCity: hospital.city,
          doctorId: a.doctorId,
          doctorName: doctor.name,
          doctorSpecialization: doctor.specialization,
          appointmentDate: a.appointmentDate,
          slotStartTime: a.slotStartTime,
          slotEndTime: a.slotEndTime,
          timezone: a.timezone,
          type: a.type,
          status: a.status,
          reasonForVisit: a.reasonForVisit,
        };
      });

    const total = matching.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const items = matching.slice((page - 1) * limit, page * limit);
    return { items, meta: { page, limit, total, totalPages } };
  }

  static getRecentPrescriptions(userId: string, page = 1, limit = 10) {
    const profile = PatientProfileService.ensurePatientProfile(userId);
    const matching = Array.from(clinicalStore.prescriptions.values())
      .filter((p) => p.patientId === profile.id || p.patientId === userId)
      .sort((a, b) => (b.signedAt || '').localeCompare(a.signedAt || ''))
      .map((p) => {
        const hospital = this.resolveHospitalDisplay(p.hospitalId);
        const doctor = this.resolveDoctorDisplay(p.doctorId);
        return {
          id: p.id,
          prescriptionNumber: p.prescriptionNumber,
          hospitalId: p.hospitalId,
          hospitalName: hospital.name,
          doctorId: p.doctorId,
          doctorName: doctor.name,
          status: p.status,
          signedAt: p.signedAt ?? null,
          medicineCount: p.items.length,
          medicinesSummary: p.items.map((m) => `${m.medicineName} (${m.dosage})`),
        };
      });

    const total = matching.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const items = matching.slice((page - 1) * limit, page * limit);
    return { items, meta: { page, limit, total, totalPages } };
  }

  static getRecentLabReports(userId: string, page = 1, limit = 10) {
    const profile = PatientProfileService.ensurePatientProfile(userId);
    const matching = Array.from(opsStore.labOrders.values())
      .filter((l) => l.patientId === profile.id || l.patientId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((l) => {
        const hospital = this.resolveHospitalDisplay(l.hospitalId);
        return {
          id: l.id,
          orderNumber: l.orderNumber,
          hospitalId: l.hospitalId,
          hospitalName: hospital.name,
          testCode: l.testCode,
          testName: l.testName,
          category: l.category,
          status: l.status,
          observedValue: l.status === 'VERIFIED' || l.status === 'COMPLETED' ? l.observedValue ?? null : null,
          unit: l.unit,
          referenceInterval: l.referenceInterval,
          verifiedAt: l.verifiedAt ?? null,
          createdAt: l.createdAt,
        };
      });

    const total = matching.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const items = matching.slice((page - 1) * limit, page * limit);
    return { items, meta: { page, limit, total, totalPages } };
  }

  static getActivities(userId: string, page = 1, limit = 15) {
    const safeActions = new Set([
      'AUTH_PATIENT_REGISTER',
      'AUTH_EMAIL_VERIFIED',
      'PATIENT_ONBOARDING_COMPLETED',
      'PATIENT_PERSONAL_INFO_UPDATED',
      'PATIENT_ADDRESS_UPDATED',
      'PATIENT_EMERGENCY_CONTACT_ADDED',
      'PATIENT_HEALTH_INFO_UPDATED',
      'PATIENT_PROFILE_PHOTO_UPLOADED',
      'PATIENT_APPOINTMENT_BOOKED',
      'PATIENT_APPOINTMENT_CANCELLED',
    ]);

    const labelMap: Record<string, string> = {
      AUTH_PATIENT_REGISTER: 'Account Registered',
      AUTH_EMAIL_VERIFIED: 'Email Address Verified',
      PATIENT_ONBOARDING_COMPLETED: 'Profile Onboarding Completed',
      PATIENT_PERSONAL_INFO_UPDATED: 'Personal Information Updated',
      PATIENT_ADDRESS_UPDATED: 'Residential Address Updated',
      PATIENT_EMERGENCY_CONTACT_ADDED: 'Emergency Contact Added',
      PATIENT_HEALTH_INFO_UPDATED: 'Health Information Updated',
      PATIENT_PROFILE_PHOTO_UPLOADED: 'Profile Photo Updated',
      PATIENT_APPOINTMENT_BOOKED: 'Appointment Booked',
      PATIENT_APPOINTMENT_CANCELLED: 'Appointment Cancelled',
    };

    const itemsAll = db.auditLogs
      .filter((log) => log.userId === userId && safeActions.has(log.action))
      .map((log) => ({
        id: log.id,
        action: log.action,
        title: labelMap[log.action] || log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        timestamp: log.createdAt.toISOString(),
      }));

    const total = itemsAll.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const items = itemsAll.slice((page - 1) * limit, page * limit);
    return { items, meta: { page, limit, total, totalPages } };
  }
}
