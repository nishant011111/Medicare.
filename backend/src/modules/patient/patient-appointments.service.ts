import crypto from 'crypto';
import { db, withTransaction } from '../../database/prisma';
import { ApiError } from '../../utils/errors';
import { EmailDeliveryService } from '../../utils/email';
import { AppointmentRecord, clinicalStore } from '../clinical/clinical.service';
import { directoryStore } from '../directory/directory.service';
import { SecurityAndNotificationService } from '../security/security.service';
import { validateDiscoveryIdentifier } from './patient-discovery.schema';
import { PatientProfileService } from './patient-profile.service';

export interface TimeSlotDto {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  isBooked: boolean;
  isBlocked: boolean;
  isPast: boolean;
  unavailableReason: string | null;
}

export interface AvailableDateSummaryDto {
  date: string;
  dayOfWeek: number;
  dayName: string;
  availableSlotCount: number;
}

export interface PatientAppointmentDto {
  id: string;
  appointmentNumber: string;
  hospitalId: string;
  hospitalName: string;
  hospitalAddress: string;
  hospitalCity: string;
  departmentId: string;
  departmentName: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialization: string;
  doctorQualification: string;
  consultationFee: number | null;
  appointmentDate: string;
  slotStartTime: string;
  slotEndTime: string;
  timezone: string;
  type: 'OPD' | 'WALK_IN' | 'FOLLOW_UP';
  status: string;
  reasonForVisit: string;
  cancellationReason: string | null;
  canCancel: boolean;
  cancellationPolicyHours: number | null;
  statusHistory: Array<{
    fromStatus: string | null;
    toStatus: string;
    changedByRole: string;
    notes?: string;
    changedAt: string;
  }>;
  createdAt: string;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const slotMutexLocks = new Set<string>();

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(totalMin: number): string {
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function getLocalDateAndTimeInTimezone(timezone: string): { dateStr: string; timeStr: string } {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone || 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(new Date());
    const map = new Map(parts.map((p) => [p.type, p.value]));
    const dateStr = `${map.get('year')}-${map.get('month')}-${map.get('day')}`;
    const hr = map.get('hour') === '24' ? '00' : map.get('hour') || '00';
    const min = map.get('minute') || '00';
    return { dateStr, timeStr: `${hr}:${min}` };
  } catch {
    const now = new Date();
    return {
      dateStr: now.toISOString().slice(0, 10),
      timeStr: now.toISOString().slice(11, 16),
    };
  }
}

export class PatientAppointmentsService {
  private static resolveHospitalInfo(hospitalIdOrCode: string) {
    const q = hospitalIdOrCode.trim().toLowerCase();
    const hosp = Array.from(db.hospitals.values()).find((h) => h.id.toLowerCase() === q);
    if (hosp) {
      if (!['APPROVED', 'ACTIVE'].includes(hosp.status)) {
        throw ApiError.badRequest('Selected hospital is not currently accepting appointments', 'HOSPITAL_NOT_ACTIVE');
      }
      const dir = directoryStore.records.get(hosp.id);
      return {
        id: hosp.id,
        code: dir?.directoryCode ?? null,
        name: hosp.name,
        address: hosp.address,
        city: hosp.city,
        timezone: 'Asia/Kolkata',
        cancellationPolicyHours: hosp.cancellationPolicyHours ?? null,
      };
    }

    const dir = Array.from(directoryStore.records.values()).find(
      (d) => d.id.toLowerCase() === q || d.directoryCode?.toLowerCase() === q
    );
    if (!dir || dir.verificationStatus === 'REJECTED' || dir.verificationStatus === 'SUSPENDED') {
      throw ApiError.notFound('Hospital not found', 'HOSPITAL_NOT_FOUND');
    }
    return {
      id: dir.id,
      code: dir.directoryCode,
      name: dir.displayName,
      address: dir.address,
      city: dir.city,
      timezone: 'Asia/Kolkata',
      cancellationPolicyHours: null,
    };
  }

