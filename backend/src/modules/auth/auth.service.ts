import crypto from 'crypto';
import { db, DbUser } from '../../database/prisma';
import {
  generateRandomCode,
  hashPassword,
  sha256Hash,
  signAccessToken,
  signRefreshToken,
  verifyPassword,
  verifyRefreshToken,
} from '../../utils/crypto';
import { ApiError } from '../../utils/errors';
import { env } from '../../config/env';
import { RoleCodeType, RolesService } from '../roles/roles.service';

export class AuthService {
  static async register(input: {
    fullName: string;
    email: string;
    phone?: string;
    password: string;
    hospitalId?: string;
    ipAddress?: string;
  }) {
    const emailLower = input.email.toLowerCase().trim();
    const existingByEmail = Array.from(db.users.values()).find((u) => u.email === emailLower);
    if (existingByEmail) {
      throw ApiError.conflict('An account with this email already exists');
    }

    if (input.phone) {
      const existingByPhone = Array.from(db.users.values()).find((u) => u.phone === input.phone);
      if (existingByPhone) {
        throw ApiError.conflict('An account with this phone number already exists');
      }
    }

    const passwordHash = await hashPassword(input.password);
    const now = new Date();

    // Determine initial hospital (if specified and approved, or first approved hospital)
    let activeHospitalId: string | null = null;
    if (input.hospitalId && db.hospitals.get(input.hospitalId)?.status === 'APPROVED') {
      activeHospitalId = input.hospitalId;
    } else {
      const firstApproved = Array.from(db.hospitals.values()).find((h) => h.status === 'APPROVED');
      activeHospitalId = firstApproved?.id ?? null;
    }

    const user: DbUser = {
      id: crypto.randomUUID(),
      fullName: input.fullName.trim(),
      email: emailLower,
      phone: input.phone?.trim() ?? null,
      passwordHash,
      isEmailVerified: false,
      isActive: true,
      activeHospitalId,
      createdAt: now,
      updatedAt: now,
    };

    db.users.set(user.id, user);

    // If an approved hospital exists, create initial PATIENT membership for the user
    if (activeHospitalId) {
      const membershipId = crypto.randomUUID();
      db.memberships.set(membershipId, {
        id: membershipId,
        userId: user.id,
        hospitalId: activeHospitalId,
        department: 'Outpatient',
        employeeCode: null,
        status: 'ACTIVE',
        joinedAt: now,
        createdAt: now,
        updatedAt: now,
      });

      const userRoleId = crypto.randomUUID();
      db.userRoles.set(userRoleId, {
        id: userRoleId,
        userId: user.id,
        roleCode: 'PATIENT',
        hospitalId: activeHospitalId,
        membershipId,
        assignedAt: now,
      });
    }

    // Create email verification code
    const verificationCode = generateRandomCode(6);
    const verificationId = crypto.randomUUID();
    db.emailVerifications.set(verificationId, {
      id: verificationId,
      userId: user.id,
      tokenHash: sha256Hash(`${user.id}:${verificationCode}`),
      code: verificationCode,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      verifiedAt: null,
      createdAt: now,
    });

    const tokens = this.issueTokens(user, undefined, input.ipAddress);

    db.logAudit({
      userId: user.id,
      hospitalId: activeHospitalId,
      action: 'AUTH_REGISTER',
      entityType: 'USER',
      entityId: user.id,
      ipAddress: input.ipAddress ?? null,
      userAgent: null,
      metadata: { email: user.email },
    });

    return {
      user: this.buildMeProfile(user.id),
      ...tokens,
      verificationCodePreview: verificationCode,
    };
  }

  static async login(input: {
    emailOrPhone: string;
    password: string;
    deviceInfo?: string;
    ipAddress?: string;
  }) {
    const identifier = input.emailOrPhone.toLowerCase().trim();
    const user = Array.from(db.users.values()).find(
      (u) => u.email.toLowerCase() === identifier || (u.phone && u.phone === input.emailOrPhone.trim())
    );

    if (!user) {
      throw ApiError.unauthorized('Invalid email/phone or password', 'INVALID_CREDENTIALS');
    }

    if (!user.isActive) {
      throw ApiError.forbidden('Account has been deactivated', 'ACCOUNT_INACTIVE');
    }

    const passwordValid = await verifyPassword(user.passwordHash, input.password);
    if (!passwordValid) {
      db.logAudit({
        userId: user.id,
        hospitalId: user.activeHospitalId,
        action: 'AUTH_LOGIN_FAILED',
        entityType: 'USER',
        entityId: user.id,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.deviceInfo ?? null,
        metadata: { reason: 'INVALID_PASSWORD' },
      });
      throw ApiError.unauthorized('Invalid email/phone or password', 'INVALID_CREDENTIALS');
    }

    const tokens = this.issueTokens(user, input.deviceInfo, input.ipAddress);

    db.logAudit({
      userId: user.id,
      hospitalId: user.activeHospitalId,
      action: 'AUTH_LOGIN_SUCCESS',
      entityType: 'USER',
      entityId: user.id,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.deviceInfo ?? null,
      metadata: null,
    });

    return {
      user: this.buildMeProfile(user.id),
      ...tokens,
    };
  }

