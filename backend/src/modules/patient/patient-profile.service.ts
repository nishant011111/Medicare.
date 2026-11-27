import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { db, DbEmergencyContact, DbPatientAddress, DbPatientHealthInfo, DbPatientProfile } from '../../database/prisma';
import { ApiError } from '../../utils/errors';
import { env } from '../../config/env';
import { detectValidatedImageFormat } from '../../utils/multipart';
import { clinicalStore } from '../clinical/clinical.service';
import { AuthService } from '../auth/auth.service';

export interface ProfileCompletionSummary {
  percent: number;
  isComplete: boolean;
  sections: {
    personalInfo: boolean;
    contactInfo: boolean;
    address: boolean;
    emergencyContact: boolean;
    healthInformationOptional: boolean;
    profilePhotoOptional: boolean;
  };
  missingRequiredSections: string[];
}

export class PatientProfileService {
  private static getPhotoDir(): string {
    const dir = path.resolve(env.PRIVATE_STORAGE_DIR, 'patient-photos');
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  private static normalizePhone(phone: string): string {
    return phone.trim().replace(/[\s()-]/g, '');
  }

  static ensurePatientProfile(userId: string): DbPatientProfile {
    const user = db.users.get(userId);
    if (!user) {
      throw ApiError.notFound('Authenticated user not found');
    }

    let profile = Array.from(db.patientProfiles.values()).find((p) => p.userId === userId);
    if (!profile) {
      const now = new Date();
      profile = {
        id: crypto.randomUUID(),
        userId: user.id,
        globalPatientId: `MC-PAT-${user.id.slice(0, 8).toUpperCase()}`,
        dateOfBirth: null,
        gender: null,
        onboardingCompleted: false,
        termsAcceptedAt: null,
        healthConsentGranted: false,
        healthConsentAt: null,
        profileCompletionPercent: 0,
        createdAt: now,
        updatedAt: now,
      };
      db.patientProfiles.set(profile.id, profile);
    }

    this.recalculateCompletion(profile);
    this.syncToClinicalStore(userId);
    return profile;
  }

  static calculateCompletion(userId: string, profile: DbPatientProfile): ProfileCompletionSummary {
    const user = db.users.get(userId);
    const primaryAddress = Array.from(db.patientAddresses.values()).find(
      (a) => a.patientId === profile.id && a.isPrimary
    ) || Array.from(db.patientAddresses.values()).find((a) => a.patientId === profile.id);
    const contacts = Array.from(db.emergencyContacts.values()).filter((c) => c.patientId === profile.id);
    const health = Array.from(db.patientHealthInfo.values()).find((h) => h.patientId === profile.id);
    const photo = Array.from(db.patientProfilePhotos.values()).find((p) => p.patientId === profile.id);

    let score = 0;
    const missingRequiredSections: string[] = [];

    const hasFullName = Boolean(user?.fullName && user.fullName.trim().length >= 2);
    const hasDob = Boolean(profile.dateOfBirth && profile.dateOfBirth.trim().length > 0);
    const hasGender = Boolean(profile.gender && profile.gender.trim().length > 0);
    if (hasFullName) score += 10;
    if (hasDob) score += 10;
    if (hasGender) score += 10;
    const personalInfo = hasFullName && hasDob && hasGender;
    if (!personalInfo) missingRequiredSections.push('Personal Information');

    const hasPhone = Boolean(user?.phone && user.phone.trim().length >= 8);
    if (hasPhone) score += 20;
    const contactInfo = hasPhone;
    if (!contactInfo) missingRequiredSections.push('Contact Information');

    const hasAddress = Boolean(
      primaryAddress &&
        primaryAddress.street.trim().length > 0 &&
        primaryAddress.city.trim().length > 0 &&
        primaryAddress.state.trim().length > 0 &&
        primaryAddress.postalCode.trim().length > 0
    );
    if (hasAddress) score += 30;
    else missingRequiredSections.push('Residential Address');

    const hasEmergency = contacts.length > 0;
    if (hasEmergency) score += 20;
    else missingRequiredSections.push('Emergency Contact');

    // Optional health information and photo NEVER prevent reaching 100% completion
    const healthInformationOptional = Boolean(
      health &&
        (health.bloodGroup ||
          health.knownAllergies.length > 0 ||
          health.existingConditions.length > 0 ||
          health.currentMedications.length > 0 ||
          (health.medicalNotes && health.medicalNotes.trim().length > 0))
    );
    const profilePhotoOptional = Boolean(photo);

    return {
      percent: Math.min(100, score),
      isComplete: score === 100,
      sections: {
        personalInfo,
        contactInfo,
        address: hasAddress,
        emergencyContact: hasEmergency,
        healthInformationOptional,
        profilePhotoOptional,
      },
      missingRequiredSections,
    };
  }

  private static recalculateCompletion(profile: DbPatientProfile): ProfileCompletionSummary {
    const summary = this.calculateCompletion(profile.userId, profile);
    profile.profileCompletionPercent = summary.percent;
    profile.updatedAt = new Date();
    return summary;
  }

  private static syncToClinicalStore(userId: string) {
    const user = db.users.get(userId);
    const profile = Array.from(db.patientProfiles.values()).find((p) => p.userId === userId);
    if (!user || !profile) return;

    const primaryAddress = Array.from(db.patientAddresses.values()).find((a) => a.patientId === profile.id);
    const primaryContact = Array.from(db.emergencyContacts.values()).find((c) => c.patientId === profile.id);
    const health = Array.from(db.patientHealthInfo.values()).find((h) => h.patientId === profile.id);

    const formattedAddress = primaryAddress
      ? [primaryAddress.houseNumber, primaryAddress.street, primaryAddress.locality].filter(Boolean).join(', ')
      : '';

    const links = Array.from(db.memberships.values())
      .filter((m) => m.userId === userId && m.status === 'ACTIVE')
      .map((m) => ({
        hospitalId: m.hospitalId,
        hospitalRegistrationNumber: `HOSP-${m.hospitalId.slice(0, 6).toUpperCase()}`,
        status: m.status,
        consentToShareWithHospitalIds: [],
      }));

    clinicalStore.patients.set(profile.id, {
      id: profile.id,
      userId: user.id,
      globalPatientId: profile.globalPatientId,
      fullName: user.fullName,
      email: user.email || '',
      phone: user.phone || '',
      dateOfBirth: profile.dateOfBirth || '',
      gender: profile.gender || '',
      bloodGroup: health?.bloodGroup || '',
      emergencyContactName: primaryContact?.name || '',
      emergencyContactPhone: primaryContact?.phone || '',
      address: formattedAddress,
      city: primaryAddress?.city || '',
      state: primaryAddress?.state || '',
      hospitalLinks: links,
    });
  }

  private static assertVerifiedContactsImmutable(
    userId: string,
    payload: { email?: string; phone?: string }
  ) {
    const user = db.users.get(userId);
    if (!user) throw ApiError.notFound('User not found');

    if (
      payload.email !== undefined &&
      user.email &&
      payload.email.toLowerCase().trim() !== user.email.toLowerCase()
    ) {
      throw ApiError.forbidden(
        'Primary email address cannot be changed directly without email verification.',
        'VERIFIED_EMAIL_CHANGE_REQUIRES_VERIFICATION'
      );
    }

    if (payload.email !== undefined && !user.email) {
      const normalizedEmail = payload.email.toLowerCase().trim();
      const duplicateEmail = Array.from(db.users.values()).find(
        (u) => u.id !== user.id && u.email && u.email.toLowerCase() === normalizedEmail
      );
      if (duplicateEmail) {
        throw ApiError.conflict('This email address is already registered to another account', 'EMAIL_ALREADY_EXISTS');
      }
      user.email = normalizedEmail;
    }

    if (
      payload.phone !== undefined &&
      user.phone &&
      this.normalizePhone(payload.phone) !== this.normalizePhone(user.phone)
    ) {
      throw ApiError.forbidden(
        'Registered mobile number cannot be modified directly without phone verification.',
        'VERIFIED_PHONE_CHANGE_REQUIRES_VERIFICATION'
      );
    }

    if (payload.phone !== undefined && !user.phone) {
      const normalized = this.normalizePhone(payload.phone);
      const duplicate = Array.from(db.users.values()).find(
        (u) => u.id !== user.id && u.phone && this.normalizePhone(u.phone) === normalized
      );
      if (duplicate) {
        throw ApiError.conflict('This mobile number is already registered to another account', 'PHONE_ALREADY_EXISTS');
      }
      user.phone = normalized;
    }
  }

  static getFullProfile(userId: string) {
    const user = db.users.get(userId);
    if (!user) throw ApiError.notFound('User not found');

    const profile = this.ensurePatientProfile(userId);
    const completion = this.recalculateCompletion(profile);
    const address =
      Array.from(db.patientAddresses.values()).find((a) => a.patientId === profile.id && a.isPrimary) ||
      Array.from(db.patientAddresses.values()).find((a) => a.patientId === profile.id) ||
      null;
    const emergencyContacts = Array.from(db.emergencyContacts.values()).filter(
      (c) => c.patientId === profile.id
    );
    const healthInformation =
      Array.from(db.patientHealthInfo.values()).find((h) => h.patientId === profile.id) || null;
    const photo =
      Array.from(db.patientProfilePhotos.values()).find((p) => p.patientId === profile.id) || null;

    const hospitalAssociations = Array.from(db.memberships.values())
      .filter((m) => m.userId === userId)
      .map((m) => {
        const hospital = db.hospitals.get(m.hospitalId);
        return {
          membershipId: m.id,
          hospitalId: m.hospitalId,
          hospitalName: hospital?.name ?? 'Hospital',
          city: hospital?.city ?? null,
          status: m.status,
          joinedAt: m.joinedAt.toISOString(),
        };
      });

    return {
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email || '',
        phone: user.phone,
        isEmailVerified: user.isEmailVerified,
      },
      patient: {
        id: profile.id,
        globalPatientId: profile.globalPatientId,
        dateOfBirth: profile.dateOfBirth,
        gender: profile.gender,
        onboardingCompleted: profile.onboardingCompleted,
        healthConsentGranted: profile.healthConsentGranted,
        healthConsentAt: profile.healthConsentAt?.toISOString() ?? null,
        profileCompletionPercent: completion.percent,
      },
      address: address
        ? {
            id: address.id,
            houseNumber: address.houseNumber,
            street: address.street,
            locality: address.locality,
            city: address.city,
            state: address.state,
            postalCode: address.postalCode,
            country: address.country,
          }
        : null,
      emergencyContacts: emergencyContacts.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        relationship: c.relationship,
        isPrimary: c.isPrimary,
      })),
      healthInformation: healthInformation
        ? {
            bloodGroup: healthInformation.bloodGroup,
            knownAllergies: healthInformation.knownAllergies,
            existingConditions: healthInformation.existingConditions,
            currentMedications: healthInformation.currentMedications,
            medicalNotes: healthInformation.medicalNotes,
            consentGranted: healthInformation.consentGranted,
            consentTimestamp: healthInformation.consentTimestamp?.toISOString() ?? null,
          }
        : null,
      profilePhoto: photo
        ? {
            id: photo.id,
            fileName: photo.fileName,
            mimeType: photo.mimeType,
            sizeBytes: photo.sizeBytes,
            url: '/api/v1/patient/profile/photo',
            uploadedAt: photo.uploadedAt.toISOString(),
          }
        : null,
      profileCompletion: completion,
      hospitalAssociations,
      me: AuthService.buildMeProfile(userId),
    };
  }

  static updatePersonalInfo(
    userId: string,
    payload: {
      fullName: string;
      dateOfBirth?: string | null;
      gender?: string | null;
      email?: string;
      phone?: string;
    }
  ) {
    const user = db.users.get(userId);
    if (!user) throw ApiError.notFound('User not found');

    this.assertVerifiedContactsImmutable(userId, { email: payload.email, phone: payload.phone });
    const profile = this.ensurePatientProfile(userId);

    user.fullName = payload.fullName.trim();
    user.updatedAt = new Date();

    if (payload.dateOfBirth !== undefined) {
      profile.dateOfBirth = payload.dateOfBirth;
    }
    if (payload.gender !== undefined) {
      profile.gender = payload.gender;
    }
    this.recalculateCompletion(profile);
    this.syncToClinicalStore(userId);

    db.logAudit({
      userId,
      hospitalId: null,
      action: 'PATIENT_PERSONAL_INFO_UPDATED',
      entityType: 'Patient',
      entityId: profile.id,
      ipAddress: null,
      userAgent: null,
      metadata: { updatedFields: ['fullName', 'dateOfBirth', 'gender'] },
    });

    return this.getFullProfile(userId);
  }

  static updateAddress(
    userId: string,
    payload: {
      houseNumber?: string | null;
      street: string;
      locality?: string | null;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    }
  ) {
    const profile = this.ensurePatientProfile(userId);
    const now = new Date();
    let existing = Array.from(db.patientAddresses.values()).find(
      (a) => a.patientId === profile.id && a.isPrimary
    );

    if (existing) {
      existing.houseNumber = payload.houseNumber ?? null;
      existing.street = payload.street.trim();
      existing.locality = payload.locality ?? null;
      existing.city = payload.city.trim();
      existing.state = payload.state.trim();
      existing.postalCode = payload.postalCode.trim();
      existing.country = payload.country.trim();
      existing.updatedAt = now;
    } else {
      existing = {
        id: crypto.randomUUID(),
        patientId: profile.id,
        houseNumber: payload.houseNumber ?? null,
        street: payload.street.trim(),
        locality: payload.locality ?? null,
        city: payload.city.trim(),
        state: payload.state.trim(),
        postalCode: payload.postalCode.trim(),
        country: payload.country.trim(),
        isPrimary: true,
        createdAt: now,
        updatedAt: now,
      };
      db.patientAddresses.set(existing.id, existing);
    }

    this.recalculateCompletion(profile);
    this.syncToClinicalStore(userId);

    db.logAudit({
      userId,
      hospitalId: null,
      action: 'PATIENT_ADDRESS_UPDATED',
      entityType: 'PatientAddress',
      entityId: existing.id,
      ipAddress: null,
      userAgent: null,
      metadata: { city: existing.city, country: existing.country },
    });

    return this.getFullProfile(userId);
  }

  static listEmergencyContacts(userId: string) {
    const profile = this.ensurePatientProfile(userId);
    return Array.from(db.emergencyContacts.values()).filter((c) => c.patientId === profile.id);
  }

  static upsertPrimaryEmergencyContact(
    userId: string,
    payload: { name: string; phone: string; relationship: string }
  ) {
    const profile = this.ensurePatientProfile(userId);
    const existingPrimary = Array.from(db.emergencyContacts.values()).find(
      (c) => c.patientId === profile.id && c.isPrimary
    ) || Array.from(db.emergencyContacts.values()).find((c) => c.patientId === profile.id);

    if (existingPrimary) {
      return this.updateEmergencyContact(userId, existingPrimary.id, { ...payload, isPrimary: true });
    }
    return this.addEmergencyContact(userId, { ...payload, isPrimary: true });
  }

  static addEmergencyContact(
    userId: string,
    payload: { name: string; phone: string; relationship: string; isPrimary?: boolean }
  ) {
    const user = db.users.get(userId);
    if (!user) throw ApiError.notFound('User not found');

    if (user.phone && this.normalizePhone(payload.phone) === this.normalizePhone(user.phone)) {
      throw ApiError.badRequest(
        'Emergency contact phone number must be different from your own login phone number',
        'EMERGENCY_CONTACT_MUST_BE_DISTINCT'
      );
    }

    const profile = this.ensurePatientProfile(userId);
    const existingContacts = Array.from(db.emergencyContacts.values()).filter((c) => c.patientId === profile.id);
    if (existingContacts.length >= 5) {
      throw ApiError.badRequest('Maximum of 5 emergency contacts allowed', 'MAX_EMERGENCY_CONTACTS_REACHED');
    }

    const makePrimary = payload.isPrimary ?? existingContacts.length === 0;
    if (makePrimary) {
      for (const c of existingContacts) {
        c.isPrimary = false;
      }
    }

    const now = new Date();
    const record: DbEmergencyContact = {
      id: crypto.randomUUID(),
      patientId: profile.id,
      name: payload.name.trim(),
      phone: payload.phone.trim(),
      relationship: payload.relationship.trim(),
      isPrimary: makePrimary,
      createdAt: now,
      updatedAt: now,
    };
    db.emergencyContacts.set(record.id, record);

    this.recalculateCompletion(profile);
    this.syncToClinicalStore(userId);

    db.logAudit({
      userId,
      hospitalId: null,
      action: 'PATIENT_EMERGENCY_CONTACT_ADDED',
      entityType: 'EmergencyContact',
      entityId: record.id,
      ipAddress: null,
      userAgent: null,
      metadata: { relationship: record.relationship },
    });

    return { contact: record, profile: this.getFullProfile(userId) };
  }

  static updateEmergencyContact(
    userId: string,
    contactId: string,
    payload: { name: string; phone: string; relationship: string; isPrimary?: boolean }
  ) {
    const user = db.users.get(userId);
    if (!user) throw ApiError.notFound('User not found');
    const profile = this.ensurePatientProfile(userId);

    const existing = db.emergencyContacts.get(contactId);
    if (!existing) {
      throw ApiError.notFound('Emergency contact not found');
    }
    if (existing.patientId !== profile.id) {
      throw ApiError.forbidden('You are not authorized to modify this emergency contact');
    }

    if (user.phone && this.normalizePhone(payload.phone) === this.normalizePhone(user.phone)) {
      throw ApiError.badRequest(
        'Emergency contact phone number must be different from your own login phone number',
        'EMERGENCY_CONTACT_MUST_BE_DISTINCT'
      );
    }

    if (payload.isPrimary) {
      for (const c of db.emergencyContacts.values()) {
        if (c.patientId === profile.id) c.isPrimary = false;
      }
      existing.isPrimary = true;
    }

    existing.name = payload.name.trim();
    existing.phone = payload.phone.trim();
    existing.relationship = payload.relationship.trim();
    existing.updatedAt = new Date();

    this.recalculateCompletion(profile);
    this.syncToClinicalStore(userId);

    db.logAudit({
      userId,
      hospitalId: null,
      action: 'PATIENT_EMERGENCY_CONTACT_UPDATED',
      entityType: 'EmergencyContact',
      entityId: existing.id,
      ipAddress: null,
      userAgent: null,
      metadata: null,
    });

    return { contact: existing, profile: this.getFullProfile(userId) };
  }

  static deleteEmergencyContact(userId: string, contactId: string) {
    const profile = this.ensurePatientProfile(userId);
    const existing = db.emergencyContacts.get(contactId);
    if (!existing) {
      throw ApiError.notFound('Emergency contact not found');
    }
    if (existing.patientId !== profile.id) {
      throw ApiError.forbidden('You are not authorized to delete this emergency contact');
    }

    db.emergencyContacts.delete(contactId);
    if (existing.isPrimary) {
      const nextContact = Array.from(db.emergencyContacts.values()).find((c) => c.patientId === profile.id);
      if (nextContact) nextContact.isPrimary = true;
    }

    this.recalculateCompletion(profile);
    this.syncToClinicalStore(userId);

    db.logAudit({
      userId,
      hospitalId: null,
      action: 'PATIENT_EMERGENCY_CONTACT_DELETED',
      entityType: 'EmergencyContact',
      entityId: contactId,
      ipAddress: null,
      userAgent: null,
      metadata: null,
    });

    return this.getFullProfile(userId);
  }

  static updateHealthInformation(
    userId: string,
    payload: {
      consentGranted: boolean;
      bloodGroup?: string | null;
      knownAllergies: string[];
      existingConditions: string[];
      currentMedications: string[];
      medicalNotes?: string | null;
    }
  ) {
    if (!payload.consentGranted) {
      throw ApiError.badRequest(
        'Explicit consent must be granted before saving sensitive health information',
        'HEALTH_CONSENT_REQUIRED'
      );
    }

    const profile = this.ensurePatientProfile(userId);
    const now = new Date();

    profile.healthConsentGranted = true;
    profile.healthConsentAt = profile.healthConsentAt ?? now;

    let health = Array.from(db.patientHealthInfo.values()).find((h) => h.patientId === profile.id);
    if (health) {
      health.bloodGroup = payload.bloodGroup ?? null;
      health.knownAllergies = payload.knownAllergies;
      health.existingConditions = payload.existingConditions;
      health.currentMedications = payload.currentMedications;
      health.medicalNotes = payload.medicalNotes ?? null;
      health.consentGranted = true;
      health.consentTimestamp = health.consentTimestamp ?? now;
      health.updatedAt = now;
    } else {
      health = {
        id: crypto.randomUUID(),
        patientId: profile.id,
        bloodGroup: payload.bloodGroup ?? null,
        knownAllergies: payload.knownAllergies,
        existingConditions: payload.existingConditions,
        currentMedications: payload.currentMedications,
        medicalNotes: payload.medicalNotes ?? null,
        consentGranted: true,
        consentTimestamp: now,
        createdAt: now,
        updatedAt: now,
      };
      db.patientHealthInfo.set(health.id, health);
    }

    this.recalculateCompletion(profile);
    this.syncToClinicalStore(userId);

    db.logAudit({
      userId,
      hospitalId: null,
      action: 'PATIENT_HEALTH_INFO_UPDATED',
      entityType: 'PatientHealthInformation',
      entityId: health.id,
      ipAddress: null,
      userAgent: null,
      metadata: {
        consentGranted: true,
        allergyCount: health.knownAllergies.length,
        conditionCount: health.existingConditions.length,
        medicationCount: health.currentMedications.length,
      },
    });

    return this.getFullProfile(userId);
  }

  static uploadProfilePhoto(
    userId: string,
    input: { buffer: Buffer; fileName: string; claimedMimeType?: string }
  ) {
    const maxBytes = 5 * 1024 * 1024;
    if (input.buffer.length === 0) {
      throw ApiError.badRequest('Profile photo cannot be empty', 'EMPTY_FILE');
    }
    if (input.buffer.length > maxBytes) {
      throw ApiError.badRequest('Profile photo must be 5 MB or smaller', 'FILE_TOO_LARGE');
    }

    // Validate actual binary magic bytes rather than trusting extension or client header alone
    const detected = detectValidatedImageFormat(input.buffer);
    const sha256 = crypto.createHash('sha256').update(input.buffer).digest('hex');

    const profile = this.ensurePatientProfile(userId);
    const dir = this.getPhotoDir();

    // Remove previous photo file cleanly if replacing
    const existing = Array.from(db.patientProfilePhotos.values()).find((p) => p.patientId === profile.id);
    if (existing) {
      const oldPath = path.join(dir, existing.storageKey);
      if (fs.existsSync(oldPath)) {
        try {
          fs.unlinkSync(oldPath);
        } catch {
          // ignore unlink cleanup errors
        }
      }
      db.patientProfilePhotos.delete(existing.id);
    }

    const storageKey = `${profile.id}_${crypto.randomUUID()}.${detected.ext}`;
    const fullPath = path.join(dir, storageKey);
    fs.writeFileSync(fullPath, input.buffer);

    const now = new Date();
    const safeFileName = path.basename(input.fileName || `avatar.${detected.ext}`).replace(/[^a-zA-Z0-9._-]/g, '_');
    const photoRecord = {
      id: crypto.randomUUID(),
      patientId: profile.id,
      fileName: safeFileName,
      mimeType: detected.mimeType,
      sizeBytes: input.buffer.length,
      storageKey,
      sha256,
      uploadedAt: now,
      updatedAt: now,
    };
    db.patientProfilePhotos.set(photoRecord.id, photoRecord);

    this.recalculateCompletion(profile);

    db.logAudit({
      userId,
      hospitalId: null,
      action: 'PATIENT_PROFILE_PHOTO_UPLOADED',
      entityType: 'PatientProfilePhoto',
      entityId: photoRecord.id,
      ipAddress: null,
      userAgent: null,
      metadata: { mimeType: photoRecord.mimeType, sizeBytes: photoRecord.sizeBytes },
    });

    return this.getFullProfile(userId);
  }

  static getProfilePhotoStreamData(userId: string): { buffer: Buffer; mimeType: string; fileName: string } {
    const profile = this.ensurePatientProfile(userId);
    const photo = Array.from(db.patientProfilePhotos.values()).find((p) => p.patientId === profile.id);
    if (!photo) {
      throw ApiError.notFound('Profile photo not found', 'PHOTO_NOT_FOUND');
    }

    const fullPath = path.join(this.getPhotoDir(), photo.storageKey);
    if (!fs.existsSync(fullPath)) {
      throw ApiError.notFound('Stored profile photo file is missing', 'PHOTO_FILE_MISSING');
    }

    return {
      buffer: fs.readFileSync(fullPath),
      mimeType: photo.mimeType,
      fileName: photo.fileName,
    };
  }

  static deleteProfilePhoto(userId: string) {
    const profile = this.ensurePatientProfile(userId);
    const existing = Array.from(db.patientProfilePhotos.values()).find((p) => p.patientId === profile.id);
    if (existing) {
      const fullPath = path.join(this.getPhotoDir(), existing.storageKey);
      if (fs.existsSync(fullPath)) {
        try {
          fs.unlinkSync(fullPath);
        } catch {
          // ignore
        }
      }
      db.patientProfilePhotos.delete(existing.id);
      db.logAudit({
        userId,
        hospitalId: null,
        action: 'PATIENT_PROFILE_PHOTO_DELETED',
        entityType: 'PatientProfilePhoto',
        entityId: existing.id,
        ipAddress: null,
        userAgent: null,
        metadata: null,
      });
    }

    return this.getFullProfile(userId);
  }

  static updateCompositeProfile(
    userId: string,
    payload: {
      fullName?: string;
      dateOfBirth?: string | null;
      gender?: string | null;
      email?: string;
      phone?: string;
      address?: {
        houseNumber?: string | null;
        street: string;
        locality?: string | null;
        city: string;
        state: string;
        postalCode: string;
        country: string;
      };
      emergencyContact?: {
        name: string;
        phone: string;
        relationship: string;
      };
      healthInformation?: {
        consentGranted: boolean;
        bloodGroup?: string | null;
        knownAllergies: string[];
        existingConditions: string[];
        currentMedications: string[];
        medicalNotes?: string | null;
      };
    }
  ) {
    const user = db.users.get(userId);
    if (!user) throw ApiError.notFound('User not found');

    this.assertVerifiedContactsImmutable(userId, { email: payload.email, phone: payload.phone });
    const profile = this.ensurePatientProfile(userId);

    if (payload.fullName !== undefined || payload.dateOfBirth !== undefined || payload.gender !== undefined) {
      this.updatePersonalInfo(userId, {
        fullName: payload.fullName ?? user.fullName,
        dateOfBirth: payload.dateOfBirth !== undefined ? payload.dateOfBirth : profile.dateOfBirth,
        gender: payload.gender !== undefined ? payload.gender : profile.gender,
      });
    }

    if (payload.address) {
      this.updateAddress(userId, payload.address);
    }

    if (payload.emergencyContact) {
      this.upsertPrimaryEmergencyContact(userId, payload.emergencyContact);
    }

    if (payload.healthInformation) {
      this.updateHealthInformation(userId, payload.healthInformation);
    }

    return this.getFullProfile(userId);
  }

  static completeOnboarding(userId: string) {
    const user = db.users.get(userId);
    if (!user) throw ApiError.notFound('User not found');

    const profile = this.ensurePatientProfile(userId);
    if (!user.fullName || user.fullName.trim().length < 2 || !user.phone || !profile.dateOfBirth || !profile.gender) {
      throw ApiError.badRequest(
        'Please complete your personal and contact information (full name, mobile number, date of birth, and gender) before finishing onboarding.',
        'MANDATORY_ONBOARDING_INCOMPLETE'
      );
    }

    profile.onboardingCompleted = true;
    profile.updatedAt = new Date();
    this.recalculateCompletion(profile);

    db.logAudit({
      userId,
      hospitalId: null,
      action: 'PATIENT_ONBOARDING_COMPLETED',
      entityType: 'Patient',
      entityId: profile.id,
      ipAddress: null,
      userAgent: null,
      metadata: { profileCompletionPercent: profile.profileCompletionPercent },
    });

    return this.getFullProfile(userId);
  }
}