  private static resolveHospitalDisplayForRecord(hospitalId: string) {
    const h = db.hospitals.get(hospitalId);
    if (h) {
      return {
        name: h.name,
        address: h.address,
        city: h.city,
        cancellationPolicyHours: h.cancellationPolicyHours ?? null,
      };
    }
    const dir = directoryStore.records.get(hospitalId);
    if (dir) {
      return {
        name: dir.displayName,
        address: dir.address,
        city: dir.city,
        cancellationPolicyHours: null,
      };
    }
    return { name: 'Hospital', address: '', city: '', cancellationPolicyHours: null };
  }

  private static computeSlotsForDate(
    doctorId: string,
    hospitalId: string,
    date: string,
    timezone: string
  ): TimeSlotDto[] {
    const dayOfWeek = new Date(`${date}T00:00:00Z`).getUTCDay();
    const rules = (clinicalStore.doctorAvailabilities.get(doctorId) || []).filter(
      (r) => r.isActive && r.dayOfWeek === dayOfWeek && (r.hospitalId === hospitalId || !hospitalId)
    );
    if (rules.length === 0) {
      return [];
    }

    const blockedRules = (clinicalStore.doctorBlockedTimes.get(doctorId) || []).filter(
      (b) => b.blockedDate === date && (b.hospitalId === hospitalId || !hospitalId)
    );
    if (blockedRules.some((b) => b.isFullDayLeave)) {
      return [];
    }

    const activeAppointments = Array.from(clinicalStore.appointments.values()).filter(
      (a) =>
        a.doctorId === doctorId &&
        a.appointmentDate === date &&
        !['CANCELLED', 'NO_SHOW'].includes(a.status)
    );
    const bookedTimes = new Set(activeAppointments.map((a) => a.slotStartTime));

    const nowInTz = getLocalDateAndTimeInTimezone(timezone);
    const seenStarts = new Set<string>();
    const slots: TimeSlotDto[] = [];

    for (const rule of rules) {
      const startMin = timeToMinutes(rule.startTime);
      const endMin = timeToMinutes(rule.endTime);
      const duration = Math.max(10, rule.slotDurationMinutes || 30);

      for (let cursor = startMin; cursor + duration <= endMin; cursor += duration) {
        const slotStart = minutesToTime(cursor);
        const slotEnd = minutesToTime(cursor + duration);
        if (seenStarts.has(slotStart)) continue;
        seenStarts.add(slotStart);

        const isBooked = bookedTimes.has(slotStart);
        const blockedEntry = blockedRules.find(
          (b) =>
            !b.isFullDayLeave &&
            b.startTime &&
            b.endTime &&
            cursor < timeToMinutes(b.endTime) &&
            cursor + duration > timeToMinutes(b.startTime)
        );
        const isBlocked = Boolean(blockedEntry);
        const isPast =
          date < nowInTz.dateStr || (date === nowInTz.dateStr && slotStart <= nowInTz.timeStr);

        let unavailableReason: string | null = null;
        if (isBooked) unavailableReason = 'Already booked';
        else if (isBlocked) unavailableReason = blockedEntry?.reason || 'Doctor unavailable';
        else if (isPast) unavailableReason = 'Time passed';

        slots.push({
          startTime: slotStart,
          endTime: slotEnd,
          isAvailable: !isBooked && !isBlocked && !isPast,
          isBooked,
          isBlocked,
          isPast,
          unavailableReason,
        });
      }
    }

    slots.sort((a, b) => a.startTime.localeCompare(b.startTime));
    return slots;
  }