  static async refresh(rawRefreshToken: string, ipAddress?: string) {
    const payload = verifyRefreshToken(rawRefreshToken);
    const tokenHash = sha256Hash(rawRefreshToken);

    const storedToken = db.refreshTokens.get(payload.jti);
    if (!storedToken || storedToken.tokenHash !== tokenHash) {
      throw ApiError.unauthorized('Refresh token not recognized', 'INVALID_REFRESH_TOKEN');
    }

    // Reuse detection: if token was already revoked/rotated, revoke the entire token family!
    if (storedToken.revokedAt !== null) {
      for (const rt of db.refreshTokens.values()) {
        if (rt.familyId === storedToken.familyId && rt.revokedAt === null) {
          rt.revokedAt = new Date();
        }
      }
      db.logAudit({
        userId: storedToken.userId,
        hospitalId: null,
        action: 'AUTH_REFRESH_REUSE_DETECTED',
        entityType: 'REFRESH_TOKEN',
        entityId: storedToken.id,
        ipAddress: ipAddress ?? null,
        userAgent: null,
        metadata: { familyId: storedToken.familyId },
      });
      throw ApiError.unauthorized('Refresh token has already been used or revoked', 'TOKEN_REUSE_DETECTED');
    }

    if (storedToken.expiresAt.getTime() < Date.now()) {
      storedToken.revokedAt = new Date();
      throw ApiError.unauthorized('Refresh token has expired', 'REFRESH_TOKEN_EXPIRED');
    }

    const user = db.users.get(storedToken.userId);
    if (!user || !user.isActive) {
      throw ApiError.unauthorized('User is inactive or does not exist');
    }

    // Rotate token
    storedToken.revokedAt = new Date();
    const rotated = this.issueTokens(user, storedToken.deviceInfo ?? undefined, ipAddress, storedToken.familyId);
    storedToken.replacedByTokenId = rotated.refreshTokenId;

    return {
      accessToken: rotated.accessToken,
      refreshToken: rotated.refreshToken,
      expiresIn: rotated.expiresIn,
      user: this.buildMeProfile(user.id),
    };
  }

  static async logout(userId: string, rawRefreshToken?: string) {
    if (rawRefreshToken) {
      const tokenHash = sha256Hash(rawRefreshToken);
      for (const rt of db.refreshTokens.values()) {
        if (rt.tokenHash === tokenHash && rt.userId === userId) {
          rt.revokedAt = new Date();
        }
      }
    } else {
      for (const rt of db.refreshTokens.values()) {
        if (rt.userId === userId && rt.revokedAt === null) {
          rt.revokedAt = new Date();
        }
      }
    }

    db.logAudit({
      userId,
      hospitalId: null,
      action: 'AUTH_LOGOUT',
      entityType: 'USER',
      entityId: userId,
      ipAddress: null,
      userAgent: null,
      metadata: null,
    });

    return { loggedOut: true };
  }

  static async forgotPassword(emailOrPhone: string) {
    const identifier = emailOrPhone.toLowerCase().trim();
    const user = Array.from(db.users.values()).find(
      (u) => u.email.toLowerCase() === identifier || (u.phone && u.phone === emailOrPhone.trim())
    );

    if (!user) {
      // Return standard response without leaking user existence, but in dev/test return OTP preview if user exists
      return {
        message: 'If that account is registered, a 6-digit password reset code has been dispatched.',
        otpCodePreview: null,
      };
    }

    const otpCode = generateRandomCode(6);
    const resetId = crypto.randomUUID();
    db.passwordResets.set(resetId, {
      id: resetId,
      userId: user.id,
      tokenHash: sha256Hash(`${user.id}:${otpCode}`),
      otpCode,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      usedAt: null,
      createdAt: new Date(),
    });

    db.logAudit({
      userId: user.id,
      hospitalId: user.activeHospitalId,
      action: 'AUTH_FORGOT_PASSWORD_REQUESTED',
      entityType: 'USER',
      entityId: user.id,
      ipAddress: null,
      userAgent: null,
      metadata: null,
    });

    return {
      message: 'If that account is registered, a 6-digit password reset code has been dispatched.',
      otpCodePreview: otpCode,
    };
  }

