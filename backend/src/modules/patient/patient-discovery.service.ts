import { db } from '../../database/prisma';
import { ApiError } from '../../utils/errors';
import { clinicalStore, DoctorRecord } from '../clinical/clinical.service';
import { directoryStore, HospitalDirectoryRecord } from '../directory/directory.service';
import { validateDiscoveryIdentifier } from './patient-discovery.schema';

export interface PatientHospitalSummaryDto {
  id: string;
  directoryCode: string | null;
  name: string;
  hospitalType: string;
  ownershipType: string | null;
  logoUrl: string | null;
  address: string;
  city: string;
  state: string;
  pincode: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  website: string | null;
  specialties: string[];
  departments: string[];
  verificationStatus: string | null;
  isVerified: boolean;
  emergencyAvailable: boolean | null;
  about: string | null;
  operatingHours: string | null;
  doctorCount: number;
  cancellationPolicyHours: number | null;
}

export interface PatientDoctorSummaryDto {
  id: string;
  fullName: string;
  specialization: string;
  qualification: string;
  experienceYears: number;
  bio: string | null;
  profilePhotoUrl: string | null;
  hospitalId: string;
  hospitalName: string;
  hospitalCity: string;
  departmentId: string;
  departmentName: string;
  consultationFee: number | null;
  slotDurationMinutes: number;
  verificationStatus: string;
  isAvailable: boolean;
  scheduleSummary: Array<{
    dayOfWeek: number;
    dayName: string;
    startTime: string;
    endTime: string;
    timezone: string;
  }>;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export class PatientDiscoveryService {
  private static buildMergedHospitals(): PatientHospitalSummaryDto[] {
    const byId = new Map<string, PatientHospitalSummaryDto>();

    const activeDoctors = Array.from(clinicalStore.doctors.values()).filter(
      (d) => d.verificationStatus !== 'REJECTED'
    );

    const countDoctorsForHospital = (hospId: string, dirCode: string | null) =>
      activeDoctors.filter((d) => d.hospitalId === hospId || (dirCode && d.hospitalId === dirCode)).length;

    // 1. Registered & approved/active tenant hospitals in relational DB
    for (const h of db.hospitals.values()) {
      if (!['APPROVED', 'ACTIVE'].includes(h.status)) continue;
      const matchingDir = Array.from(directoryStore.records.values()).find((d) => d.id === h.id);
      const verified = h.status === 'APPROVED' || h.status === 'ACTIVE' || matchingDir?.verificationStatus === 'VERIFIED';

      byId.set(h.id, {
        id: h.id,
        directoryCode: matchingDir?.directoryCode ?? null,
        name: h.name,
        hospitalType: matchingDir?.facilityType || h.category,
        ownershipType: matchingDir?.ownershipType ?? null,
        logoUrl: h.logoUrl ?? null,
        address: h.address,
        city: h.city,
        state: h.state,
        pincode: matchingDir?.pincode ?? null,
        contactPhone: h.contactPhone || matchingDir?.primaryPhone || null,
        contactEmail: h.contactEmail || matchingDir?.email || null,
        website: matchingDir?.website ?? null,
        specialties: matchingDir?.specialties?.length ? matchingDir.specialties : h.departments,
        departments: h.departments,
        verificationStatus: matchingDir?.verificationStatus ?? (verified ? 'VERIFIED' : null),
        isVerified: verified,
        emergencyAvailable: matchingDir?.emergencyAvailable ?? null,
        about: h.about ?? null,
        operatingHours: h.operatingHours ?? null,
        doctorCount: countDoctorsForHospital(h.id, matchingDir?.directoryCode ?? null),
        cancellationPolicyHours: h.cancellationPolicyHours ?? null,
      });
    }

    // 2. Ranchi Hospital Directory records (exclude SUSPENDED or REJECTED)
    for (const rec of directoryStore.records.values()) {
      if (rec.verificationStatus === 'REJECTED' || rec.verificationStatus === 'SUSPENDED') continue;
      if (byId.has(rec.id)) continue;

      byId.set(rec.id, this.fromDirectoryRecord(rec, countDoctorsForHospital(rec.id, rec.directoryCode)));
    }

    return Array.from(byId.values());
  }

  private static fromDirectoryRecord(rec: HospitalDirectoryRecord, doctorCount: number): PatientHospitalSummaryDto {
    return {
      id: rec.id,
      directoryCode: rec.directoryCode,
      name: rec.displayName,
      hospitalType: rec.facilityType,
      ownershipType: rec.ownershipType,
      logoUrl: null,
      address: rec.address,
      city: rec.city,
      state: rec.state,
      pincode: rec.pincode,
      contactPhone: rec.primaryPhone,
      contactEmail: rec.email,
      website: rec.website,
      specialties: rec.specialties,
      departments: rec.specialties,
      verificationStatus: rec.verificationStatus,
      isVerified: rec.verificationStatus === 'VERIFIED',
      emergencyAvailable: rec.emergencyAvailable,
      about: null,
      operatingHours: null,
      doctorCount,
      cancellationPolicyHours: null,
    };
  }

  private static resolveHospitalEntity(hospitalIdOrCode: string): PatientHospitalSummaryDto {
    if (!validateDiscoveryIdentifier(hospitalIdOrCode)) {
      throw ApiError.badRequest('Invalid hospital identifier format', 'INVALID_HOSPITAL_ID');
    }
    const q = hospitalIdOrCode.trim().toLowerCase();
    const found = this.buildMergedHospitals().find(
      (h) => h.id.toLowerCase() === q || (h.directoryCode && h.directoryCode.toLowerCase() === q)
    );
    if (!found) {
      throw ApiError.notFound('Hospital not found', 'HOSPITAL_NOT_FOUND');
    }
    return found;
  }

  private static toDoctorDto(doc: DoctorRecord): PatientDoctorSummaryDto {
    const hospital =
      this.buildMergedHospitals().find((h) => h.id === doc.hospitalId || h.directoryCode === doc.hospitalId);
    const rules = (clinicalStore.doctorAvailabilities.get(doc.id) || []).filter((r) => r.isActive);

    return {
      id: doc.id,
      fullName: doc.fullName,
      specialization: doc.specialization,
      qualification: doc.qualification,
      experienceYears: doc.experienceYears,
      bio: doc.bio ?? null,
      profilePhotoUrl: doc.profilePhotoUrl ?? null,
      hospitalId: doc.hospitalId,
      hospitalName: hospital?.name ?? 'Affiliated Hospital',
      hospitalCity: hospital?.city ?? '',
      departmentId: doc.departmentId,
      departmentName: doc.departmentName,
      consultationFee: doc.consultationFee ?? null,
      slotDurationMinutes: doc.slotDurationMinutes,
      verificationStatus: doc.verificationStatus,
      isAvailable: rules.length > 0,
      scheduleSummary: rules.map((r) => ({
        dayOfWeek: r.dayOfWeek,
        dayName: DAY_NAMES[r.dayOfWeek] || 'Day',
        startTime: r.startTime,
        endTime: r.endTime,
        timezone: r.timezone,
      })),
    };
  }

  static listHospitals(params: {
    search?: string;
    city?: string;
    location?: string;
    specialty?: string;
    hospitalType?: string;
    ownership?: string;
    verifiedOnly?: boolean;
    page: number;
    limit: number;
  }) {
    let items = this.buildMergedHospitals();

    if (params.search) {
      const q = params.search.toLowerCase();
      items = items.filter(
        (h) =>
          h.name.toLowerCase().includes(q) ||
          h.city.toLowerCase().includes(q) ||
          h.address.toLowerCase().includes(q) ||
          (h.pincode && h.pincode.includes(q)) ||
          (h.directoryCode && h.directoryCode.toLowerCase().includes(q)) ||
          h.specialties.some((s) => s.toLowerCase().includes(q))
      );
    }

    if (params.city && params.city.toLowerCase() !== 'all') {
      const c = params.city.toLowerCase();
      items = items.filter((h) => h.city.toLowerCase().includes(c));
    }

    if (params.location) {
      const loc = params.location.toLowerCase();
      items = items.filter(
        (h) =>
          h.address.toLowerCase().includes(loc) ||
          h.city.toLowerCase().includes(loc) ||
          (h.pincode && h.pincode.includes(loc))
      );
    }

    if (params.specialty && params.specialty.toLowerCase() !== 'all') {
      const sp = params.specialty.toLowerCase();
      items = items.filter(
        (h) =>
          h.specialties.some((s) => s.toLowerCase().includes(sp)) ||
          h.departments.some((d) => d.toLowerCase().includes(sp))
      );
    }

    if (params.hospitalType && params.hospitalType.toLowerCase() !== 'all') {
      const ht = params.hospitalType.toLowerCase();
      items = items.filter((h) => h.hospitalType.toLowerCase().includes(ht));
    }

    if (params.ownership && params.ownership.toLowerCase() !== 'all') {
      const own = params.ownership.toLowerCase();
      items = items.filter((h) => (h.ownershipType || '').toLowerCase().includes(own));
    }

    if (params.verifiedOnly) {
      items = items.filter((h) => h.isVerified);
    }

    items.sort((a, b) => {
      if (a.isVerified !== b.isVerified) return a.isVerified ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    const total = items.length;
    const totalPages = Math.max(1, Math.ceil(total / params.limit));
    const paged = items.slice((params.page - 1) * params.limit, params.page * params.limit);

    return {
      items: paged,
      meta: { page: params.page, limit: params.limit, total, totalPages },
    };
  }

  static getHospitalDetails(hospitalIdOrCode: string) {
    const hospital = this.resolveHospitalEntity(hospitalIdOrCode);
    const doctors = Array.from(clinicalStore.doctors.values())
      .filter(
        (d) =>
          d.verificationStatus !== 'REJECTED' &&
          (d.hospitalId === hospital.id || (hospital.directoryCode && d.hospitalId === hospital.directoryCode))
      )
      .map((d) => this.toDoctorDto(d));

    return {
      hospital,
      availableDoctors: doctors,
    };
  }

  static listHospitalDoctors(
    hospitalIdOrCode: string,
    params: { search?: string; specialty?: string; availableOnly?: boolean; page: number; limit: number }
  ) {
    const hospital = this.resolveHospitalEntity(hospitalIdOrCode);
    return this.listDoctors({
      ...params,
      hospitalId: hospital.id,
      alternateHospitalCode: hospital.directoryCode ?? undefined,
    });
  }

  static listDoctors(params: {
    search?: string;
    specialty?: string;
    hospitalId?: string;
    alternateHospitalCode?: string;
    availableOnly?: boolean;
    page: number;
    limit: number;
  }) {
    let doctors = Array.from(clinicalStore.doctors.values())
      .filter((d) => d.verificationStatus !== 'REJECTED')
      .map((d) => this.toDoctorDto(d));

    if (params.hospitalId && params.hospitalId.toLowerCase() !== 'all') {
      if (!validateDiscoveryIdentifier(params.hospitalId)) {
        throw ApiError.badRequest('Invalid hospitalId parameter', 'INVALID_HOSPITAL_ID');
      }
      const targetHospital = this.buildMergedHospitals().find(
        (h) =>
          h.id.toLowerCase() === params.hospitalId!.toLowerCase() ||
          h.directoryCode?.toLowerCase() === params.hospitalId!.toLowerCase()
      );
      const acceptedIds = new Set(
        [params.hospitalId, params.alternateHospitalCode, targetHospital?.id, targetHospital?.directoryCode]
          .filter(Boolean)
          .map((s) => s!.toLowerCase())
      );
      doctors = doctors.filter((d) => acceptedIds.has(d.hospitalId.toLowerCase()));
    }

    if (params.search) {
      const q = params.search.toLowerCase();
      doctors = doctors.filter(
        (d) =>
          d.fullName.toLowerCase().includes(q) ||
          d.specialization.toLowerCase().includes(q) ||
          d.qualification.toLowerCase().includes(q) ||
          d.hospitalName.toLowerCase().includes(q)
      );
    }

    if (params.specialty && params.specialty.toLowerCase() !== 'all') {
      const sp = params.specialty.toLowerCase();
      doctors = doctors.filter(
        (d) => d.specialization.toLowerCase().includes(sp) || d.departmentName.toLowerCase().includes(sp)
      );
    }

    if (params.availableOnly) {
      doctors = doctors.filter((d) => d.isAvailable);
    }

    doctors.sort((a, b) => a.fullName.localeCompare(b.fullName));

    const total = doctors.length;
    const totalPages = Math.max(1, Math.ceil(total / params.limit));
    const paged = doctors.slice((params.page - 1) * params.limit, params.page * params.limit);

    return {
      items: paged,
      meta: { page: params.page, limit: params.limit, total, totalPages },
    };
  }

  static getDoctorDetails(doctorId: string) {
    if (!validateDiscoveryIdentifier(doctorId)) {
      throw ApiError.badRequest('Invalid doctor identifier format', 'INVALID_DOCTOR_ID');
    }
    const doc = clinicalStore.doctors.get(doctorId);
    if (!doc || doc.verificationStatus === 'REJECTED') {
      throw ApiError.notFound('Doctor not found', 'DOCTOR_NOT_FOUND');
    }
    return this.toDoctorDto(doc);
  }

  static getSpecialtiesAndFilters() {
    const hospitals = this.buildMergedHospitals();
    const doctors = Array.from(clinicalStore.doctors.values()).filter((d) => d.verificationStatus !== 'REJECTED');

    const specialties = new Set<string>();
    const hospitalTypes = new Set<string>();
    const cities = new Set<string>();

    for (const h of hospitals) {
      h.specialties.forEach((s) => specialties.add(s));
      if (h.hospitalType) hospitalTypes.add(h.hospitalType);
      if (h.city) cities.add(h.city);
    }
    for (const d of doctors) {
      if (d.specialization) specialties.add(d.specialization);
    }

    return {
      specialties: Array.from(specialties).sort(),
      hospitalTypes: Array.from(hospitalTypes).sort(),
      cities: Array.from(cities).sort(),
    };
  }
}