  static getDoctorAvailability(
    doctorId: string,
    params: { date?: string; hospitalId?: string; days: number }
  ) {
    if (!validateDiscoveryIdentifier(doctorId)) {
      throw ApiError.badRequest('Invalid doctor ID format', 'INVALID_DOCTOR_ID');
    }
    const doctor = clinicalStore.doctors.get(doctorId);
    if (!doctor || doctor.verificationStatus === 'REJECTED') {
      throw ApiError.notFound('Doctor not found', 'DOCTOR_NOT_FOUND');
    }

    const targetHospitalId = params.hospitalId || doctor.hospitalId;
    if (
      params.hospitalId &&
      params.hospitalId !== doctor.hospitalId &&
      this.resolveHospitalInfo(params.hospitalId).id !== doctor.hospitalId
    ) {
      throw ApiError.badRequest(
        'Selected doctor does not practice at the specified hospital',
        'DOCTOR_HOSPITAL_MISMATCH'
      );
    }

    const allRules = (clinicalStore.doctorAvailabilities.get(doctorId) || []).filter(
      (r) => r.isActive && r.hospitalId === doctor.hospitalId
    );
    const timezone = allRules[0]?.timezone || 'Asia/Kolkata';
    const nowInTz = getLocalDateAndTimeInTimezone(timezone);
    const requestedDate = params.date || nowInTz.dateStr;

    if (requestedDate < nowInTz.dateStr) {
      return {
        doctorId: doctor.id,
        hospitalId: doctor.hospitalId,
        date: requestedDate,
        timezone,
        hasScheduleConfigured: allRules.length > 0,
        slots: [] as TimeSlotDto[],
        availableDates: [] as AvailableDateSummaryDto[],
      };
    }

    const slots = this.computeSlotsForDate(doctor.id, doctor.hospitalId, requestedDate, timezone);

    const availableDates: AvailableDateSummaryDto[] = [];
    const baseUtc = new Date(`${nowInTz.dateStr}T00:00:00Z`);
    for (let offset = 0; offset < params.days; offset++) {
      const d = new Date(baseUtc.getTime() + offset * 86400000);
      const dStr = d.toISOString().slice(0, 10);
      const daySlots = this.computeSlotsForDate(doctor.id, doctor.hospitalId, dStr, timezone);
      const openCount = daySlots.filter((s) => s.isAvailable).length;
      if (openCount > 0) {
        availableDates.push({
          date: dStr,
          dayOfWeek: d.getUTCDay(),
          dayName: DAY_NAMES[d.getUTCDay()] || 'Day',
          availableSlotCount: openCount,
        });
      }
    }

    return {
      doctorId: doctor.id,
      hospitalId: doctor.hospitalId,
      date: requestedDate,
      timezone,
      hasScheduleConfigured: allRules.length > 0,
      slots,
      availableDates,
    };
  }

