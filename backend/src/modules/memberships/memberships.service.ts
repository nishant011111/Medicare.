import crypto from 'crypto';
import { db } from '../../database/prisma';
import { generateRandomCode, sha256Hash } from '../../utils/crypto';
import { ApiError } from '../../utils/errors';
import { RoleCodeType } from '../roles/roles.constants';

export class MembershipsService {
  static listMemberships(
    actorUserId: string,
    isSuperAdmin: boolean,
    hospitalIdFilter?: string
  ) {
    if (hospitalIdFilter) {
      // Verify the actor is either SUPER_ADMIN or an active HOSPITAL_ADMIN of hospitalIdFilter
      if (!isSuperAdmin) {
        const actorMembership = Array.from(db.memberships.values()).find(
          (m) => m.userId === actorUserId && m.hospitalId === hospitalIdFilter && m.status === 'ACTIVE'
        );
        const actorRoles = Array.from(db.userRoles.values())
          .filter((ur) => ur.userId === actorUserId && ur.hospitalId === hospitalIdFilter)
          .map((ur) => ur.roleCode);

        if (!actorMembership || !actorRoles.includes('HOSPITAL_ADMIN')) {
          throw ApiError.forbidden(
            'Cross-hospital isolation: Only Hospital Administrators of this hospital can view its staff directory',
            'TENANT_ISOLATION_VIOLATION'
          );
        }
      }

      const hospitalMemberships = Array.from(db.memberships.values()).filter(
        (m) => m.hospitalId === hospitalIdFilter
      );
      return hospitalMemberships.map((m) => this.enrichMembership(m.id));
    }

    // Default: return the authenticated user's own memberships across hospitals
    const ownMemberships = Array.from(db.memberships.values()).filter((m) => m.userId === actorUserId);
    return ownMemberships.map((m) => this.enrichMembership(m.id));
  }

  static createInvitation(
    hospitalId: string,
    invitedByUserId: string,
    input: {
      email: string;
      roleCode: RoleCodeType;
      department?: string;
    }
  ) {
    if (input.roleCode === 'SUPER_ADMIN') {
      throw ApiError.forbidden('Cannot invite a Super Administrator via hospital invitation');
    }

    const hospital = db.hospitals.get(hospitalId);
    if (!hospital) {
      throw ApiError.notFound('Hospital not found');
    }

    const inviteCode = `INV-${generateRandomCode(6)}`;
    const id = crypto.randomUUID();
    const invitation = {
      id,
      hospitalId,
      email: input.email.toLowerCase().trim(),
      roleCode: input.roleCode,
      department: input.department ?? 'General',
      tokenHash: sha256Hash(inviteCode),
      inviteCode,
      invitedByUserId,
      status: 'PENDING' as const,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      acceptedAt: null,
      createdAt: new Date(),
    };

    db.invitations.set(id, invitation);

    db.logAudit({
      userId: invitedByUserId,
      hospitalId,
      action: 'HOSPITAL_INVITATION_CREATED',
      entityType: 'INVITATION',
      entityId: id,
      ipAddress: null,
      userAgent: null,
      metadata: { email: invitation.email, roleCode: invitation.roleCode },
    });

    return invitation;
  }

  static acceptInvitation(userId: string, inviteCode: string) {
    const user = db.users.get(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    const invitation = Array.from(db.invitations.values()).find(
      (inv) => inv.inviteCode.toUpperCase() === inviteCode.trim().toUpperCase()
    );

    if (!invitation) {
      throw ApiError.notFound('Invalid invitation code');
    }

    if (invitation.status !== 'PENDING') {
      throw ApiError.badRequest(`Invitation is already ${invitation.status}`);
    }

    if (invitation.expiresAt.getTime() < Date.now()) {
      invitation.status = 'EXPIRED';
      throw ApiError.badRequest('Invitation has expired');
    }

    if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
      throw ApiError.forbidden('This invitation was issued for a different email address');
    }

    const now = new Date();
    invitation.status = 'ACCEPTED';
    invitation.acceptedAt = now;

    // Find or create membership
    let membership = Array.from(db.memberships.values()).find(
      (m) => m.userId === userId && m.hospitalId === invitation.hospitalId
    );

    if (!membership) {
      const membershipId = crypto.randomUUID();
      membership = {
        id: membershipId,
        userId,
        hospitalId: invitation.hospitalId,
        department: invitation.department,
        employeeCode: `EMP-${generateRandomCode(4)}`,
        status: 'ACTIVE',
        joinedAt: now,
        createdAt: now,
        updatedAt: now,
      };
      db.memberships.set(membershipId, membership);
    } else {
      membership.status = 'ACTIVE';
      membership.department = invitation.department ?? membership.department;
      membership.updatedAt = now;
    }

    // Assign role if not already assigned
    const existingRole = Array.from(db.userRoles.values()).find(
      (ur) =>
        ur.userId === userId &&
        ur.hospitalId === invitation.hospitalId &&
        ur.roleCode === invitation.roleCode
    );

    if (!existingRole) {
      const userRoleId = crypto.randomUUID();
      db.userRoles.set(userRoleId, {
        id: userRoleId,
        userId,
        roleCode: invitation.roleCode,
        hospitalId: invitation.hospitalId,
        membershipId: membership.id,
        assignedAt: now,
      });
    }

    user.activeHospitalId = invitation.hospitalId;
    user.updatedAt = now;

    db.logAudit({
      userId,
      hospitalId: invitation.hospitalId,
      action: 'HOSPITAL_INVITATION_ACCEPTED',
      entityType: 'MEMBERSHIP',
      entityId: membership.id,
      ipAddress: null,
      userAgent: null,
      metadata: { roleCode: invitation.roleCode },
    });

    return this.enrichMembership(membership.id);
  }

