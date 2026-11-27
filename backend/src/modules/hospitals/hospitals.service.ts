import crypto from 'crypto';
import { db, DbHospital } from '../../database/prisma';
import { ApiError } from '../../utils/errors';
import { formatPaginatedResult, parsePagination } from '../../utils/pagination';
import { signAccessToken } from '../../utils/crypto';
import { AuthService } from '../auth/auth.service';

export class HospitalsService {
  static listHospitals(
    query: Record<string, unknown>,
    userId?: string,
    isSuperAdmin = false
  ) {
    const pagination = parsePagination(query);
    const search = typeof query.search === 'string' ? query.search.toLowerCase().trim() : '';
    const category = typeof query.category === 'string' ? query.category.toLowerCase().trim() : '';
    const statusFilter = typeof query.status === 'string' ? query.status.toUpperCase().trim() : '';

    let allHospitals = Array.from(db.hospitals.values());

    if (!isSuperAdmin) {
      const userMemberHospitalIds = new Set(
        userId
          ? Array.from(db.memberships.values())
              .filter((m) => m.userId === userId)
              .map((m) => m.hospitalId)
          : []
      );
      allHospitals = allHospitals.filter(
        (h) => h.status === 'APPROVED' || (userId && (h.createdByUserId === userId || userMemberHospitalIds.has(h.id)))
      );
    }

    if (statusFilter) {
      allHospitals = allHospitals.filter((h) => h.status === statusFilter);
    }

    if (search) {
      allHospitals = allHospitals.filter(
        (h) =>
          h.name.toLowerCase().includes(search) ||
          h.city.toLowerCase().includes(search) ||
          h.address.toLowerCase().includes(search) ||
          h.registrationNumber.toLowerCase().includes(search) ||
          h.category.toLowerCase().includes(search)
      );
    }

    if (category && category !== 'all') {
      allHospitals = allHospitals.filter((h) => h.category.toLowerCase().includes(category));
    }

    const total = allHospitals.length;
    const paged = allHospitals.slice(pagination.skip, pagination.skip + pagination.limit);

    return formatPaginatedResult(paged, total, pagination);
  }

