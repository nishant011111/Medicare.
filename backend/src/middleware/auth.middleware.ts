import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/crypto';
import { ApiError } from '../utils/errors';
import { db } from '../database/prisma';
import { PermissionCode, RoleCodeType, RolesService } from '../modules/roles/roles.service';

export interface AuthenticatedContext {
  userId: string;
  email: string;
  activeHospitalId: string | null;
  globalRoles: RoleCodeType[];
  hospitalRoles: RoleCodeType[];
  permissions: PermissionCode[];
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthenticatedContext;
    }
  }
}

/**
 * Authenticates the request using the Bearer JWT Access Token and resolves
 * the user's actual roles and memberships from the backend database.
 * NEVER trusts role names or hospital IDs from the client without database verification.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized('Missing or malformed Authorization header');
    }

    const token = authHeader.slice(7).trim();
    const payload = verifyAccessToken(token);

    const user = db.users.get(payload.sub);
    if (!user || !user.isActive) {
      throw ApiError.unauthorized('User account is inactive or no longer exists');
    }

    // Resolve global roles (where hospitalId is null, e.g., SUPER_ADMIN)
    const allUserRoles = Array.from(db.userRoles.values()).filter((ur) => ur.userId === user.id);
    const globalRoles = allUserRoles
      .filter((ur) => ur.hospitalId === null)
      .map((ur) => ur.roleCode);

    // Resolve active hospitalroles only if user has an ACTIVE membership in that hospital
    const activeHospitalId = user.activeHospitalId;
    let hospitalRoles: RoleCodeType[] = [];

    if (activeHospitalId) {
      const membership = Array.from(db.memberships.values()).find(
        (m) => m.userId === user.id && m.hospitalId === activeHospitalId && m.status === 'ACTIVE'
      );
      if (membership) {
        hospitalRoles = allUserRoles
          .filter((ur) => ur.hospitalId === activeHospitalId)
          .map((ur) => ur.roleCode);
      }
    }

    const combinedRoles = Array.from(new Set([...globalRoles, ...hospitalRoles]));
    const permissions = RolesService.getPermissionsForRoles(combinedRoles);

    req.auth = {
      userId: user.id,
      email: user.email,
      activeHospitalId,
      globalRoles,
      hospitalRoles,
      permissions,
    };

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Requires specific roles verified from the backend database.
 */
export function requireRoles(...allowedRoles: RoleCodeType[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) {
      return next(ApiError.unauthorized());
    }

    if (req.auth.globalRoles.includes('SUPER_ADMIN') && allowedRoles.includes('SUPER_ADMIN')) {
      return next();
    }

    const userEffectiveRoles = [...req.auth.globalRoles, ...req.auth.hospitalRoles];
    const hasRole = allowedRoles.some((r) => userEffectiveRoles.includes(r));
    if (!hasRole) {
      return next(
        ApiError.forbidden(`Access denied. Required role: ${allowedRoles.join(' or ')}`, 'INSUFFICIENT_ROLE')
      );
    }

    next();
  };
}

/**
 * Enforces hospital-level tenant isolation and verifies the user belongs to
 * the target hospital with the required permission or role.
 * Protects against IDOR and cross-hospital privilege escalation.
 */
export function requireHospitalAccess(allowedRoles?: RoleCodeType[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) {
      return next(ApiError.unauthorized());
    }

    const targetHospitalId = req.params.id || req.params.hospitalId || req.auth.activeHospitalId;
    if (!targetHospitalId) {
      return next(ApiError.badRequest('Hospital context is required'));
    }

    // Super Admin can access if explicitly allowed
    if (req.auth.globalRoles.includes('SUPER_ADMIN')) {
      if (!allowedRoles || allowedRoles.includes('SUPER_ADMIN')) {
        return next();
      }
    }

    // Verify ACTIVE membership in targetHospitalId
    const membership = Array.from(db.memberships.values()).find(
      (m) => m.userId === req.auth!.userId && m.hospitalId === targetHospitalId && m.status === 'ACTIVE'
    );

    if (!membership) {
      return next(
        ApiError.forbidden('Cross-hospital access denied: You are not an active member of this hospital', 'TENANT_ISOLATION_VIOLATION')
      );
    }

    const rolesInHospital = Array.from(db.userRoles.values())
      .filter((ur) => ur.userId === req.auth!.userId && ur.hospitalId === targetHospitalId)
      .map((ur) => ur.roleCode);

    if (allowedRoles && allowedRoles.length > 0) {
      const authorized = allowedRoles.some((r) => rolesInHospital.includes(r));
      if (!authorized) {
        return next(
          ApiError.forbidden(
            `Insufficient hospital role. Required: ${allowedRoles.join(', ')}`,
            'HOSPITAL_ROLE_FORBIDDEN'
          )
        );
      }
    }

    next();
  };
}
