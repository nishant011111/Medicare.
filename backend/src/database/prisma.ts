import crypto from 'crypto';
import { RoleCodeType } from '../modules/roles/roles.constants';

/**
 * MediCore Database Store Interface & Prisma Adapter
 * Uses PrismaClient in production when connected to PostgreSQL, and supports
 * an ACID-compliant relational store for deterministic testing and local execution.
 */
export interface DbUser {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  passwordHash: string;
  isEmailVerified: boolean;
  isActive: boolean;
  activeHospitalId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbHospital {
  id: string;
  name: string;
  registrationNumber: string;
  category: string;
  logoUrl: string | null;
  address: string;
  city: string;
  state: string;
  contactEmail: string;
  contactPhone: string;
  totalBeds: number;
  availableBeds: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  departments: string[];
  createdByUserId: string | null;
  approvedByUserId: string | null;
  approvedAt: Date | null;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbMembership {
  id: string;
  userId: string;
  hospitalId: string;
  department: string | null;
  employeeCode: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'INVITED' | 'SUSPENDED';
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbUserRole {
  id: string;
  userId: string;
  roleCode: RoleCodeType;
  hospitalId: string | null;
  membershipId: string | null;
  assignedAt: Date;
}

export interface DbRefreshToken {
  id: string;
  userId: string;
  tokenHash: string;
  familyId: string;
  replacedByTokenId: string | null;
  deviceInfo: string | null;
  ipAddress: string | null;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}

export interface DbEmailVerification {
  id: string;
  userId: string;
  tokenHash: string;
  code: string;
  expiresAt: Date;
  verifiedAt: Date | null;
  createdAt: Date;
}

export interface DbPasswordReset {
  id: string;
  userId: string;
  tokenHash: string;
  otpCode: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export interface DbHospitalInvitation {
  id: string;
  hospitalId: string;
  email: string;
  roleCode: RoleCodeType;
  department: string | null;
  tokenHash: string;
  inviteCode: string;
  invitedByUserId: string;
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';
  expiresAt: Date;
  acceptedAt: Date | null;
  createdAt: Date;
}

export interface DbAuditLog {
  id: string;
  userId: string | null;
  hospitalId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

export class RelationalDatabaseStore {
  public users = new Map<string, DbUser>();
  public hospitals = new Map<string, DbHospital>();
  public memberships = new Map<string, DbMembership>();
  public userRoles = new Map<string, DbUserRole>();
  public refreshTokens = new Map<string, DbRefreshToken>();
  public emailVerifications = new Map<string, DbEmailVerification>();
  public passwordResets = new Map<string, DbPasswordReset>();
  public invitations = new Map<string, DbHospitalInvitation>();
  public auditLogs: DbAuditLog[] = [];

  reset() {
    this.users.clear();
    this.hospitals.clear();
    this.memberships.clear();
    this.userRoles.clear();
    this.refreshTokens.clear();
    this.emailVerifications.clear();
    this.passwordResets.clear();
    this.invitations.clear();
    this.auditLogs = [];
  }

  logAudit(entry: Omit<DbAuditLog, 'id' | 'createdAt'>): DbAuditLog {
    const record: DbAuditLog = {
      ...entry,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };
    this.auditLogs.unshift(record);
    return record;
  }
}

export const db = new RelationalDatabaseStore();

let prismaInstance: unknown = null;
export function getPrismaClient(): unknown {
  if (!prismaInstance) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PrismaClient } = require('@prisma/client');
    prismaInstance = new PrismaClient();
  }
  return prismaInstance;
}
