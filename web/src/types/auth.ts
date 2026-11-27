/**
 * MediCore Authentication, Role & Permission Types
 * Aligned 1:1 with /backend/src/modules/roles/roles.constants.ts and /backend/src/modules/auth/auth.service.ts
 */

export type WebStaffRoleCode =
  | 'SUPER_ADMIN'
  | 'HOSPITAL_ADMIN'
  | 'DOCTOR'
  | 'NURSE'
  | 'RECEPTIONIST'
  | 'PHARMACIST'
  | 'LAB_TECHNICIAN';

export type RoleCodeType = WebStaffRoleCode | 'ACCOUNTANT' | 'PATIENT';

export interface UserHospitalMembership {
  membershipId: string;
  hospitalId: string;
  hospitalName: string;
  hospitalCity: string;
  hospitalCategory: string;
  hospitalStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'ACTIVE';
  department: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'INVITED' | 'SUSPENDED';
  roles: RoleCodeType[];
  joinedAt: string;
}

export interface AuthUserProfile {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  isEmailVerified: boolean;
  isPhoneVerified?: boolean;
  isActive: boolean;
  activeHospitalId: string | null;
  onboardingCompleted: boolean;
  profileCompletionPercent: number;
  mfaEnabled?: boolean;
  mfaEligible?: boolean;
  globalRoles: RoleCodeType[];
  activeRoles: RoleCodeType[];
  permissions: string[];
  memberships: UserHospitalMembership[];
}

export interface OtpRequestResponse {
  requested: boolean;
  purpose: 'LOGIN' | 'REGISTER';
  maskedPhone: string;
  otpSent: boolean;
  smsDeliveryConfigured: boolean;
  cooldownSeconds: number;
  expiresInSeconds: number;
  deliveryProvider: string;
  devOtpPreview?: string;
  message: string;
}

export interface AuthLoginSuccessResponse {
  mfaRequired?: false;
  user: AuthUserProfile;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthMfaChallengeResponse {
  mfaRequired: true;
  mfaChallengeToken: string;
  user: {
    id: string;
    fullName: string;
    email?: string | null;
    phone?: string | null;
    activeRoles: RoleCodeType[];
    mfaEnabled: boolean;
  };
}

export type AuthLoginResponse = AuthLoginSuccessResponse | AuthMfaChallengeResponse;

export interface MfaStatusResponse {
  userId: string;
  mfaEnabled: boolean;
  setupPending: boolean;
  method: 'TOTP';
  isPrivilegedRole: boolean;
  mfaRecommended: boolean;
  eligibleRoles: string[];
  userRoles: string[];
  backupCodesRemaining: number;
  enabledAt: string | null;
}

export interface MfaSetupResponse {
  userId: string;
  method: 'TOTP';
  secretPreview: string;
  otpauthUrl: string;
  backupCodes: string[];
  isPrivilegedRole: boolean;
  eligibleRoles: string[];
}

export const ROLE_META: Record<
  RoleCodeType,
  {
    code: RoleCodeType;
    label: string;
    dashboardPath: string;
    badgeTone: 'primary' | 'teal' | 'success' | 'warning' | 'navy';
    description: string;
  }
> = {
  SUPER_ADMIN: {
    code: 'SUPER_ADMIN',
    label: 'Super Admin',
    dashboardPath: '/super-admin/dashboard',
    badgeTone: 'navy',
    description: 'Platform-wide governance across all registered hospitals, SaaS plans, and directory verification.',
  },
  HOSPITAL_ADMIN: {
    code: 'HOSPITAL_ADMIN',
    label: 'Hospital Admin',
    dashboardPath: '/hospital/dashboard',
    badgeTone: 'primary',
    description: 'Single-hospital tenant administration, staff invitations, departments, and operational oversight.',
  },
  DOCTOR: {
    code: 'DOCTOR',
    label: 'Doctor',
    dashboardPath: '/doctor/dashboard',
    badgeTone: 'teal',
    description: 'Clinical consultations, EHR encounters, e-prescriptions, patient records, and lab orders.',
  },
  NURSE: {
    code: 'NURSE',
    label: 'Nurse',
    dashboardPath: '/nurse/dashboard',
    badgeTone: 'success',
    description: 'Assigned ward patients, vital signs monitoring, nursing notes, and IPD bed management.',
  },
  RECEPTIONIST: {
    code: 'RECEPTIONIST',
    label: 'Receptionist',
    dashboardPath: '/reception/dashboard',
    badgeTone: 'primary',
    description: 'Patient registration, OPD scheduling, check-in queue, and front-desk billing.',
  },
  PHARMACIST: {
    code: 'PHARMACIST',
    label: 'Pharmacist',
    dashboardPath: '/pharmacy/dashboard',
    badgeTone: 'teal',
    description: 'Medicine inventory, prescription verification, batch/expiry dispensing, and returns.',
  },
  LAB_TECHNICIAN: {
    code: 'LAB_TECHNICIAN',
    label: 'Lab Technician',
    dashboardPath: '/laboratory/dashboard',
    badgeTone: 'warning',
    description: 'Diagnostic test requests, specimen tracking, result entry, and verified lab reports.',
  },
  ACCOUNTANT: {
    code: 'ACCOUNTANT',
    label: 'Hospital Accountant',
    dashboardPath: '/hospital/dashboard',
    badgeTone: 'primary',
    description: 'Financial billing, credit notes, refunds, insurance claims, and hospital revenue reconciliation.',
  },
  PATIENT: {
    code: 'PATIENT',
    label: 'Patient',
    dashboardPath: '/patient/dashboard',
    badgeTone: 'teal',
    description: 'Patient self-service portal for appointments, personal health records, and invoices.',
  },
};

const ROLE_PRIORITY: RoleCodeType[] = [
  'SUPER_ADMIN',
  'HOSPITAL_ADMIN',
  'DOCTOR',
  'NURSE',
  'RECEPTIONIST',
  'PHARMACIST',
  'LAB_TECHNICIAN',
  'ACCOUNTANT',
  'PATIENT',
];

export function resolvePrimaryRole(user: AuthUserProfile | null): RoleCodeType | null {
  if (!user) return null;
  const combined = Array.from(new Set([...(user.globalRoles || []), ...(user.activeRoles || [])]));
  for (const candidate of ROLE_PRIORITY) {
    if (combined.includes(candidate)) {
      return candidate;
    }
  }
  return combined[0] ?? null;
}

export function getRoleDashboardPath(user: AuthUserProfile | null): string {
  const role = resolvePrimaryRole(user);
  if (!role) return '/login';
  if (role === 'PATIENT') return '/unauthorized';
  return ROLE_META[role]?.dashboardPath || '/unauthorized';
}