  static async bookAppointment(
    userId: string,
    input: {
      hospitalId: string;
      doctorId: string;
      appointmentDate: string;
      slotStartTime: string;
      type: 'OPD' | 'FOLLOW_UP';
      reasonForVisit: string;
    }
  ) {
    if (!validateDiscoveryIdentifier(input.hospitalId)) {
      throw ApiError.badRequest('Invalid hospital ID format', 'INVALID_HOSPITAL_ID');
    }
    if (!validateDiscoveryIdentifier(input.doctorId)) {
      throw ApiError.badRequest('Invalid doctor ID format', 'INVALID_DOCTOR_ID');
    }

    const hospitalInfo = this.resolveHospitalInfo(input.hospitalId);
    const doctor = clinicalStore.doctors.get(input.doctorId);
    if (!doctor || doctor.verificationStatus === 'REJECTED') {
      throw ApiError.notFound('Doctor not found', 'DOCTOR_NOT_FOUND');
    }

    if (
      doctor.hospitalId !== hospitalInfo.id &&
      (!hospitalInfo.code || doctor.hospitalId !== hospitalInfo.code)
    ) {
      throw ApiError.badRequest(
        'Selected doctor does not belong to the selected hospital',
        'DOCTOR_HOSPITAL_MISMATCH'
      );
    }

    const profile = PatientProfileService.ensurePatientProfile(userId);
    const lockKey = `${doctor.id}::${input.appointmentDate}::${input.slotStartTime}`;
    if (slotMutexLocks.has(lockKey)) {
      throw ApiError.conflict(
        `Slot ${input.slotStartTime} on ${input.appointmentDate} is currently being booked by another request`,
        'SLOT_ALREADY_BOOKED'
      );
    }

    slotMutexLocks.add(lockKey);
    let record: AppointmentRecord;
    try {
      record = await withTransaction(async () => {
        const avail = this.getDoctorAvailability(doctor.id, {
          date: input.appointmentDate,
          hospitalId: doctor.hospitalId,
          days: 1,
        });

        const targetSlot = avail.slots.find((s) => s.startTime === input.slotStartTime);
        if (!targetSlot) {
          throw ApiError.badRequest(
            'Requested time slot is outside the doctor\'s configured schedule for this date',
            'SLOT_UNAVAILABLE'
          );
        }
        if (targetSlot.isBooked) {
          throw ApiError.conflict(
            `Slot ${input.slotStartTime} on ${input.appointmentDate} is already booked`,
            'SLOT_ALREADY_BOOKED'
          );
        }
        if (!targetSlot.isAvailable) {
          throw ApiError.badRequest(
            targetSlot.unavailableReason || 'Selected time slot is unavailable',
            'SLOT_UNAVAILABLE'
          );
        }

        const existingConflict = Array.from(clinicalStore.appointments.values()).find(
          (a) =>
            a.doctorId === doctor.id &&
            a.appointmentDate === input.appointmentDate &&
            a.slotStartTime === input.slotStartTime &&
            !['CANCELLED', 'NO_SHOW'].includes(a.status)
        );
        if (existingConflict) {
          throw ApiError.conflict(
            `Slot ${input.slotStartTime} on ${input.appointmentDate} is already booked`,
            'SLOT_ALREADY_BOOKED'
          );
        }

        // Prevent duplicate overlapping appointment for same patient at exact same date & time
        const patientOverlap = Array.from(clinicalStore.appointments.values()).find(
          (a) =>
            (a.patientId === profile.id || a.bookedByUserId === userId) &&
            a.appointmentDate === input.appointmentDate &&
            a.slotStartTime === input.slotStartTime &&
            !['CANCELLED', 'NO_SHOW'].includes(a.status)
        );
        if (patientOverlap) {
          throw ApiError.conflict(
            'You already have another active appointment scheduled at this date and time',
            'PATIENT_OVERLAPPING_BOOKING'
          );
        }

        const nowIso = new Date().toISOString();
        const id = crypto.randomUUID();
        const created: AppointmentRecord = {
          id,
          appointmentNumber: `APT-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 90 + 10)}`,
          hospitalId: hospitalInfo.id,
          departmentId: doctor.departmentId,
          doctorId: doctor.id,
          patientId: profile.id,
          appointmentDate: input.appointmentDate,
          slotStartTime: targetSlot.startTime,
          slotEndTime: targetSlot.endTime,
          timezone: avail.timezone,
          type: input.type,
          status: 'CONFIRMED',
          reasonForVisit: input.reasonForVisit.trim() || 'Consultation',
          bookedByUserId: userId,
          statusHistory: [
            {
              fromStatus: null,
              toStatus: 'CONFIRMED',
              changedByUserId: userId,
              changedByRole: 'PATIENT',
              notes: 'Booked by patient',
              changedAt: nowIso,
            },
          ],
        };
        clinicalStore.appointments.set(id, created);

        // Link patient to hospital explicitly upon booking
        const hasMembership = Array.from(db.memberships.values()).some(
          (m) => m.userId === userId && m.hospitalId === hospitalInfo.id
        );
        if (!hasMembership && db.hospitals.has(hospitalInfo.id)) {
          const mId = crypto.randomUUID();
          const now = new Date();
          db.memberships.set(mId, {
            id: mId,
            userId,
            hospitalId: hospitalInfo.id,
            department: doctor.departmentName,
            employeeCode: null,
            status: 'ACTIVE',
            joinedAt: now,
            createdAt: now,
            updatedAt: now,
          });
        }

        return created;
      });
    } finally {
      slotMutexLocks.delete(lockKey);
    }

    db.logAudit({
      userId,
      hospitalId: record.hospitalId,
      action: 'PATIENT_APPOINTMENT_BOOKED',
      entityType: 'Appointment',
      entityId: record.id,
      ipAddress: null,
      userAgent: null,
      metadata: {
        appointmentNumber: record.appointmentNumber,
        doctorId: record.doctorId,
        appointmentDate: record.appointmentDate,
        slotStartTime: record.slotStartTime,
      },
    });

    SecurityAndNotificationService.enqueueOutboxNotification({
      idempotencyKey: `appt-booked-${record.id}`,
      hospitalId: record.hospitalId,
      recipientUserId: userId,
      category: 'APPOINTMENT',
      eventType: 'APPOINTMENT_CONFIRMED',
      authenticatedBody: `Appointment ${record.appointmentNumber} confirmed with ${doctor.fullName} on ${record.appointmentDate} at ${record.slotStartTime}.`,
      deepLinkRoute: 'appointments',
    });

    return {
      appointment: this.toAppointmentDto(record),
      notificationDispatch: {
        inAppNotificationQueued: true,
        pushConfigured: false,
        smsConfigured: false,
        emailConfigured: EmailDeliveryService.isConfigured(),
      },
    };
  }

