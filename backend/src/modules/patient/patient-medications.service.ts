import crypto from 'crypto';
import {
  db,
  DbMedicationDoseLog,
  DbMedicationReminder,
  MedicationDoseStatusType,
} from '../../database/prisma';
import { ApiError } from '../../utils/errors';
import { clinicalStore, PrescriptionRecord } from '../clinical/clinical.service';
import { directoryStore } from '../directory/directory.service';
import { PatientProfileService } from './patient-profile.service';

export type MedicationStatusType = 'ACTIVE' | 'COMPLETED' | 'DISCONTINUED';

export interface MedicationSummaryDto {
  id: string;
  prescriptionId: string;
  prescriptionNumber: string;
  prescriptionStatus: string;
  prescriptionDate: string | null;
  hospitalId: string;
  hospitalName: string;
  doctorId: string;
  doctorName: string | null;
  doctorSpecialization: string | null;
  medicineName: string;
  strength: string;
  dosage: string;
  route: string | null;
  frequency: string;
  durationDays: number | null;
  quantity: number | null;
  instructions: string;
  specialInstructions: string | null;
  startDate: string | null;
  endDate: string | null;
  discontinuedAt: string | null;
  discontinuationReason: string | null;
  status: MedicationStatusType;
  isPrescriptionReadOnly: true;
  reminderCount: number;
  activeReminderCount: number;
  nextScheduledDose: NextScheduledDoseDto | null;
}

export interface NextScheduledDoseDto {
  reminderId: string;
  medicationId: string;
  medicineName: string;
  scheduledDate: string;
  scheduledTime: string;
  timezone: string;
  status: MedicationDoseStatusType;
  isSnoozed: boolean;
  snoozedUntil: string | null;
}

export interface ScheduledDoseSlotDto {
  occurrenceKey: string;
  reminderId: string;
  medicationId: string;
  prescriptionId: string;
  medicineName: string;
  strength: string;
  dosage: string;
  route: string | null;
  scheduledDate: string;
  scheduledTime: string;
  timezone: string;
  status: MedicationDoseStatusType;
  isMissed: boolean;
  isUpcoming: boolean;
  doseLogId: string | null;
  actionAt: string | null;
  snoozedUntil: string | null;
  notes: string | null;
  personalNotes: string | null;
}

export interface MedicationReminderDto {
  id: string;
  medicationId: string;
  prescriptionId: string;
  medicineName: string;
  strength: string;
  dosage: string;
  label: string | null;
  scheduleType: 'DAILY' | 'SPECIFIC_DAYS';
  daysOfWeek: number[];
  reminderTimes: string[];
  timezone: string;
  startDate: string;
  endDate: string | null;
  isEnabled: boolean;
  personalNotes: string | null;
  isReminderOnlyNotice: string;
  nextScheduledDose: NextScheduledDoseDto | null;
  createdAt: string;
  updatedAt: string;
}

export interface MedicationDoseLogDto {
  id: string;
  medicationId: string;
  prescriptionId: string;
  medicineName: string;
  strength: string;
  dosage: string;
  reminderId: string | null;
  scheduledDate: string;
  scheduledTime: string;
  scheduledFor: string;
  status: MedicationDoseStatusType;
  actionAt: string | null;
  snoozedUntil: string | null;
  notes: string | null;
  previousStatus: MedicationDoseStatusType | null;
  correctionReason: string | null;
  correctedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdherenceSummaryDto {
  takenCount: number;
  skippedCount: number;
  snoozedCount: number;
  recordedCount: number;
  scheduledTodayCount: number;
  upcomingTodayCount: number;
  missedTodayCount: number;
  adherencePercent: number | null;
}

interface ResolvedPrescriptionItem {
  medicationId: string;
  prescription: PrescriptionRecord;
  item: PrescriptionRecord['items'][number];
  status: MedicationStatusType;
  prescriptionDate: string | null;
  startDate: string | null;
  endDate: string | null;
}

export class PatientMedicationsService {
  private static getPatientOwnershipKeys(userId: string): { profileId: string; ownerKeys: Set<string> } {
    const profile = PatientProfileService.ensurePatientProfile(userId);
    const keys = new Set<string>([userId, profile.id]);
    for (const clinPat of clinicalStore.patients.values()) {
      if (clinPat.userId === userId || clinPat.id === profile.id) {
        keys.add(clinPat.id);
      }
    }
    return { profileId: profile.id, ownerKeys: keys };
  }

  private static resolveHospitalName(hospitalId: string): string {
    const h = db.hospitals.get(hospitalId);
    if (h) return h.name;
    const dir = directoryStore.records.get(hospitalId);
    if (dir) return dir.displayName;
    return 'Hospital';
  }

  private static resolveDoctorInfo(doctorId: string): { name: string | null; specialization: string | null } {
    const doc = clinicalStore.doctors.get(doctorId);
    if (doc) {
      return { name: doc.fullName, specialization: doc.specialization || null };
    }
    return { name: null, specialization: null };
  }