  static registerHospital(
    userId: string,
    input: {
      name: string;
      registrationNumber: string;
      category: string;
      logoUrl?: string | null;
      address: string;
      city: string;
      state: string;
      contactEmail: string;
      contactPhone: string;
      totalBeds?: number;
      availableBeds?: number;
      departments?: string[];
    }
  ): DbHospital {
    const regNum = input.registrationNumber.trim().toUpperCase();
    const existing = Array.from(db.hospitals.values()).find(
      (h) => h.registrationNumber.toUpperCase() === regNum
    );
    if (existing) {
      throw ApiError.conflict(`A hospital with registration number ${regNum} already exists`);
    }

    const now = new Date();
    const hospital: DbHospital = {
      id: crypto.randomUUID(),
      name: input.name.trim(),
      registrationNumber: regNum,
      category: input.category.trim(),
      logoUrl: input.logoUrl ?? null,
      address: input.address.trim(),
      city: input.city.trim(),
      state: input.state.trim(),
      contactEmail: input.contactEmail.toLowerCase().trim(),
      contactPhone: input.contactPhone.trim(),
      totalBeds: input.totalBeds ?? 100,
      availableBeds: input.availableBeds ?? 25,
      status: 'PENDING',
      departments: input.departments ?? ['General Medicine', 'Cardiology', 'Emergency', 'Pediatrics'],
      createdByUserId: userId,
      approvedByUserId: null,
      approvedAt: null,
      rejectionReason: null,
      createdAt: now,
      updatedAt: now,
    };

    db.hospitals.set(hospital.id, hospital);

    // Automatically create ACTIVE HospitalMembership & HOSPITAL_ADMIN role for the creator
    const membershipId = crypto.randomUUID();
    db.memberships.set(membershipId, {
      id: membershipId,
      userId,
      hospitalId: hospital.id,
      department: 'Administration',
      employeeCode: 'ADM-001',
      status: 'ACTIVE',
      joinedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    const userRoleId = crypto.randomUUID();
    db.userRoles.set(userRoleId, {
      id: userRoleId,
      userId,
      roleCode: 'HOSPITAL_ADMIN',
      hospitalId: hospital.id,
      membershipId,
      assignedAt: now,
    });

    db.logAudit({
      userId,
      hospitalId: hospital.id,
      action: 'HOSPITAL_REGISTERED',
      entityType: 'HOSPITAL',
      entityId: hospital.id,
      ipAddress: null,
      userAgent: null,
      metadata: { registrationNumber: hospital.registrationNumber, status: hospital.status },
    });

    return hospital;
  }

  static getHospitalById(hospitalId: string) {
    const hospital = db.hospitals.get(hospitalId);
    if (!hospital) {
      throw ApiError.notFound('Hospital not found');
    }

    const activeMembersCount = Array.from(db.memberships.values()).filter(
      (m) => m.hospitalId === hospitalId && m.status === 'ACTIVE'
    ).length;

    const roleBreakdown: Record<string, number> = {};
    for (const ur of db.userRoles.values()) {
      if (ur.hospitalId === hospitalId) {
        roleBreakdown[ur.roleCode] = (roleBreakdown[ur.roleCode] || 0) + 1;
      }
    }

    return {
      ...hospital,
      statistics: {
        activeMembersCount,
        roleBreakdown,
      },
    };
  }

  static updateHospital(
    hospitalId: string,
    actorUserId: string,
    updates: Partial<{
      name: string;
      category: string;
      logoUrl: string | null;
      address: string;
      city: string;
      state: string;
      contactEmail: string;
      contactPhone: string;
      totalBeds: number;
      availableBeds: number;
      departments: string[];
    }>
  ): DbHospital {
    const hospital = db.hospitals.get(hospitalId);
    if (!hospital) {
      throw ApiError.notFound('Hospital not found');
    }

    if (updates.name !== undefined) hospital.name = updates.name.trim();
    if (updates.category !== undefined) hospital.category = updates.category.trim();
    if (updates.logoUrl !== undefined) hospital.logoUrl = updates.logoUrl;
    if (updates.address !== undefined) hospital.address = updates.address.trim();
    if (updates.city !== undefined) hospital.city = updates.city.trim();
    if (updates.state !== undefined) hospital.state = updates.state.trim();
    if (updates.contactEmail !== undefined) hospital.contactEmail = updates.contactEmail.toLowerCase().trim();
    if (updates.contactPhone !== undefined) hospital.contactPhone = updates.contactPhone.trim();
    if (updates.totalBeds !== undefined) hospital.totalBeds = updates.totalBeds;
    if (updates.availableBeds !== undefined) hospital.availableBeds = updates.availableBeds;
    if (updates.departments !== undefined) hospital.departments = updates.departments;
    hospital.updatedAt = new Date();

    db.logAudit({
      userId: actorUserId,
      hospitalId: hospital.id,
      action: 'HOSPITAL_PROFILE_UPDATED',
      entityType: 'HOSPITAL',
      entityId: hospital.id,
      ipAddress: null,
      userAgent: null,
      metadata: { updatedFields: Object.keys(updates) },
    });

    return hospital;
  }

  static selectHospital(userId: string, hospitalId: string, isSuperAdmin = false) {
    const hospital = db.hospitals.get(hospitalId);
    if (!hospital) {
      throw ApiError.notFound('Hospital not found');
    }

    if (hospital.status !== 'APPROVED' && !isSuperAdmin && hospital.createdByUserId !== userId) {
      throw ApiError.forbidden(`Hospital is currently ${hospital.status} and cannot be selected`);
    }

    const user = db.users.get(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    let membership = Array.from(db.memberships.values()).find(
      (m) => m.userId === userId && m.hospitalId === hospitalId
    );

    // If user is a verified patient selecting an approved hospital for the first time, enroll as PATIENT
    if (!membership && hospital.status === 'APPROVED') {
      const now = new Date();
      const membershipId = crypto.randomUUID();
      membership = {
        id: membershipId,
        userId,
        hospitalId,
        department: 'Outpatient',
        employeeCode: null,
        status: 'ACTIVE',
        joinedAt: now,
        createdAt: now,
        updatedAt: now,
      };
      db.memberships.set(membershipId, membership);

      const roleAssignId = crypto.randomUUID();
      db.userRoles.set(roleAssignId, {
        id: roleAssignId,
        userId,
        roleCode: 'PATIENT',
        hospitalId,
        membershipId,
        assignedAt: now,
      });
    }

    if (membership && membership.status !== 'ACTIVE' && !isSuperAdmin) {
      throw ApiError.forbidden('Your membership at this hospital is not active');
    }

    user.activeHospitalId = hospitalId;
    user.updatedAt = new Date();

    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      activeHospitalId: hospitalId,
    });

    db.logAudit({
      userId,
      hospitalId,
      action: 'HOSPITAL_SELECTED',
      entityType: 'HOSPITAL',
      entityId: hospitalId,
      ipAddress: null,
      userAgent: null,
      metadata: { hospitalName: hospital.name },
    });

    return {
      selectedHospital: hospital,
      accessToken,
      user: AuthService.buildMeProfile(userId),
    };
  }

  // Super Admin Actions
  static approveHospital(hospitalId: string, superAdminId: string): DbHospital {
    const hospital = db.hospitals.get(hospitalId);
    if (!hospital) {
      throw ApiError.notFound('Hospital not found');
    }

    hospital.status = 'APPROVED';
    hospital.approvedByUserId = superAdminId;
    hospital.approvedAt = new Date();
    hospital.rejectionReason = null;
    hospital.updatedAt = new Date();

    db.logAudit({
      userId: superAdminId,
      hospitalId: hospital.id,
      action: 'SUPER_ADMIN_HOSPITAL_APPROVED',
      entityType: 'HOSPITAL',
      entityId: hospital.id,
      ipAddress: null,
      userAgent: null,
      metadata: { hospitalName: hospital.name },
    });

    return hospital;
  }

  static rejectHospital(hospitalId: string, superAdminId: string, reason?: string): DbHospital {
    const hospital = db.hospitals.get(hospitalId);
    if (!hospital) {
      throw ApiError.notFound('Hospital not found');
    }

    hospital.status = 'REJECTED';
    hospital.rejectionReason = reason ?? 'Did not meet verification criteria';
    hospital.updatedAt = new Date();

    db.logAudit({
      userId: superAdminId,
      hospitalId: hospital.id,
      action: 'SUPER_ADMIN_HOSPITAL_REJECTED',
      entityType: 'HOSPITAL',
      entityId: hospital.id,
      ipAddress: null,
      userAgent: null,
      metadata: { reason: hospital.rejectionReason },
    });

    return hospital;
  }

  static suspendHospital(hospitalId: string, superAdminId: string, reason?: string): DbHospital {
    const hospital = db.hospitals.get(hospitalId);
    if (!hospital) {
      throw ApiError.notFound('Hospital not found');
    }

    hospital.status = 'SUSPENDED';
    hospital.rejectionReason = reason ?? 'Suspended by platform administrator';
    hospital.updatedAt = new Date();

    db.logAudit({
      userId: superAdminId,
      hospitalId: hospital.id,
      action: 'SUPER_ADMIN_HOSPITAL_SUSPENDED',
      entityType: 'HOSPITAL',
      entityId: hospital.id,
      ipAddress: null,
      userAgent: null,
      metadata: { reason: hospital.rejectionReason },
    });

    return hospital;
  }

  static getPlatformStatistics() {
    const hospitals = Array.from(db.hospitals.values());
    return {
      totalHospitals: hospitals.length,
      approvedHospitals: hospitals.filter((h) => h.status === 'APPROVED').length,
      pendingHospitals: hospitals.filter((h) => h.status === 'PENDING').length,
      rejectedHospitals: hospitals.filter((h) => h.status === 'REJECTED').length,
      suspendedHospitals: hospitals.filter((h) => h.status === 'SUSPENDED').length,
      totalUsers: db.users.size,
      totalMemberships: db.memberships.size,
      recentAuditLogs: db.auditLogs.slice(0, 50),
    };
  }
}