  static updateMembership(
    membershipId: string,
    actorUserId: string,
    isSuperAdmin: boolean,
    updates: {
      status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
      department?: string;
      roles?: RoleCodeType[];
    }
  ) {
    const membership = db.memberships.get(membershipId);
    if (!membership) {
      throw ApiError.notFound('Membership not found');
    }

    // Enforce tenant isolation: actor must be SUPER_ADMIN or active HOSPITAL_ADMIN of membership.hospitalId
    if (!isSuperAdmin) {
      const actorMembership = Array.from(db.memberships.values()).find(
        (m) => m.userId === actorUserId && m.hospitalId === membership.hospitalId && m.status === 'ACTIVE'
      );
      const actorRoles = Array.from(db.userRoles.values())
        .filter((ur) => ur.userId === actorUserId && ur.hospitalId === membership.hospitalId)
        .map((ur) => ur.roleCode);

      if (!actorMembership || !actorRoles.includes('HOSPITAL_ADMIN')) {
        throw ApiError.forbidden(
          'Cross-hospital isolation: You can only manage memberships within your own hospital',
          'TENANT_ISOLATION_VIOLATION'
        );
      }
    }

    if (updates.status) {
      membership.status = updates.status;
    }
    if (updates.department !== undefined) {
      membership.department = updates.department;
    }
    membership.updatedAt = new Date();

    if (updates.roles && updates.roles.length > 0) {
      if (updates.roles.includes('SUPER_ADMIN') && !isSuperAdmin) {
        throw ApiError.forbidden('Only a Super Admin can assign SUPER_ADMIN role');
      }

      // Remove existing roles for this hospital membership
      for (const [key, ur] of db.userRoles.entries()) {
        if (ur.userId === membership.userId && ur.hospitalId === membership.hospitalId) {
          db.userRoles.delete(key);
        }
      }

      // Add updated roles
      for (const roleCode of updates.roles) {
        const newId = crypto.randomUUID();
        db.userRoles.set(newId, {
          id: newId,
          userId: membership.userId,
          roleCode,
          hospitalId: membership.hospitalId,
          membershipId: membership.id,
          assignedAt: new Date(),
        });
      }
    }

    db.logAudit({
      userId: actorUserId,
      hospitalId: membership.hospitalId,
      action: 'HOSPITAL_MEMBERSHIP_UPDATED',
      entityType: 'MEMBERSHIP',
      entityId: membership.id,
      ipAddress: null,
      userAgent: null,
      metadata: updates,
    });

    return this.enrichMembership(membership.id);
  }

  static enrichMembership(membershipId: string) {
    const m = db.memberships.get(membershipId);
    if (!m) throw ApiError.notFound('Membership not found');

    const user = db.users.get(m.userId);
    const hospital = db.hospitals.get(m.hospitalId);
    const roles = Array.from(db.userRoles.values())
      .filter((ur) => ur.userId === m.userId && ur.hospitalId === m.hospitalId)
      .map((ur) => ur.roleCode);

    return {
      id: m.id,
      userId: m.userId,
      userFullName: user?.fullName ?? 'Unknown',
      userEmail: user?.email ?? '',
      userPhone: user?.phone ?? null,
      hospitalId: m.hospitalId,
      hospitalName: hospital?.name ?? 'Unknown Hospital',
      hospitalCity: hospital?.city ?? '',
      hospitalCategory: hospital?.category ?? '',
      hospitalStatus: hospital?.status ?? 'PENDING',
      department: m.department,
      employeeCode: m.employeeCode,
      status: m.status,
      roles,
      joinedAt: m.joinedAt.toISOString(),
    };
  }
}
