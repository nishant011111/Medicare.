export type RoleCodeType =
  | 'SUPER_ADMIN'
  | 'HOSPITAL_ADMIN'
  | 'DOCTOR'
  | 'NURSE'
  | 'RECEPTIONIST'
  | 'PHARMACIST'
  | 'LAB_TECHNICIAN'
  | 'ACCOUNTANT'
  | 'PATIENT';

export const ROLES: Record<RoleCodeType, { code: RoleCodeType; name: string; description: string; isSystem: boolean }> = {
  SUPER_ADMIN: {
    code: 'SUPER_ADMIN',
    name: 'Super Administrator',
    description: 'Platform-wide governance across all registered hospitals, SaaS plans, and users',
    isSystem: true,
  },
  HOSPITAL_ADMIN: {
    code: 'HOSPITAL_ADMIN',
    name: 'Hospital Administrator',
    description: 'Manages hospital profile, staff invitations, memberships, roles, departments, and SaaS subscription for a single hospital',
    isSystem: false,
  },
  DOCTOR: {
    code: 'DOCTOR',
    name: 'Doctor',
    description: 'Clinical consultations, EHR encounters, prescriptions, patient records, and lab test orders',
    isSystem: false,
  },
  NURSE: {
    code: 'NURSE',
    name: 'Nurse',
    description: 'Assigned ward patients, vital signs monitoring, nursing notes, and IPD bed tasks',
    isSystem: false,
  },
  RECEPTIONIST: {
    code: 'RECEPTIONIST',
    name: 'Receptionist',
    description: 'Patient registration, OPD scheduling, check-in queue, and service billing',
    isSystem: false,
  },
  PHARMACIST: {
    code: 'PHARMACIST',
    name: 'Pharmacist',
    description: 'Medicine inventory, prescription verification, expiry-aware dispensing, and returns',
    isSystem: false,
  },
  LAB_TECHNICIAN: {
    code: 'LAB_TECHNICIAN',
    name: 'Laboratory Technician',
    description: 'Diagnostic test requests, sample tracking, result entry, and verified lab reports',
    isSystem: false,
  },
  ACCOUNTANT: {
    code: 'ACCOUNTANT',
    name: 'Hospital Accountant',
    description: 'Financial billing, credit notes, refunds, reconciliation, insurance claims, and hospital expenses',
    isSystem: false,
  },
  PATIENT: {
    code: 'PATIENT',
    name: 'Patient',
    description: 'Personal health portal, appointments, EHR timeline, prescriptions, invoices, and AI report summaries',
    isSystem: false,
  },
};