  static listAppointments(
    userId: string,
    params: { filter: 'ALL' | 'UPCOMING' | 'PAST'; page: number; limit: number }
  ) {
    const profile = PatientProfileService.ensurePatientProfile(userId);
    const today = getLocalDateAndTimeInTimezone('Asia/Kolkata').dateStr;

    let items = Array.from(clinicalStore.appointments.values()).filter(
      (a) => a.patientId === profile.id || a.patientId === userId || a.bookedByUserId === userId
    );

    if (params.filter === 'UPCOMING') {
      items = items.filter(
        (a) =>
          ['PENDING', 'CONFIRMED', 'CHECKED_IN'].includes(a.status) && a.appointmentDate >= today
      );
      items.sort((a, b) =>
        `${a.appointmentDate}T${a.slotStartTime}`.localeCompare(`${b.appointmentDate}T${b.slotStartTime}`)
      );
    } else if (params.filter === 'PAST') {
      items = items.filter(
        (a) =>
          ['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(a.status) || a.appointmentDate < today
      );
      items.sort((a, b) =>
        `${b.appointmentDate}T${b.slotStartTime}`.localeCompare(`${a.appointmentDate}T${a.slotStartTime}`)
      );
    } else {
      items.sort((a, b) =>
        `${b.appointmentDate}T${b.slotStartTime}`.localeCompare(`${a.appointmentDate}T${a.slotStartTime}`)
      );
    }

    const total = items.length;
    const totalPages = Math.max(1, Math.ceil(total / params.limit));
    const paged = items
      .slice((params.page - 1) * params.limit, params.page * params.limit)
      .map((a) => this.toAppointmentDto(a));

    return {
      items: paged,
      meta: { page: params.page, limit: params.limit, total, totalPages },
    };
  }

  static getAppointmentById(userId: string, appointmentId: string): PatientAppointmentDto {
    if (!validateDiscoveryIdentifier(appointmentId)) {
      throw ApiError.badRequest('Invalid appointment ID format', 'INVALID_APPOINTMENT_ID');
    }
    const profile = PatientProfileService.ensurePatientProfile(userId);
    const appt = clinicalStore.appointments.get(appointmentId);
    if (!appt) {
      throw ApiError.notFound('Appointment not found', 'APPOINTMENT_NOT_FOUND');
    }

    const isOwner =
      appt.bookedByUserId === userId || appt.patientId === profile.id || appt.patientId === userId;
    if (!isOwner) {
      throw ApiError.forbidden('You are not authorized to access this appointment');
    }

    return this.toAppointmentDto(appt);
  }

  static async cancelAppointment(userId: string, appointmentId: string, reason?: string) {
    if (!validateDiscoveryIdentifier(appointmentId)) {
      throw ApiError.badRequest('Invalid appointment ID format', 'INVALID_APPOINTMENT_ID');
    }

    const profile = PatientProfileService.ensurePatientProfile(userId);
    const appt = clinicalStore.appointments.get(appointmentId);
    if (!appt) {
      throw ApiError.notFound('Appointment not found', 'APPOINTMENT_NOT_FOUND');
    }

    const isOwner =
      appt.bookedByUserId === userId || appt.patientId === profile.id || appt.patientId === userId;
    if (!isOwner) {
      throw ApiError.forbidden('You are not authorized to cancel another patient\'s appointment');
    }

    if (!['PENDING', 'CONFIRMED', 'CHECKED_IN'].includes(appt.status)) {
      throw ApiError.badRequest(
        `Appointment with status ${appt.status} cannot be cancelled`,
        'CANCELLATION_NOT_ELIGIBLE'
      );
    }

    // Enforce backend hospital cancellation cutoff ONLY if configured on the hospital
    const hospital = db.hospitals.get(appt.hospitalId);
    const policyHours = hospital?.cancellationPolicyHours ?? null;
    if (policyHours !== null && policyHours > 0) {
      const apptTimestamp = Date.parse(`${appt.appointmentDate}T${appt.slotStartTime}:00+05:30`);
      if (!Number.isNaN(apptTimestamp)) {
        const hoursUntil = (apptTimestamp - Date.now()) / (1000 * 60 * 60);
        if (hoursUntil < policyHours) {
          throw ApiError.badRequest(
            `Hospital policy requires cancellation at least ${policyHours} hours before appointment time`,
            'CANCELLATION_CUTOFF_PASSED'
          );
        }
      }
    }

    await withTransaction(async () => {
      const prevStatus = appt.status;
      appt.status = 'CANCELLED';
      const cancelNote = reason?.trim() || 'Cancelled by patient';
      (appt as AppointmentRecord & { cancellationReason?: string }).cancellationReason = cancelNote;
      appt.statusHistory.push({
        fromStatus: prevStatus,
        toStatus: 'CANCELLED',
        changedByUserId: userId,
        changedByRole: 'PATIENT',
        notes: cancelNote,
        changedAt: new Date().toISOString(),
      });
    });

    db.logAudit({
      userId,
      hospitalId: appt.hospitalId,
      action: 'PATIENT_APPOINTMENT_CANCELLED',
      entityType: 'Appointment',
      entityId: appt.id,
      ipAddress: null,
      userAgent: null,
      metadata: { reason: reason?.trim() || 'Cancelled by patient' },
    });

    SecurityAndNotificationService.enqueueOutboxNotification({
      idempotencyKey: `appt-cancelled-${appt.id}`,
      hospitalId: appt.hospitalId,
      recipientUserId: userId,
      category: 'APPOINTMENT',
      eventType: 'APPOINTMENT_CANCELLED',
      authenticatedBody: `Appointment ${appt.appointmentNumber} on ${appt.appointmentDate} at ${appt.slotStartTime} has been cancelled.`,
      deepLinkRoute: 'appointments',
    });

    return {
      appointment: this.toAppointmentDto(appt),
      notificationDispatch: {
        inAppNotificationQueued: true,
        pushConfigured: false,
        smsConfigured: false,
        emailConfigured: EmailDeliveryService.isConfigured(),
      },
    };
  }

  private static toAppointmentDto(appt: AppointmentRecord): PatientAppointmentDto {
    const hospital = this.resolveHospitalDisplayForRecord(appt.hospitalId);
    const doctor = clinicalStore.doctors.get(appt.doctorId);

    const canCancel = ['PENDING', 'CONFIRMED', 'CHECKED_IN'].includes(appt.status);

    return {
      id: appt.id,
      appointmentNumber: appt.appointmentNumber,
      hospitalId: appt.hospitalId,
      hospitalName: hospital.name,
      hospitalAddress: hospital.address,
      hospitalCity: hospital.city,
      departmentId: appt.departmentId,
      departmentName: doctor?.departmentName || 'Outpatient Department',
      doctorId: appt.doctorId,
      doctorName: doctor?.fullName || 'Consulting Physician',
      doctorSpecialization: doctor?.specialization || '',
      doctorQualification: doctor?.qualification || '',
      consultationFee: doctor?.consultationFee ?? null,
      appointmentDate: appt.appointmentDate,
      slotStartTime: appt.slotStartTime,
      slotEndTime: appt.slotEndTime,
      timezone: appt.timezone,
      type: appt.type,
      status: appt.status,
      reasonForVisit: appt.reasonForVisit,
      cancellationReason: (appt as AppointmentRecord & { cancellationReason?: string }).cancellationReason ?? null,
      canCancel,
      cancellationPolicyHours: hospital.cancellationPolicyHours,
      statusHistory: appt.statusHistory.map((h) => ({
        fromStatus: h.fromStatus,
        toStatus: h.toStatus,
        changedByRole: h.changedByRole,
        notes: h.notes,
        changedAt: h.changedAt,
      })),
      createdAt: appt.statusHistory[0]?.changedAt || new Date().toISOString(),
    };
  }
}
