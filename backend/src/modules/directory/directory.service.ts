import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ApiError } from '../../utils/errors';
import { db } from '../../database/prisma';
import { SaasPlatformService } from '../saas/saas.service';

export type DirectoryVerificationStatusType =
  | 'PENDING_VERIFICATION'
  | 'UNDER_REVIEW'
  | 'VERIFIED'
  | 'REJECTED'
  | 'SUSPENDED';

export interface HospitalDirectoryRecord {
  id: string;
  directoryCode: string | null;
  legalName: string | null;
  displayName: string;
  facilityType: string;
  ownershipType: string;
  address: string;
  city: string;
  state: string;
  pincode: string | null;
  primaryPhone: string | null;
  secondaryPhone: string | null;
  email: string | null;
  website: string | null;
  specialties: string[];
  emergencyAvailable: boolean | null;
  verificationStatus: DirectoryVerificationStatusType;
  dataStatus: string;
  sourceName: string;
  sourceUrl: string;
  isActiveTenant: boolean;
  lastVerifiedAt: string | null;
  verifiedByUserId: string | null;
  rejectionReason: string | null;
  contacts: Array<{
    id: string;
    contactType: 'PRIMARY_PHONE' | 'SECONDARY_PHONE' | 'EMAIL' | 'WEBSITE';
    contactValue: string;
    isVerified: boolean;
    verifiedAt: string | null;
  }>;
  specialtyRecords: Array<{
    id: string;
    specialtyName: string;
    isVerified: boolean;
  }>;
  sources: Array<{
    id: string;
    sourceName: string;
    sourceUrl: string;
    dataStatusNote: string;
    importedAt: string;
  }>;
  verificationHistory: Array<{
    id: string;
    fromStatus: DirectoryVerificationStatusType | null;
    toStatus: DirectoryVerificationStatusType;
    actorUserId: string;
    notes: string;
    timestamp: string;
  }>;
  issueReports: Array<{
    id: string;
    reportedByUserId: string | null;
    field: string;
    description: string;
    reportedAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface DirectoryImportSummary {
  importJobId: string;
  sourceFormat: 'JSON' | 'CSV';
  totalRecordsRead: number;
  importedCount: number;
  skippedDuplicateCount: number;
  preservedVerifiedCount: number;
  invalidCount: number;
  invalidErrors: Array<{ index: number; reason: string }>;
  importedAt: string;
}

class HospitalDirectoryStore {
  records = new Map<string, HospitalDirectoryRecord>(); // keyed by UUID id
  importHistory: DirectoryImportSummary[] = [];
}

export const directoryStore = new HospitalDirectoryStore();

/**
 * Reusable, Idempotent HospitalDirectoryImportService (Section 8)
 * - Reads CSV or JSON dataset
 * - Validates required fields
 * - Normalizes phone numbers and 6-digit PIN codes
 * - Trims whitespace
 * - Detects duplicates by directoryCode or normalized (displayName + address + pincode)
 * - Never overwrites VERIFIED hospital records with unverified imported data
 * - Never creates automatic subscriptions, administrator accounts, or active tenants
 */
export class HospitalDirectoryImportService {
  static normalizeWhitespace(val: string | null | undefined): string | null {
    if (val === null || val === undefined) return null;
    const trimmed = String(val).replace(/\s+/g, ' ').trim();
    if (
      !trimmed ||
      trimmed.toLowerCase() === 'null' ||
      trimmed.toLowerCase() === 'not found in cited source' ||
      trimmed.toLowerCase() === 'not specified in cited source'
    ) {
      return null;
    }
    return trimmed;
  }

  static normalizePincode(val: string | null | undefined): string | null {
    const cleaned = this.normalizeWhitespace(val);
    if (!cleaned) return null;
    const match = cleaned.match(/\b(83\d{4})\b/);
    return match ? match[1] : null;
  }

  static normalizePhone(val: string | null | undefined): string | null {
    const cleaned = this.normalizeWhitespace(val);
    if (!cleaned) return null;
    // Strip trailing explanatory parenthetical notes while keeping phone digits
    const withoutNotes = cleaned.replace(/\(.*?\)/g, '').trim();
    if (!withoutNotes) return null;
    const digitsOnly = withoutNotes.replace(/[^\d+]/g, '');
    if (digitsOnly.length < 8) return null;
    return withoutNotes;
  }

  static computeDedupSignature(displayName: string, address: string, pincode: string | null): string {
    const normName = displayName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normAddr = address.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 32);
    return `${normName}::${normAddr}::${pincode || ''}`;
  }

  static parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current);
    return result;
  }

  static parseCsvDataset(csvContent: string): Array<Record<string, unknown>> {
    const lines = csvContent
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (lines.length < 2) return [];
    const headers = this.parseCsvLine(lines[0]);
    const rows: Array<Record<string, unknown>> = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = this.parseCsvLine(lines[i]);
      const obj: Record<string, unknown> = {};
      headers.forEach((h, idx) => {
        obj[h.trim()] = cols[idx] ?? '';
      });
      rows.push({
        directoryCode: obj.directory_code,
        displayName: obj.display_name,
        facilityType: obj.facility_type,
        ownershipType: obj.ownership_type,
        address: obj.address,
        city: obj.city,
        state: obj.state,
        pincode: obj.pincode,
        primaryPhone: obj.primary_phone || null,
        secondaryPhone: obj.secondary_phone || null,
        email: obj.email || null,
        website: obj.website || null,
        specialties: obj.specialties
          ? String(obj.specialties)
              .split('|')
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
        emergencyAvailable:
          obj.emergency_available === 'true'
            ? true
            : obj.emergency_available === 'false'
            ? false
            : null,
        dataStatus: obj.data_status,
        sourceName: obj.source_name,
        sourceUrl: obj.source_url,
        verificationStatus: obj.verification_status || 'PENDING_VERIFICATION',
      });
    }
    return rows;
  }

  static importRecords(
    rawItems: Array<Record<string, any>>,
    sourceFormat: 'JSON' | 'CSV' = 'JSON',
    actorUserId = 'SYSTEM_BOOTSTRAP'
  ): DirectoryImportSummary {
    let importedCount = 0;
    let skippedDuplicateCount = 0;
    let preservedVerifiedCount = 0;
    let invalidCount = 0;
    const invalidErrors: Array<{ index: number; reason: string }> = [];

    for (let idx = 0; idx < rawItems.length; idx++) {
      const raw = rawItems[idx];
      const displayName = this.normalizeWhitespace(raw.displayName || raw.name);
      const address = this.normalizeWhitespace(raw.address);
      const city = this.normalizeWhitespace(raw.city) || 'Ranchi';
      const state = this.normalizeWhitespace(raw.state) || 'Jharkhand';
      const facilityType = this.normalizeWhitespace(raw.facilityType) || 'Hospital';
      const ownershipType = this.normalizeWhitespace(raw.ownershipType) || 'Not confirmed in cited listing';
      const sourceName = this.normalizeWhitespace(raw.sourceName) || 'Public directory listing';
      const sourceUrl = this.normalizeWhitespace(raw.sourceUrl);

      if (!displayName || !address || !sourceUrl) {
        invalidCount += 1;
        invalidErrors.push({
          index: idx,
          reason: 'Missing required displayName, address, or sourceUrl',
        });
        continue;
      }

      const directoryCode = this.normalizeWhitespace(raw.directoryCode);
      const pincode = this.normalizePincode(raw.pincode || address);
      const primaryPhone = this.normalizePhone(raw.primaryPhone);
      const secondaryPhone = this.normalizePhone(raw.secondaryPhone);
      const email = this.normalizeWhitespace(raw.email);
      const website = this.normalizeWhitespace(raw.website);
      const legalName = this.normalizeWhitespace(raw.legalName);
      const dataStatus =
        this.normalizeWhitespace(raw.dataStatus) || 'Public directory listing; verify before activation';

      const specialties: string[] = Array.isArray(raw.specialties)
        ? raw.specialties
            .map((s: unknown) => this.normalizeWhitespace(String(s)))
            .filter((s: string | null): s is string => Boolean(s))
        : [];

      const emergencyAvailable: boolean | null =
        typeof raw.emergencyAvailable === 'boolean' ? raw.emergencyAvailable : null;

      // Check existing record by directoryCode or normalized name+address+pincode signature
      const incomingSig = this.computeDedupSignature(displayName, address, pincode);
      const existing = Array.from(directoryStore.records.values()).find((r) => {
        if (directoryCode && r.directoryCode && r.directoryCode.toLowerCase() === directoryCode.toLowerCase()) {
          return true;
        }
        return this.computeDedupSignature(r.displayName, r.address, r.pincode) === incomingSig;
      });

      if (existing) {
        if (existing.verificationStatus === 'VERIFIED') {
          // Never overwrite verified hospital information with unverified imported data
          preservedVerifiedCount += 1;
        } else {
          skippedDuplicateCount += 1;
        }
        continue;
      }

      // Deterministic UUID for RNC001..RNC025 so references remain stable across restarts
      const codeNum = directoryCode?.match(/^RNC0*(\d+)$/i)?.[1];
      const deterministicId = codeNum
        ? `00000000-0000-4000-8000-${String(codeNum).padStart(12, '0')}`
        : crypto.randomUUID();

      const now = new Date().toISOString();
      const contacts: HospitalDirectoryRecord['contacts'] = [];
      if (primaryPhone) {
        contacts.push({
          id: crypto.randomUUID(),
          contactType: 'PRIMARY_PHONE',
          contactValue: primaryPhone,
          isVerified: false,
          verifiedAt: null,
        });
      }
      if (secondaryPhone) {
        contacts.push({
          id: crypto.randomUUID(),
          contactType: 'SECONDARY_PHONE',
          contactValue: secondaryPhone,
          isVerified: false,
          verifiedAt: null,
        });
      }
      if (email) {
        contacts.push({
          id: crypto.randomUUID(),
          contactType: 'EMAIL',
          contactValue: email,
          isVerified: false,
          verifiedAt: null,
        });
      }
      if (website) {
        contacts.push({
          id: crypto.randomUUID(),
          contactType: 'WEBSITE',
          contactValue: website,
          isVerified: false,
          verifiedAt: null,
        });
      }

      const record: HospitalDirectoryRecord = {
        id: deterministicId,
        directoryCode,
        legalName,
        displayName,
        facilityType,
        ownershipType,
        address,
        city,
        state,
        pincode,
        primaryPhone,
        secondaryPhone,
        email,
        website,
        specialties,
        emergencyAvailable,
        verificationStatus: 'PENDING_VERIFICATION',
        dataStatus,
        sourceName,
        sourceUrl,
        isActiveTenant: false,
        lastVerifiedAt: null,
        verifiedByUserId: null,
        rejectionReason: null,
        contacts,
        specialtyRecords: specialties.map((s) => ({
          id: crypto.randomUUID(),
          specialtyName: s,
          isVerified: false,
        })),
        sources: [
          {
            id: crypto.randomUUID(),
            sourceName,
            sourceUrl,
            dataStatusNote: dataStatus,
            importedAt: now,
          },
        ],
        verificationHistory: [
          {
            id: crypto.randomUUID(),
            fromStatus: null,
            toStatus: 'PENDING_VERIFICATION',
            actorUserId,
            notes: `Imported from ${sourceName} (${sourceFormat}) as draft directory record`,
            timestamp: now,
          },
        ],
        issueReports: [],
        createdAt: now,
        updatedAt: now,
      };

      directoryStore.records.set(deterministicId, record);

      // Sync to main hospitals table as a non-tenant PENDING_VERIFICATION directory entry
      db.hospitals.set(deterministicId, {
        id: deterministicId,
        name: displayName,
        registrationNumber: directoryCode || `RNC-DIR-${deterministicId.slice(0, 8)}`,
        category: facilityType,
        logoUrl: null,
        address,
        city,
        state,
        contactEmail: email || '',
        contactPhone: primaryPhone || '',
        totalBeds: 0,
        availableBeds: 0,
        status: 'PENDING',
        departments: specialties,
        createdByUserId: null,
        approvedByUserId: null,
        approvedAt: null,
        rejectionReason: null,
        createdAt: new Date(now),
        updatedAt: new Date(now),
      });

      importedCount += 1;
    }

    const summary: DirectoryImportSummary = {
      importJobId: crypto.randomUUID(),
      sourceFormat,
      totalRecordsRead: rawItems.length,
      importedCount,
      skippedDuplicateCount,
      preservedVerifiedCount,
      invalidCount,
      invalidErrors,
      importedAt: new Date().toISOString(),
    };
    directoryStore.importHistory.unshift(summary);

    db.logAudit({
      userId: actorUserId === 'SYSTEM_BOOTSTRAP' ? null : actorUserId,
      hospitalId: null,
      action: 'HOSPITAL_DIRECTORY_IMPORT_EXECUTED',
      entityType: 'HospitalDirectory',
      entityId: summary.importJobId,
      ipAddress: null,
      userAgent: null,
      metadata: summary as unknown as Record<string, unknown>,
    });

    return summary;
  }

  static importBundledRanchiDataset(format: 'JSON' | 'CSV' = 'JSON', actorUserId = 'SYSTEM_BOOTSTRAP') {
    const dataDir = path.resolve(__dirname, '../../../data');
    if (format === 'CSV') {
      const csvPath = path.join(dataDir, 'ranchi_hospitals_directory.csv');
      const content = fs.readFileSync(csvPath, 'utf-8');
      const parsed = this.parseCsvDataset(content);
      return this.importRecords(parsed, 'CSV', actorUserId);
    } else {
      const jsonPath = path.join(dataDir, 'ranchi_hospitals_directory.json');
      const content = fs.readFileSync(jsonPath, 'utf-8');
      const parsed = JSON.parse(content);
      return this.importRecords(parsed, 'JSON', actorUserId);
    }
  }
}