export const PERMISSIONS = {
  // Super Admin Platform Permissions
  PLATFORM_HOSPITALS_VIEW_ALL: 'platform:hospitals:view_all',
  PLATFORM_HOSPITALS_APPROVE: 'platform:hospitals:approve',
  PLATFORM_HOSPITALS_REJECT: 'platform:hospitals:reject',
  PLATFORM_HOSPITALS_SUSPEND: 'platform:hospitals:suspend',
  PLATFORM_USERS_MANAGE: 'platform:users:manage',
  PLATFORM_AUDIT_VIEW: 'platform:audit:view',
  PLATFORM_SAAS_PLANS_MANAGE: 'platform:saas:plans_manage',
  PLATFORM_SAAS_ANALYTICS_VIEW: 'platform:saas:analytics_view',
  PLATFORM_SUPPORT_MANAGE: 'platform:support:manage',

  // Hospital Admin Tenant Permissions
  HOSPITAL_PROFILE_UPDATE: 'hospital:profile:update',
  HOSPITAL_STAFF_INVITE: 'hospital:staff:invite',
  HOSPITAL_MEMBERSHIP_MANAGE: 'hospital:membership:manage',
  HOSPITAL_ROLES_ASSIGN: 'hospital:roles:assign',
  HOSPITAL_DEPARTMENTS_MANAGE: 'hospital:departments:manage',
  HOSPITAL_ANALYTICS_VIEW: 'hospital:analytics:view',
  HOSPITAL_SUBSCRIPTION_MANAGE: 'hospital:subscription:manage',
  HOSPITAL_SUPPORT_TICKET: 'hospital:support:ticket',

  // Clinical & Operational Permissions
  CLINICAL_APPOINTMENTS_VIEW: 'clinical:appointments:view',
  CLINICAL_APPOINTMENTS_MANAGE: 'clinical:appointments:manage',
  CLINICAL_RECORDS_VIEW: 'clinical:records:view',
  CLINICAL_ENCOUNTERS_WRITE: 'clinical:encounters:write',
  CLINICAL_PRESCRIPTIONS_WRITE: 'clinical:prescriptions:write',
  CLINICAL_PRESCRIPTIONS_DISPENSE: 'clinical:prescriptions:dispense',
  CLINICAL_VITALS_RECORD: 'clinical:vitals:record',
  CLINICAL_LAB_PROCESS: 'clinical:lab:process',
  OPERATIONS_INVENTORY_MANAGE: 'operations:inventory:manage',
  OPERATIONS_IPD_MANAGE: 'operations:ipd:manage',
  FINANCE_BILLING_MANAGE: 'finance:billing:manage',
  FINANCE_CLAIMS_MANAGE: 'finance:claims:manage',
  FINANCE_EXPENSES_MANAGE: 'finance:expenses:manage',
  AI_ASSISTANT_USE: 'ai:assistant:use',
  PATIENT_PORTAL_ACCESS: 'patient:portal:access',
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ROLE_PERMISSION_MAP: Record<RoleCodeType, PermissionCode[]> = {
  SUPER_ADMIN: Object.values(PERMISSIONS),
  HOSPITAL_ADMIN: [
    PERMISSIONS.HOSPITAL_PROFILE_UPDATE,
    PERMISSIONS.HOSPITAL_STAFF_INVITE,
    PERMISSIONS.HOSPITAL_MEMBERSHIP_MANAGE,
    PERMISSIONS.HOSPITAL_ROLES_ASSIGN,
    PERMISSIONS.HOSPITAL_DEPARTMENTS_MANAGE,
    PERMISSIONS.HOSPITAL_ANALYTICS_VIEW,
    PERMISSIONS.HOSPITAL_SUBSCRIPTION_MANAGE,
    PERMISSIONS.HOSPITAL_SUPPORT_TICKET,
    PERMISSIONS.CLINICAL_APPOINTMENTS_VIEW,
    PERMISSIONS.OPERATIONS_INVENTORY_MANAGE,
    PERMISSIONS.OPERATIONS_IPD_MANAGE,
    PERMISSIONS.FINANCE_BILLING_MANAGE,
    PERMISSIONS.FINANCE_CLAIMS_MANAGE,
    PERMISSIONS.FINANCE_EXPENSES_MANAGE,
    PERMISSIONS.AI_ASSISTANT_USE,
  ],
  DOCTOR: [
    PERMISSIONS.CLINICAL_APPOINTMENTS_VIEW,
    PERMISSIONS.CLINICAL_APPOINTMENTS_MANAGE,
    PERMISSIONS.CLINICAL_RECORDS_VIEW,
    PERMISSIONS.CLINICAL_ENCOUNTERS_WRITE,
    PERMISSIONS.CLINICAL_PRESCRIPTIONS_WRITE,
    PERMISSIONS.OPERATIONS_IPD_MANAGE,
    PERMISSIONS.AI_ASSISTANT_USE,
  ],
  NURSE: [
    PERMISSIONS.CLINICAL_APPOINTMENTS_VIEW,
    PERMISSIONS.CLINICAL_RECORDS_VIEW,
    PERMISSIONS.CLINICAL_VITALS_RECORD,
    PERMISSIONS.OPERATIONS_IPD_MANAGE,
    PERMISSIONS.AI_ASSISTANT_USE,
  ],
  RECEPTIONIST: [
    PERMISSIONS.CLINICAL_APPOINTMENTS_VIEW,
    PERMISSIONS.CLINICAL_APPOINTMENTS_MANAGE,
    PERMISSIONS.OPERATIONS_IPD_MANAGE,
    PERMISSIONS.FINANCE_BILLING_MANAGE,
    PERMISSIONS.AI_ASSISTANT_USE,
  ],
  PHARMACIST: [
    PERMISSIONS.CLINICAL_PRESCRIPTIONS_DISPENSE,
    PERMISSIONS.OPERATIONS_INVENTORY_MANAGE,
    PERMISSIONS.AI_ASSISTANT_USE,
  ],
  LAB_TECHNICIAN: [
    PERMISSIONS.CLINICAL_LAB_PROCESS,
    PERMISSIONS.OPERATIONS_INVENTORY_MANAGE,
    PERMISSIONS.AI_ASSISTANT_USE,
  ],
  ACCOUNTANT: [
    PERMISSIONS.FINANCE_BILLING_MANAGE,
    PERMISSIONS.FINANCE_CLAIMS_MANAGE,
    PERMISSIONS.FINANCE_EXPENSES_MANAGE,
    PERMISSIONS.HOSPITAL_ANALYTICS_VIEW,
    PERMISSIONS.AI_ASSISTANT_USE,
  ],
  PATIENT: [
    PERMISSIONS.PATIENT_PORTAL_ACCESS,
    PERMISSIONS.CLINICAL_APPOINTMENTS_VIEW,
    PERMISSIONS.AI_ASSISTANT_USE,
  ],
};

