import { PERMISSIONS, PermissionCode, ROLE_PERMISSION_MAP, ROLES, RoleCodeType } from './roles.constants';

export class RolesService {
  static getAllRoles() {
    return Object.values(ROLES);
  }

  static getPermissionsForRoles(roles: RoleCodeType[]): PermissionCode[] {
    const permSet = new Set<PermissionCode>();
    for (const role of roles) {
      const perms = ROLE_PERMISSION_MAP[role] || [];
      for (const p of perms) {
        permSet.add(p);
      }
    }
    return Array.from(permSet);
  }

  static hasPermission(roles: RoleCodeType[], requiredPermission: PermissionCode): boolean {
    if (roles.includes('SUPER_ADMIN')) return true;
    const perms = this.getPermissionsForRoles(roles);
    return perms.includes(requiredPermission);
  }
}

export { ROLES, PERMISSIONS, ROLE_PERMISSION_MAP, RoleCodeType, PermissionCode };