export class HospitalDirectoryService {
  static searchAndFilter(params: {
    search?: string;
    pincode?: string;
    ownership?: string;
    facilityType?: string;
    specialty?: string;
    verificationStatus?: string;
    sortOrder?: 'ASC' | 'DESC';
    page?: number;
    limit?: number;
  }) {
    let items = Array.from(directoryStore.records.values());

    if (params.search && params.search.trim()) {
      const q = params.search.trim().toLowerCase();
      items = items.filter(
        (h) =>
          h.displayName.toLowerCase().includes(q) ||
          h.address.toLowerCase().includes(q) ||
          (h.pincode && h.pincode.includes(q)) ||
          (h.directoryCode && h.directoryCode.toLowerCase().includes(q)) ||
          h.specialties.some((s) => s.toLowerCase().includes(q))
      );
    }

    if (params.pincode && params.pincode.trim()) {
      items = items.filter((h) => h.pincode === params.pincode!.trim());
    }

    if (params.ownership && params.ownership.trim() && params.ownership !== 'ALL') {
      const own = params.ownership.trim().toLowerCase();
      items = items.filter((h) => h.ownershipType.toLowerCase().includes(own));
    }

    if (params.facilityType && params.facilityType.trim() && params.facilityType !== 'ALL') {
      const ft = params.facilityType.trim().toLowerCase();
      items = items.filter((h) => h.facilityType.toLowerCase().includes(ft));
    }

    if (params.specialty && params.specialty.trim() && params.specialty !== 'ALL') {
      const sp = params.specialty.trim().toLowerCase();
      items = items.filter((h) => h.specialties.some((s) => s.toLowerCase().includes(sp)));
    }

    if (params.verificationStatus && params.verificationStatus.trim() && params.verificationStatus !== 'ALL') {
      items = items.filter((h) => h.verificationStatus === params.verificationStatus);
    }

    items.sort((a, b) => {
      const cmp = a.displayName.localeCompare(b.displayName);
      return params.sortOrder === 'DESC' ? -cmp : cmp;
    });

    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 25));
    const total = items.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const paged = items.slice((page - 1) * limit, page * limit);

    return {
      items: paged,
      meta: { page, limit, total, totalPages },
    };
  }

  static getAvailableFilters() {
    const all = Array.from(directoryStore.records.values());
    const pincodes = Array.from(new Set(all.map((h) => h.pincode).filter(Boolean) as string[])).sort();
    const ownershipCategories = ['Government', 'Private', 'Trust', 'Railway', 'Not confirmed'];
    const facilityTypes = Array.from(new Set(all.map((h) => h.facilityType))).sort();
    const specialtiesSet = new Set<string>();
    all.forEach((h) => h.specialties.forEach((s) => specialtiesSet.add(s)));
    const specialties = Array.from(specialtiesSet).sort();
    const verificationStatuses: DirectoryVerificationStatusType[] = [
      'PENDING_VERIFICATION',
      'UNDER_REVIEW',
      'VERIFIED',
      'REJECTED',
      'SUSPENDED',
    ];

    return {
      pincodes,
      ownershipCategories,
      facilityTypes,
      specialties,
      verificationStatuses,
    };
  }

  static getByIdOrCode(idOrCode: string): HospitalDirectoryRecord {
    const direct = directoryStore.records.get(idOrCode);
    if (direct) return direct;
    const byCode = Array.from(directoryStore.records.values()).find(
      (r) => r.directoryCode?.toLowerCase() === idOrCode.toLowerCase()
    );
    if (!byCode) {
      throw ApiError.notFound(`Hospital directory record '${idOrCode}' not found`);
    }
    return byCode;
  }

  static updateDirectoryRecord(
    superAdminUserId: string,
    idOrCode: string,
    patch: Partial<{
      displayName: string;
      legalName: string | null;
      facilityType: string;
      ownershipType: string;
      address: string;
      pincode: string | null;
      primaryPhone: string | null;
      secondaryPhone: string | null;
      email: string | null;
      website: string | null;
      specialties: string[];
      emergencyAvailable: boolean | null;
    }>
  ) {
    const rec = this.getByIdOrCode(idOrCode);
    if (patch.displayName !== undefined) rec.displayName = patch.displayName.trim();
    if (patch.legalName !== undefined) rec.legalName = patch.legalName;
    if (patch.facilityType !== undefined) rec.facilityType = patch.facilityType.trim();
    if (patch.ownershipType !== undefined) rec.ownershipType = patch.ownershipType.trim();
    if (patch.address !== undefined) rec.address = patch.address.trim();
    if (patch.pincode !== undefined) rec.pincode = patch.pincode;
    if (patch.primaryPhone !== undefined) rec.primaryPhone = patch.primaryPhone;
    if (patch.secondaryPhone !== undefined) rec.secondaryPhone = patch.secondaryPhone;
    if (patch.email !== undefined) rec.email = patch.email;
    if (patch.website !== undefined) rec.website = patch.website;
    if (patch.specialties !== undefined) rec.specialties = patch.specialties;
    if (patch.emergencyAvailable !== undefined) rec.emergencyAvailable = patch.emergencyAvailable;
    rec.updatedAt = new Date().toISOString();

    const hosp = db.hospitals.get(rec.id);
    if (hosp) {
      hosp.name = rec.displayName;
      hosp.address = rec.address;
      hosp.category = rec.facilityType;
      hosp.contactPhone = rec.primaryPhone || '';
      hosp.contactEmail = rec.email || '';
      hosp.departments = rec.specialties;
      hosp.updatedAt = new Date();
    }

    db.logAudit({
      userId: superAdminUserId,
      hospitalId: rec.id,
      action: 'HOSPITAL_DIRECTORY_RECORD_UPDATED',
      entityType: 'HospitalDirectory',
      entityId: rec.id,
      ipAddress: null,
      userAgent: null,
      metadata: patch as Record<string, unknown>,
    });

    return rec;
  }

  static changeVerificationStatus(
    superAdminUserId: string,
    idOrCode: string,
    newStatus: DirectoryVerificationStatusType,
    notes?: string
  ) {
    const rec = this.getByIdOrCode(idOrCode);
    const prev = rec.verificationStatus;
    const now = new Date().toISOString();
    rec.verificationStatus = newStatus;
    rec.updatedAt = now;

    if (newStatus === 'VERIFIED') {
      rec.lastVerifiedAt = now;
      rec.verifiedByUserId = superAdminUserId;
      rec.contacts.forEach((c) => {
        c.isVerified = true;
        c.verifiedAt = now;
      });
      rec.specialtyRecords.forEach((s) => {
        s.isVerified = true;
      });
    } else if (newStatus === 'REJECTED') {
      rec.rejectionReason = notes || 'Directory verification rejected by platform administrator';
    }

    rec.verificationHistory.unshift({
      id: crypto.randomUUID(),
      fromStatus: prev,
      toStatus: newStatus,
      actorUserId: superAdminUserId,
      notes: notes || `Status updated to ${newStatus}`,
      timestamp: now,
    });

    db.logAudit({
      userId: superAdminUserId,
      hospitalId: rec.id,
      action: `HOSPITAL_DIRECTORY_${newStatus}`,
      entityType: 'HospitalDirectory',
      entityId: rec.id,
      ipAddress: null,
      userAgent: null,
      metadata: { fromStatus: prev, toStatus: newStatus, notes: notes || null },
    });

    return rec;
  }

  static deleteDraftDirectoryRecord(superAdminUserId: string, idOrCode: string) {
    const rec = this.getByIdOrCode(idOrCode);
    if (rec.isActiveTenant || rec.verificationStatus === 'VERIFIED') {
      throw ApiError.badRequest('Cannot delete a verified hospital or active hospital tenant');
    }
    directoryStore.records.delete(rec.id);
    db.hospitals.delete(rec.id);
    db.logAudit({
      userId: superAdminUserId,
      hospitalId: rec.id,
      action: 'HOSPITAL_DIRECTORY_DRAFT_DELETED',
      entityType: 'HospitalDirectory',
      entityId: rec.id,
      ipAddress: null,
      userAgent: null,
      metadata: { directoryCode: rec.directoryCode, displayName: rec.displayName },
    });
    return { deletedId: rec.id, directoryCode: rec.directoryCode };
  }

  /**
   * Connects a Hospital Directory listing to the Phase 9 Hospital Onboarding workflow
   * ("Register This Hospital" in Section 10).
   */
  static claimAndSubmitOnboarding(
    actorUserId: string,
    idOrCode: string,
    payload: {
      legalName: string;
      clinicalLicenseNumber: string;
      gstin?: string;
      officialEmail: string;
      officialPhone: string;
      adminFullName: string;
      documentFileName?: string;
    }
  ) {
    const rec = this.getByIdOrCode(idOrCode);
    if (rec.isActiveTenant) {
      throw ApiError.conflict('This hospital is already registered as an active MediCore tenant', 'HOSPITAL_ALREADY_CLAIMED');
    }
    if (!payload.legalName || !payload.clinicalLicenseNumber || !payload.officialEmail || !payload.officialPhone) {
      throw ApiError.badRequest('legalName, clinicalLicenseNumber, officialEmail, and officialPhone are required to claim registration');
    }

    const prevStatus = rec.verificationStatus;
    rec.verificationStatus = 'UNDER_REVIEW';
    rec.legalName = payload.legalName.trim();
    rec.updatedAt = new Date().toISOString();
    rec.verificationHistory.unshift({
      id: crypto.randomUUID(),
      fromStatus: prevStatus,
      toStatus: 'UNDER_REVIEW',
      actorUserId,
      notes: `Hospital registration claim submitted by ${payload.adminFullName} (${payload.officialEmail})`,
      timestamp: rec.updatedAt,
    });

    const onboarding = SaasPlatformService.registerHospitalOnboarding(actorUserId, {
      legalName: payload.legalName,
      displayName: rec.displayName,
      hospitalType: rec.facilityType,
      registrationNumber: rec.directoryCode || `RNC-REG-${rec.id.slice(0, 6)}`,
      clinicalLicenseNumber: payload.clinicalLicenseNumber,
      gstin: payload.gstin,
      address: rec.address,
      city: rec.city,
      state: rec.state,
      pincode: rec.pincode || '834001',
      adminFullName: payload.adminFullName,
      adminEmail: payload.officialEmail,
      adminPhone: payload.officialPhone,
    });

    if (payload.documentFileName) {
      SaasPlatformService.uploadVerificationDocument(actorUserId, onboarding.hospitalId, {
        documentType: 'CLINICAL_ESTABLISHMENT_LICENSE',
        fileName: payload.documentFileName,
        mimeType: 'application/pdf',
        fileSizeBytes: 185000,
      });
    }

    db.logAudit({
      userId: actorUserId,
      hospitalId: rec.id,
      action: 'HOSPITAL_DIRECTORY_CLAIM_SUBMITTED',
      entityType: 'HospitalDirectory',
      entityId: rec.id,
      ipAddress: null,
      userAgent: null,
      metadata: { onboardingHospitalId: onboarding.hospitalId, clinicalLicenseNumber: payload.clinicalLicenseNumber },
    });

    return {
      directoryRecord: rec,
      onboarding,
    };
  }

  static reportIncorrectInformation(
    actorUserId: string | null,
    idOrCode: string,
    payload: { field: string; description: string }
  ) {
    const rec = this.getByIdOrCode(idOrCode);
    if (!payload.description || payload.description.trim().length < 5) {
      throw ApiError.badRequest('Please provide a clear description of the incorrect information');
    }
    const report = {
      id: crypto.randomUUID(),
      reportedByUserId: actorUserId,
      field: payload.field || 'GENERAL',
      description: payload.description.trim(),
      reportedAt: new Date().toISOString(),
    };
    rec.issueReports.unshift(report);
    return report;
  }
}