  static async resetPassword(input: { emailOrPhone: string; otpCode: string; newPassword: string }) {
    const identifier = input.emailOrPhone.toLowerCase().trim();
    const user = Array.from(db.users.values()).find(
      (u) => u.email.toLowerCase() === identifier || (u.phone && u.phone === input.emailOrPhone.trim())
    );

    if (!user) {
      throw ApiError.badRequest('Invalid reset code or account identifier');
    }

    const resetRecord = Array.from(db.passwordResets.values()).find(
      (r) =>
        r.userId === user.id &&
        r.otpCode === input.otpCode &&
        r.usedAt === null &&
        r.expiresAt.getTime() > Date.now()
    );

    if (!resetRecord) {
      throw ApiError.badRequest('Invalid or expired OTP reset code');
    }

    resetRecord.usedAt = new Date();
    user.passwordHash = await hashPassword(input.newPassword);
    user.updatedAt = new Date();

    // Revoke all active refresh tokens upon password change
    for (const rt of db.refreshTokens.values()) {
      if (rt.userId === user.id && rt.revokedAt === null) {
        rt.revokedAt = new Date();
      }
    }

    db.logAudit({
      userId: user.id,
      hospitalId: user.activeHospitalId,
      action: 'AUTH_PASSWORD_RESET_COMPLETED',
      entityType: 'USER',
      entityId: user.id,
      ipAddress: null,
      userAgent: null,
      metadata: null,
    });

    return { reset: true };
  }

  static async verifyEmail(input: { email: string; code: string }) {
    const user = Array.from(db.users.values()).find((u) => u.email === input.email.toLowerCase().trim());
    if (!user) {
      throw ApiError.notFound('Account not found');
    }

    const verification = Array.from(db.emailVerifications.values()).find(
      (ev) =>
        ev.userId === user.id &&
        ev.code === input.code &&
        ev.verifiedAt === null &&
        ev.expiresAt.getTime() > Date.now()
    );

    if (!verification) {
      throw ApiError.badRequest('Invalid or expired verification code');
    }

    verification.verifiedAt = new Date();
    user.isEmailVerified = true;
    user.updatedAt = new Date();

    db.logAudit({
      userId: user.id,
      hospitalId: user.activeHospitalId,
      action: 'AUTH_EMAIL_VERIFIED',
      entityType: 'USER',
      entityId: user.id,
      ipAddress: null,
      userAgent: null,
      metadata: null,
    });

    return { verified: true, user: this.buildMeProfile(user.id) };
  }

  static issueTokens(user: DbUser, deviceInfo?: string, ipAddress?: string, existingFamilyId?: string) {
    const familyId = existingFamilyId ?? crypto.randomUUID();
    const tokenId = crypto.randomUUID();

    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      activeHospitalId: user.activeHospitalId,
    });

    const refreshToken = signRefreshToken({
      sub: user.id,
      jti: tokenId,
      familyId,
    });

    const expiresAt = new Date(Date.now() + env.JWT_REFRESH_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000);

    db.refreshTokens.set(tokenId, {
      id: tokenId,
      userId: user.id,
      tokenHash: sha256Hash(refreshToken),
      familyId,
      replacedByTokenId: null,
      deviceInfo: deviceInfo ?? null,
      ipAddress: ipAddress ?? null,
      expiresAt,
      revokedAt: null,
      createdAt: new Date(),
    });

    return {
      accessToken,
      refreshToken,
      refreshTokenId: tokenId,
      expiresIn: 900, // 15 minutes in seconds
    };
  }

  static buildMeProfile(userId: string) {
    const user = db.users.get(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    const userRoles = Array.from(db.userRoles.values()).filter((ur) => ur.userId === user.id);
    const globalRoles = userRoles.filter((ur) => ur.hospitalId === null).map((ur) => ur.roleCode);

    const memberships = Array.from(db.memberships.values())
      .filter((m) => m.userId === user.id)
      .map((m) => {
        const hospital = db.hospitals.get(m.hospitalId);
        const rolesForHospital = userRoles
          .filter((ur) => ur.hospitalId === m.hospitalId)
          .map((ur) => ur.roleCode);
        return {
          membershipId: m.id,
          hospitalId: m.hospitalId,
          hospitalName: hospital?.name ?? 'Unknown Hospital',
          hospitalCity: hospital?.city ?? '',
          hospitalCategory: hospital?.category ?? '',
          hospitalStatus: hospital?.status ?? 'PENDING',
          department: m.department,
          status: m.status,
          roles: rolesForHospital,
          joinedAt: m.joinedAt.toISOString(),
        };
      });

    const activeMembership = memberships.find(
      (m) => m.hospitalId === user.activeHospitalId && m.status === 'ACTIVE'
    );

    const activeRoles: RoleCodeType[] = Array.from(
      new Set([...globalRoles, ...(activeMembership?.roles ?? [])])
    );

    const permissions = RolesService.getPermissionsForRoles(activeRoles);

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      isEmailVerified: user.isEmailVerified,
      isActive: user.isActive,
      activeHospitalId: user.activeHospitalId,
      globalRoles,
      activeRoles,
      permissions,
      memberships,
    };
  }
}