  private static addDaysToDateStr(dateStr: string, days: number): string {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d + days));
    return dt.toISOString().slice(0, 10);
  }

  private static getDayOfWeekFromDateStr(dateStr: string): number {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  }

  static getNowInTimezone(timezone: string, referenceDate: Date = new Date()): { dateStr: string; timeStr: string } {
    const tz = timezone || 'Asia/Kolkata';
    try {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      const parts = formatter.formatToParts(referenceDate);
      const map: Record<string, string> = {};
      for (const p of parts) {
        if (p.type !== 'literal') map[p.type] = p.value;
      }
      const hour = map.hour === '24' ? '00' : map.hour;
      return {
        dateStr: `${map.year}-${map.month}-${map.day}`,
        timeStr: `${hour}:${map.minute}`,
      };
    } catch {
      const iso = referenceDate.toISOString();
      return { dateStr: iso.slice(0, 10), timeStr: iso.slice(11, 16) };
    }
  }

  private static computeMedicationStatus(
    prescription: PrescriptionRecord,
    item: PrescriptionRecord['items'][number],
    referenceDateStr: string
  ): {
    status: MedicationStatusType;
    prescriptionDate: string | null;
    startDate: string | null;
    endDate: string | null;
  } {
    const prescriptionDate = prescription.signedAt ? prescription.signedAt.slice(0, 10) : null;
    const startDate = item.startDate || prescriptionDate || null;
    let endDate = item.endDate || null;
    if (!endDate && startDate && item.durationDays && item.durationDays > 0) {
      endDate = this.addDaysToDateStr(startDate, item.durationDays - 1);
    }

    if (prescription.status === 'CANCELLED' || item.isDiscontinued || item.discontinuedAt) {
      return { status: 'DISCONTINUED', prescriptionDate, startDate, endDate };
    }
    if (endDate && endDate < referenceDateStr) {
      return { status: 'COMPLETED', prescriptionDate, startDate, endDate };
    }
    return { status: 'ACTIVE', prescriptionDate, startDate, endDate };
  }

  private static listAllPrescribedItemsInStore(referenceDateStr: string): Array<ResolvedPrescriptionItem> {
    const resolved: ResolvedPrescriptionItem[] = [];
    for (const rx of clinicalStore.prescriptions.values()) {
      // Do not surface unsigned clinical drafts as prescribed patient intake
      if (rx.status === 'DRAFT') continue;
      rx.items.forEach((item, idx) => {
        const medicationId = item.id || `${rx.id}::item::${idx}`;
        const computed = this.computeMedicationStatus(rx, item, referenceDateStr);
        resolved.push({
          medicationId,
          prescription: rx,
          item,
          status: computed.status,
          prescriptionDate: computed.prescriptionDate,
          startDate: computed.startDate,
          endDate: computed.endDate,
        });
      });
    }
    return resolved;
  }

  private static resolveOwnedMedicationOrThrow(
    userId: string,
    medicationId: string,
    referenceDateStr: string
  ): { resolved: ResolvedPrescriptionItem; profileId: string; ownerKeys: Set<string> } {
    const { profileId, ownerKeys } = this.getPatientOwnershipKeys(userId);
    const all = this.listAllPrescribedItemsInStore(referenceDateStr);
    const match = all.find((r) => r.medicationId === medicationId);
    if (!match) {
      throw ApiError.notFound('Prescribed medication record not found', 'MEDICATION_NOT_FOUND');
    }
    if (!ownerKeys.has(match.prescription.patientId)) {
      throw ApiError.forbidden('You are not authorized to access another patient\'s medication records', 'MEDICATION_ACCESS_DENIED');
    }
    return { resolved: match, profileId, ownerKeys };
  }

  private static toMedicationDto(
    r: ResolvedPrescriptionItem,
    reminders: DbMedicationReminder[],
    doseLogs: DbMedicationDoseLog[],
    referenceDateStr: string,
    referenceNow: Date
  ): MedicationSummaryDto {
    const medReminders = reminders.filter((rem) => rem.prescriptionItemId === r.medicationId && !rem.isDeleted);
    const doc = this.resolveDoctorInfo(r.prescription.doctorId);
    const nextScheduledDose = this.computeNextScheduledDoseForReminders(
      medReminders.filter((rem) => rem.isEnabled),
      new Map([[r.medicationId, r]]),
      doseLogs,
      referenceNow
    );

    return {
      id: r.medicationId,
      prescriptionId: r.prescription.id,
      prescriptionNumber: r.prescription.prescriptionNumber,
      prescriptionStatus: r.prescription.status,
      prescriptionDate: r.prescriptionDate,
      hospitalId: r.prescription.hospitalId,
      hospitalName: this.resolveHospitalName(r.prescription.hospitalId),
      doctorId: r.prescription.doctorId,
      doctorName: doc.name,
      doctorSpecialization: doc.specialization,
      medicineName: r.item.medicineName,
      strength: r.item.strength,
      dosage: r.item.dosage,
      route: r.item.route || null,
      frequency: r.item.frequency,
      durationDays: r.item.durationDays || null,
      quantity: r.item.quantity || null,
      instructions: r.item.instructions,
      specialInstructions: r.item.specialInstructions ?? null,
      startDate: r.startDate,
      endDate: r.endDate,
      discontinuedAt: r.item.discontinuedAt ?? null,
      discontinuationReason: r.item.discontinuationReason ?? null,
      status: r.status,
      isPrescriptionReadOnly: true,
      reminderCount: medReminders.length,
      activeReminderCount: medReminders.filter((rem) => rem.isEnabled).length,
      nextScheduledDose,
    };
  }

  private static isReminderScheduledOnDate(rem: DbMedicationReminder, dateStr: string): boolean {
    if (!rem.isEnabled || rem.isDeleted) return false;
    if (dateStr < rem.startDate) return false;
    if (rem.endDate && dateStr > rem.endDate) return false;
    if (rem.scheduleType === 'DAILY') return true;
    const dow = this.getDayOfWeekFromDateStr(dateStr);
    return rem.daysOfWeek.includes(dow);
  }

  private static computeNextScheduledDoseForReminders(
    reminders: DbMedicationReminder[],
    itemLookup: Map<string, ResolvedPrescriptionItem>,
    doseLogs: DbMedicationDoseLog[],
    referenceNow: Date
  ): NextScheduledDoseDto | null {
    let earliestCandidate: { sortKey: string; dto: NextScheduledDoseDto } | null = null;

    for (const rem of reminders) {
      if (!rem.isEnabled || rem.isDeleted) continue;
      const itemInfo = itemLookup.get(rem.prescriptionItemId);
      if (!itemInfo || itemInfo.status !== 'ACTIVE') continue;

      const { dateStr: todayInTz, timeStr: nowTimeInTz } = this.getNowInTimezone(rem.timezone, referenceNow);

      for (let dayOffset = 0; dayOffset <= 7; dayOffset++) {
        const candidateDate = this.addDaysToDateStr(todayInTz, dayOffset);
        if (!this.isReminderScheduledOnDate(rem, candidateDate)) continue;

        const sortedTimes = [...rem.reminderTimes].sort();
        for (const timeStr of sortedTimes) {
          const log = doseLogs.find(
            (l) =>
              l.prescriptionItemId === rem.prescriptionItemId &&
              l.scheduledDate === candidateDate &&
              l.scheduledTime === timeStr
          );

          if (log && (log.status === 'TAKEN' || log.status === 'SKIPPED')) {
            continue;
          }

          if (dayOffset === 0 && timeStr < nowTimeInTz && log?.status !== 'SNOOZED') {
            continue;
          }

          const sortKey = `${candidateDate}T${timeStr}`;
          if (!earliestCandidate || sortKey < earliestCandidate.sortKey) {
            earliestCandidate = {
              sortKey,
              dto: {
                reminderId: rem.id,
                medicationId: rem.prescriptionItemId,
                medicineName: itemInfo.item.medicineName,
                scheduledDate: candidateDate,
                scheduledTime: timeStr,
                timezone: rem.timezone,
                status: log ? log.status : 'NOT_RECORDED',
                isSnoozed: log?.status === 'SNOOZED',
                snoozedUntil: log?.snoozedUntil ? log.snoozedUntil.toISOString() : null,
              },
            };
          }
          break;
        }
      }
    }

    return earliestCandidate ? earliestCandidate.dto : null;
  }

  private static buildDailyScheduleSlots(
    reminders: DbMedicationReminder[],
    itemLookup: Map<string, ResolvedPrescriptionItem>,
    doseLogs: DbMedicationDoseLog[],
    targetDateOverride: string | undefined,
    timezoneOverride: string | undefined,
    referenceNow: Date
  ): { todaySchedule: ScheduledDoseSlotDto[]; missedReminders: ScheduledDoseSlotDto[] } {
    const todaySchedule: ScheduledDoseSlotDto[] = [];
    const missedReminders: ScheduledDoseSlotDto[] = [];

    for (const rem of reminders) {
      if (!rem.isEnabled || rem.isDeleted) continue;
      const itemInfo = itemLookup.get(rem.prescriptionItemId);
      if (!itemInfo || itemInfo.status === 'DISCONTINUED') continue;

      const effectiveTz = timezoneOverride || rem.timezone || 'Asia/Kolkata';
      const nowInTz = this.getNowInTimezone(effectiveTz, referenceNow);
      const targetDate = targetDateOverride || nowInTz.dateStr;

      if (!this.isReminderScheduledOnDate(rem, targetDate)) continue;

      const sortedTimes = [...rem.reminderTimes].sort();
      for (const timeStr of sortedTimes) {
        const log = doseLogs.find(
          (l) =>
            l.prescriptionItemId === rem.prescriptionItemId &&
            l.scheduledDate === targetDate &&
            l.scheduledTime === timeStr
        );

        const status: MedicationDoseStatusType = log ? log.status : 'NOT_RECORDED';
        const isPastTimeToday = targetDate < nowInTz.dateStr || (targetDate === nowInTz.dateStr && timeStr < nowInTz.timeStr);
        const isSnoozeExpired =
          status === 'SNOOZED' && log?.snoozedUntil != null && log.snoozedUntil.getTime() < referenceNow.getTime();
        const isMissed =
          (status === 'NOT_RECORDED' && isPastTimeToday) || isSnoozeExpired;
        const isUpcoming =
          status === 'SNOOZED'
            ? !isSnoozeExpired
            : status === 'NOT_RECORDED' && !isPastTimeToday;

        const slot: ScheduledDoseSlotDto = {
          occurrenceKey: `${rem.id}::${targetDate}::${timeStr}`,
          reminderId: rem.id,
          medicationId: rem.prescriptionItemId,
          prescriptionId: rem.prescriptionId,
          medicineName: itemInfo.item.medicineName,
          strength: itemInfo.item.strength,
          dosage: itemInfo.item.dosage,
          route: itemInfo.item.route || null,
          scheduledDate: targetDate,
          scheduledTime: timeStr,
          timezone: effectiveTz,
          status,
          isMissed,
          isUpcoming,
          doseLogId: log ? log.id : null,
          actionAt: log?.actionAt ? log.actionAt.toISOString() : null,
          snoozedUntil: log?.snoozedUntil ? log.snoozedUntil.toISOString() : null,
          notes: log?.notes ?? null,
          personalNotes: rem.personalNotes,
        };

        todaySchedule.push(slot);
        if (isMissed) {
          missedReminders.push(slot);
        }
      }
    }

    todaySchedule.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
    missedReminders.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

    return { todaySchedule, missedReminders };
  }

  private static computeAdherenceSummary(
    doseLogs: DbMedicationDoseLog[],
    todaySchedule: ScheduledDoseSlotDto[]
  ): AdherenceSummaryDto {
    const takenCount = doseLogs.filter((l) => l.status === 'TAKEN').length;
    const skippedCount = doseLogs.filter((l) => l.status === 'SKIPPED').length;
    const snoozedCount = doseLogs.filter((l) => l.status === 'SNOOZED').length;
    const recordedCount = takenCount + skippedCount;
    const adherencePercent = recordedCount > 0 ? Math.round((takenCount / recordedCount) * 100) : null;

    return {
      takenCount,
      skippedCount,
      snoozedCount,
      recordedCount,
      scheduledTodayCount: todaySchedule.length,
      upcomingTodayCount: todaySchedule.filter((s) => s.isUpcoming).length,
      missedTodayCount: todaySchedule.filter((s) => s.isMissed).length,
      adherencePercent,
    };
  }

  static listMedications(
    userId: string,
    query: { status?: 'ALL' | 'ACTIVE' | 'COMPLETED' | 'DISCONTINUED'; timezone?: string; date?: string } = {}
  ) {
    const { profileId, ownerKeys } = this.getPatientOwnershipKeys(userId);
    const now = new Date();
    const tz = query.timezone || 'Asia/Kolkata';
    const refDate = query.date || this.getNowInTimezone(tz, now).dateStr;

    const allOwnedItems = this.listAllPrescribedItemsInStore(refDate).filter((r) =>
      ownerKeys.has(r.prescription.patientId)
    );
    const itemLookup = new Map(allOwnedItems.map((r) => [r.medicationId, r]));

    const ownedReminders = Array.from(db.medicationReminders.values()).filter(
      (rem) => !rem.isDeleted && (rem.patientId === profileId || ownerKeys.has(rem.patientId))
    );
    const ownedDoseLogs = Array.from(db.medicationDoseLogs.values()).filter(
      (log) => log.patientId === profileId || ownerKeys.has(log.patientId)
    );

    const allDtos = allOwnedItems
      .map((r) => this.toMedicationDto(r, ownedReminders, ownedDoseLogs, refDate, now))
      .sort((a, b) => (b.prescriptionDate || '').localeCompare(a.prescriptionDate || ''));

    const active = allDtos.filter((m) => m.status === 'ACTIVE');
    const completed = allDtos.filter((m) => m.status === 'COMPLETED');
    const discontinued = allDtos.filter((m) => m.status === 'DISCONTINUED');

    const filtered =
      query.status === 'ACTIVE'
        ? active
        : query.status === 'COMPLETED'
          ? completed
          : query.status === 'DISCONTINUED'
            ? discontinued
            : allDtos;

    const { todaySchedule, missedReminders } = this.buildDailyScheduleSlots(
      ownedReminders,
      itemLookup,
      ownedDoseLogs,
      query.date,
      query.timezone,
      now
    );

    const adherenceSummary = this.computeAdherenceSummary(ownedDoseLogs, todaySchedule);

    return {
      medications: filtered,
      active,
      completed,
      discontinued,
      todaySchedule,
      missedReminders,
      adherenceSummary,
      counts: {
        total: allDtos.length,
        active: active.length,
        completed: completed.length,
        discontinued: discontinued.length,
      },
    };
  }

  static getMedicationDetail(userId: string, medicationId: string, timezone?: string) {
    const now = new Date();
    const tz = timezone || 'Asia/Kolkata';
    const refDate = this.getNowInTimezone(tz, now).dateStr;

    const { resolved, profileId, ownerKeys } = this.resolveOwnedMedicationOrThrow(userId, medicationId, refDate);
    const itemLookup = new Map([[resolved.medicationId, resolved]]);

    const reminders = Array.from(db.medicationReminders.values())
      .filter(
        (rem) =>
          !rem.isDeleted &&
          rem.prescriptionItemId === medicationId &&
          (rem.patientId === profileId || ownerKeys.has(rem.patientId))
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const doseLogs = Array.from(db.medicationDoseLogs.values())
      .filter(
        (log) =>
          log.prescriptionItemId === medicationId &&
          (log.patientId === profileId || ownerKeys.has(log.patientId))
      )
      .sort((a, b) => b.scheduledFor.getTime() - a.scheduledFor.getTime());

    const medication = this.toMedicationDto(resolved, reminders, doseLogs, refDate, now);
    const { todaySchedule } = this.buildDailyScheduleSlots(reminders, itemLookup, doseLogs, undefined, timezone, now);
    const adherenceSummary = this.computeAdherenceSummary(doseLogs, todaySchedule);

    return {
      medication,
      reminders: reminders.map((rem) => this.toReminderDto(rem, resolved, doseLogs, now)),
      doseHistory: doseLogs.map((log) => this.toDoseLogDto(log, resolved)),
      todaySchedule,
      adherenceSummary,
    };
  }

  private static toReminderDto(
    rem: DbMedicationReminder,
    itemInfo: ResolvedPrescriptionItem | undefined,
    doseLogs: DbMedicationDoseLog[],
    referenceNow: Date
  ): MedicationReminderDto {
    const lookup = itemInfo ? new Map([[itemInfo.medicationId, itemInfo]]) : new Map();
    const nextDose = itemInfo && rem.isEnabled && !rem.isDeleted
      ? this.computeNextScheduledDoseForReminders([rem], lookup, doseLogs, referenceNow)
      : null;

    return {
      id: rem.id,
      medicationId: rem.prescriptionItemId,
      prescriptionId: rem.prescriptionId,
      medicineName: itemInfo?.item.medicineName || 'Medication',
      strength: itemInfo?.item.strength || '',
      dosage: itemInfo?.item.dosage || '',
      label: rem.label,
      scheduleType: rem.scheduleType,
      daysOfWeek: [...rem.daysOfWeek].sort((a, b) => a - b),
      reminderTimes: [...rem.reminderTimes].sort(),
      timezone: rem.timezone,
      startDate: rem.startDate,
      endDate: rem.endDate,
      isEnabled: rem.isEnabled,
      personalNotes: rem.personalNotes,
      isReminderOnlyNotice:
        'Personal medication reminder schedule. Separate from clinician-issued prescription instructions.',
      nextScheduledDose: nextDose,
      createdAt: rem.createdAt.toISOString(),
      updatedAt: rem.updatedAt.toISOString(),
    };
  }

  static listReminders(
    userId: string,
    query: { medicationId?: string; enabledOnly?: boolean; timezone?: string; date?: string; page?: number; limit?: number } = {}
  ) {
    const { profileId, ownerKeys } = this.getPatientOwnershipKeys(userId);
    const now = new Date();
    const tz = query.timezone || 'Asia/Kolkata';
    const refDate = query.date || this.getNowInTimezone(tz, now).dateStr;

    const allOwnedItems = this.listAllPrescribedItemsInStore(refDate).filter((r) =>
      ownerKeys.has(r.prescription.patientId)
    );
    const itemLookup = new Map(allOwnedItems.map((r) => [r.medicationId, r]));

    const ownedDoseLogs = Array.from(db.medicationDoseLogs.values()).filter(
      (log) => log.patientId === profileId || ownerKeys.has(log.patientId)
    );

    let reminders = Array.from(db.medicationReminders.values()).filter(
      (rem) => !rem.isDeleted && (rem.patientId === profileId || ownerKeys.has(rem.patientId))
    );

    if (query.medicationId) {
      reminders = reminders.filter((rem) => rem.prescriptionItemId === query.medicationId);
    }
    if (query.enabledOnly) {
      reminders = reminders.filter((rem) => rem.isEnabled);
    }

    reminders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const page = query.page || 1;
    const limit = query.limit || 50;
    const total = reminders.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const paged = reminders.slice((page - 1) * limit, page * limit);

    const items = paged.map((rem) =>
      this.toReminderDto(rem, itemLookup.get(rem.prescriptionItemId), ownedDoseLogs, now)
    );

    const { todaySchedule, missedReminders } = this.buildDailyScheduleSlots(
      reminders,
      itemLookup,
      ownedDoseLogs,
      query.date,
      query.timezone,
      now
    );

    return {
      items,
      upcoming: todaySchedule.filter((s) => s.isUpcoming),
      missed: missedReminders,
      todaySchedule,
      meta: { page, limit, total, totalPages },
    };
  }

  static createReminder(
    userId: string,
    payload: {
      medicationId: string;
      label?: string | null;
      scheduleType?: 'DAILY' | 'SPECIFIC_DAYS';
      daysOfWeek?: number[];
      reminderTimes: string[];
      timezone?: string;
      startDate: string;
      endDate?: string | null;
      isEnabled?: boolean;
      personalNotes?: string | null;
    }
  ): MedicationReminderDto {
    const now = new Date();
    const tz = payload.timezone || 'Asia/Kolkata';
    const refDate = this.getNowInTimezone(tz, now).dateStr;

    const { resolved, profileId, ownerKeys } = this.resolveOwnedMedicationOrThrow(
      userId,
      payload.medicationId,
      refDate
    );

    if (resolved.status === 'DISCONTINUED') {
      throw ApiError.badRequest(
        'Cannot create a reminder for a cancelled or discontinued prescription',
        'MEDICATION_DISCONTINUED'
      );
    }

    const uniqueTimes = Array.from(new Set(payload.reminderTimes)).sort();
    const scheduleType = payload.scheduleType || 'DAILY';
    const daysOfWeek =
      scheduleType === 'DAILY'
        ? [0, 1, 2, 3, 4, 5, 6]
        : Array.from(new Set(payload.daysOfWeek || [])).sort((a, b) => a - b);

    const record: DbMedicationReminder = {
      id: crypto.randomUUID(),
      patientId: profileId,
      prescriptionId: resolved.prescription.id,
      prescriptionItemId: resolved.medicationId,
      label: payload.label?.trim() || null,
      scheduleType,
      daysOfWeek,
      reminderTimes: uniqueTimes,
      timezone: tz,
      startDate: payload.startDate,
      endDate: payload.endDate || null,
      isEnabled: payload.isEnabled ?? true,
      personalNotes: payload.personalNotes?.trim() || null,
      isDeleted: false,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    db.medicationReminders.set(record.id, record);

    db.logAudit({
      userId,
      hospitalId: resolved.prescription.hospitalId,
      action: 'PATIENT_MEDICATION_REMINDER_CREATED',
      entityType: 'MedicationReminder',
      entityId: record.id,
      ipAddress: null,
      userAgent: null,
      metadata: {
        prescriptionId: resolved.prescription.id,
        scheduleType: record.scheduleType,
        doseSlotsPerDay: record.reminderTimes.length,
        isEnabled: record.isEnabled,
      },
    });

    const ownedDoseLogs = Array.from(db.medicationDoseLogs.values()).filter(
      (log) => log.patientId === profileId || ownerKeys.has(log.patientId)
    );
    return this.toReminderDto(record, resolved, ownedDoseLogs, now);
  }

  private static getOwnedReminderOrThrow(userId: string, reminderId: string) {
    const { profileId, ownerKeys } = this.getPatientOwnershipKeys(userId);
    const rem = db.medicationReminders.get(reminderId);
    if (!rem || rem.isDeleted) {
      throw ApiError.notFound('Medication reminder not found', 'REMINDER_NOT_FOUND');
    }
    if (rem.patientId !== profileId && !ownerKeys.has(rem.patientId)) {
      throw ApiError.forbidden('You are not authorized to access another patient\'s medication reminder', 'REMINDER_ACCESS_DENIED');
    }
    return { rem, profileId, ownerKeys };
  }

  static updateReminder(
    userId: string,
    reminderId: string,
    patch: {
      label?: string | null;
      scheduleType?: 'DAILY' | 'SPECIFIC_DAYS';
      daysOfWeek?: number[];
      reminderTimes?: string[];
      timezone?: string;
      startDate?: string;
      endDate?: string | null;
      isEnabled?: boolean;
      personalNotes?: string | null;
    }
  ): MedicationReminderDto {
    const { rem, profileId, ownerKeys } = this.getOwnedReminderOrThrow(userId, reminderId);
    const nextStart = patch.startDate ?? rem.startDate;
    const nextEnd = patch.endDate !== undefined ? patch.endDate : rem.endDate;
    if (nextEnd && nextEnd < nextStart) {
      throw ApiError.badRequest('End date must be on or after start date', 'INVALID_DATE_RANGE');
    }

    const nextScheduleType = patch.scheduleType ?? rem.scheduleType;
    const nextDays =
      nextScheduleType === 'DAILY'
        ? [0, 1, 2, 3, 4, 5, 6]
        : Array.from(new Set(patch.daysOfWeek ?? rem.daysOfWeek)).sort((a, b) => a - b);

    if (nextScheduleType === 'SPECIFIC_DAYS' && nextDays.length === 0) {
      throw ApiError.badRequest('Select at least one day of the week for custom day schedules', 'INVALID_DAYS_OF_WEEK');
    }

    rem.label = patch.label !== undefined ? patch.label?.trim() || null : rem.label;
    rem.scheduleType = nextScheduleType;
    rem.daysOfWeek = nextDays;
    if (patch.reminderTimes) {
      rem.reminderTimes = Array.from(new Set(patch.reminderTimes)).sort();
    }
    if (patch.timezone) {
      rem.timezone = patch.timezone;
    }
    rem.startDate = nextStart;
    rem.endDate = nextEnd;
    if (patch.isEnabled !== undefined) {
      rem.isEnabled = patch.isEnabled;
    }
    if (patch.personalNotes !== undefined) {
      rem.personalNotes = patch.personalNotes?.trim() || null;
    }
    rem.updatedAt = new Date();

    db.logAudit({
      userId,
      hospitalId: null,
      action: 'PATIENT_MEDICATION_REMINDER_UPDATED',
      entityType: 'MedicationReminder',
      entityId: rem.id,
      ipAddress: null,
      userAgent: null,
      metadata: {
        isEnabled: rem.isEnabled,
        scheduleType: rem.scheduleType,
        doseSlotsPerDay: rem.reminderTimes.length,
      },
    });

    const now = new Date();
    const refDate = this.getNowInTimezone(rem.timezone, now).dateStr;
    const itemInfo = this.listAllPrescribedItemsInStore(refDate).find(
      (r) => r.medicationId === rem.prescriptionItemId
    );
    const ownedDoseLogs = Array.from(db.medicationDoseLogs.values()).filter(
      (log) => log.patientId === profileId || ownerKeys.has(log.patientId)
    );
    return this.toReminderDto(rem, itemInfo, ownedDoseLogs, now);
  }

  static deleteReminder(userId: string, reminderId: string) {
    const { rem } = this.getOwnedReminderOrThrow(userId, reminderId);
    const now = new Date();
    rem.isDeleted = true;
    rem.isEnabled = false;
    rem.deletedAt = now;
    rem.updatedAt = now;

    db.logAudit({
      userId,
      hospitalId: null,
      action: 'PATIENT_MEDICATION_REMINDER_DELETED',
      entityType: 'MedicationReminder',
      entityId: rem.id,
      ipAddress: null,
      userAgent: null,
      metadata: { deletedAt: now.toISOString() },
    });

    return {
      id: rem.id,
      deleted: true,
      deletedAt: now.toISOString(),
    };
  }

  private static toDoseLogDto(
    log: DbMedicationDoseLog,
    itemInfo: ResolvedPrescriptionItem | undefined
  ): MedicationDoseLogDto {
    return {
      id: log.id,
      medicationId: log.prescriptionItemId,
      prescriptionId: log.prescriptionId,
      medicineName: itemInfo?.item.medicineName || 'Medication',
      strength: itemInfo?.item.strength || '',
      dosage: itemInfo?.item.dosage || '',
      reminderId: log.reminderId,
      scheduledDate: log.scheduledDate,
      scheduledTime: log.scheduledTime,
      scheduledFor: log.scheduledFor.toISOString(),
      status: log.status,
      actionAt: log.actionAt ? log.actionAt.toISOString() : null,
      snoozedUntil: log.snoozedUntil ? log.snoozedUntil.toISOString() : null,
      notes: log.notes,
      previousStatus: log.previousStatus,
      correctionReason: log.correctionReason,
      correctedAt: log.correctedAt ? log.correctedAt.toISOString() : null,
      createdAt: log.createdAt.toISOString(),
      updatedAt: log.updatedAt.toISOString(),
    };
  }

  static listDoseLogs(
    userId: string,
    query: {
      medicationId?: string;
      reminderId?: string;
      startDate?: string;
      endDate?: string;
      status?: 'ALL' | MedicationDoseStatusType;
      page?: number;
      limit?: number;
    } = {}
  ) {
    const { profileId, ownerKeys } = this.getPatientOwnershipKeys(userId);
    const now = new Date();
    const refDate = this.getNowInTimezone('Asia/Kolkata', now).dateStr;

    const allOwnedItems = this.listAllPrescribedItemsInStore(refDate).filter((r) =>
      ownerKeys.has(r.prescription.patientId)
    );
    const itemLookup = new Map(allOwnedItems.map((r) => [r.medicationId, r]));

    const ownedReminders = Array.from(db.medicationReminders.values()).filter(
      (rem) => !rem.isDeleted && (rem.patientId === profileId || ownerKeys.has(rem.patientId))
    );

    const allOwnedLogs = Array.from(db.medicationDoseLogs.values()).filter(
      (log) => log.patientId === profileId || ownerKeys.has(log.patientId)
    );

    let filtered = [...allOwnedLogs];
    if (query.medicationId) {
      filtered = filtered.filter((l) => l.prescriptionItemId === query.medicationId);
    }
    if (query.reminderId) {
      filtered = filtered.filter((l) => l.reminderId === query.reminderId);
    }
    if (query.startDate) {
      filtered = filtered.filter((l) => l.scheduledDate >= query.startDate!);
    }
    if (query.endDate) {
      filtered = filtered.filter((l) => l.scheduledDate <= query.endDate!);
    }
    if (query.status && query.status !== 'ALL') {
      filtered = filtered.filter((l) => l.status === query.status);
    }

    filtered.sort((a, b) => b.scheduledFor.getTime() - a.scheduledFor.getTime());

    const page = query.page || 1;
    const limit = query.limit || 50;
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const paged = filtered.slice((page - 1) * limit, page * limit);

    const { todaySchedule } = this.buildDailyScheduleSlots(
      ownedReminders,
      itemLookup,
      allOwnedLogs,
      undefined,
      undefined,
      now
    );

    return {
      items: paged.map((l) => this.toDoseLogDto(l, itemLookup.get(l.prescriptionItemId))),
      todaySchedule,
      adherenceSummary: this.computeAdherenceSummary(allOwnedLogs, todaySchedule),
      meta: { page, limit, total, totalPages },
    };
  }

  static recordDose(
    userId: string,
    payload: {
      medicationId: string;
      reminderId?: string | null;
      scheduledDate: string;
      scheduledTime: string;
      status: 'TAKEN' | 'SKIPPED' | 'SNOOZED';
      actionAt?: string;
      snoozeMinutes?: number;
      snoozedUntil?: string | null;
      notes?: string | null;
      timezone?: string;
    }
  ): MedicationDoseLogDto {
    const now = new Date();
    const tz = payload.timezone || 'Asia/Kolkata';
    const refDate = this.getNowInTimezone(tz, now).dateStr;

    const { resolved, profileId, ownerKeys } = this.resolveOwnedMedicationOrThrow(
      userId,
      payload.medicationId,
      refDate
    );

    if (payload.reminderId) {
      const rem = db.medicationReminders.get(payload.reminderId);
      if (!rem || rem.isDeleted) {
        throw ApiError.notFound('Referenced medication reminder not found', 'REMINDER_NOT_FOUND');
      }
      if (rem.patientId !== profileId && !ownerKeys.has(rem.patientId)) {
        throw ApiError.forbidden('You cannot record doses against another patient\'s reminder', 'REMINDER_ACCESS_DENIED');
      }
      if (rem.prescriptionItemId !== resolved.medicationId) {
        throw ApiError.badRequest('Reminder does not belong to the specified medication', 'REMINDER_MEDICATION_MISMATCH');
      }
    }

    // Strict duplicate dose prevention across (patient, medication, scheduledDate, scheduledTime)
    const duplicate = Array.from(db.medicationDoseLogs.values()).find(
      (l) =>
        (l.patientId === profileId || ownerKeys.has(l.patientId)) &&
        l.prescriptionItemId === resolved.medicationId &&
        l.scheduledDate === payload.scheduledDate &&
        l.scheduledTime === payload.scheduledTime &&
        l.status !== 'NOT_RECORDED'
    );

    if (duplicate) {
      throw new ApiError(
        409,
        'DUPLICATE_DOSE_RECORD',
        `A dose activity (${duplicate.status}) is already recorded for ${payload.scheduledDate} at ${payload.scheduledTime}. Use dose correction (PATCH) to update it.`,
        { existingDoseId: duplicate.id, existingStatus: duplicate.status }
      );
    }

    const scheduledFor = new Date(`${payload.scheduledDate}T${payload.scheduledTime}:00.000Z`);
    const actionAt = payload.actionAt ? new Date(payload.actionAt) : now;

    let snoozedUntil: Date | null = null;
    if (payload.status === 'SNOOZED') {
      if (payload.snoozedUntil) {
        snoozedUntil = new Date(payload.snoozedUntil);
      } else {
        const mins = payload.snoozeMinutes ?? 15;
        snoozedUntil = new Date(now.getTime() + mins * 60 * 1000);
      }
    }

    const logRecord: DbMedicationDoseLog = {
      id: crypto.randomUUID(),
      patientId: profileId,
      prescriptionId: resolved.prescription.id,
      prescriptionItemId: resolved.medicationId,
      reminderId: payload.reminderId || null,
      scheduledDate: payload.scheduledDate,
      scheduledTime: payload.scheduledTime,
      scheduledFor: Number.isNaN(scheduledFor.getTime()) ? now : scheduledFor,
      status: payload.status,
      actionAt: Number.isNaN(actionAt.getTime()) ? now : actionAt,
      snoozedUntil,
      notes: payload.notes?.trim() || null,
      previousStatus: null,
      correctionReason: null,
      correctedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    db.medicationDoseLogs.set(logRecord.id, logRecord);

    db.logAudit({
      userId,
      hospitalId: resolved.prescription.hospitalId,
      action: 'PATIENT_MEDICATION_DOSE_RECORDED',
      entityType: 'MedicationDoseLog',
      entityId: logRecord.id,
      ipAddress: null,
      userAgent: null,
      metadata: {
        status: logRecord.status,
        scheduledDate: logRecord.scheduledDate,
        scheduledTime: logRecord.scheduledTime,
      },
    });

    return this.toDoseLogDto(logRecord, resolved);
  }

  static updateDose(
    userId: string,
    doseId: string,
    patch: {
      status: MedicationDoseStatusType;
      actionAt?: string;
      snoozeMinutes?: number;
      snoozedUntil?: string | null;
      notes?: string | null;
      correctionReason?: string | null;
    }
  ): MedicationDoseLogDto {
    const { profileId, ownerKeys } = this.getPatientOwnershipKeys(userId);
    const log = db.medicationDoseLogs.get(doseId);
    if (!log) {
      throw ApiError.notFound('Medication dose log not found', 'DOSE_LOG_NOT_FOUND');
    }
    if (log.patientId !== profileId && !ownerKeys.has(log.patientId)) {
      throw ApiError.forbidden('You are not authorized to update another patient\'s dose log', 'DOSE_ACCESS_DENIED');
    }

    const prevStatus = log.status;
    const isFinalStateCorrection =
      (prevStatus === 'TAKEN' || prevStatus === 'SKIPPED') && patch.status !== prevStatus;

    if (isFinalStateCorrection && (!patch.correctionReason || patch.correctionReason.trim().length < 3)) {
      throw ApiError.badRequest(
        'A correction reason is required when modifying an already recorded dose status',
        'CORRECTION_REASON_REQUIRED'
      );
    }

    const now = new Date();
    if (patch.status !== prevStatus) {
      log.previousStatus = prevStatus;
      log.correctionReason =
        patch.correctionReason?.trim() ||
        (prevStatus === 'SNOOZED' ? `Updated from SNOOZED to ${patch.status}` : null);
      log.correctedAt = now;
    } else if (patch.correctionReason) {
      log.correctionReason = patch.correctionReason.trim();
      log.correctedAt = now;
    }

    log.status = patch.status;
    log.actionAt =
      patch.status === 'NOT_RECORDED'
        ? null
        : patch.actionAt
          ? new Date(patch.actionAt)
          : now;

    if (patch.status === 'SNOOZED') {
      if (patch.snoozedUntil) {
        log.snoozedUntil = new Date(patch.snoozedUntil);
      } else {
        const mins = patch.snoozeMinutes ?? 15;
        log.snoozedUntil = new Date(now.getTime() + mins * 60 * 1000);
      }
    } else {
      log.snoozedUntil = null;
    }

    if (patch.notes !== undefined) {
      log.notes = patch.notes?.trim() || null;
    }
    log.updatedAt = now;

    db.logAudit({
      userId,
      hospitalId: null,
      action: isFinalStateCorrection ? 'PATIENT_MEDICATION_DOSE_CORRECTED' : 'PATIENT_MEDICATION_DOSE_UPDATED',
      entityType: 'MedicationDoseLog',
      entityId: log.id,
      ipAddress: null,
      userAgent: null,
      metadata: {
        previousStatus: prevStatus,
        newStatus: log.status,
        hasCorrectionReason: Boolean(log.correctionReason),
      },
    });

    const refDate = this.getNowInTimezone('Asia/Kolkata', now).dateStr;
    const itemInfo = this.listAllPrescribedItemsInStore(refDate).find(
      (r) => r.medicationId === log.prescriptionItemId
    );
    return this.toDoseLogDto(log, itemInfo);
  }
}
