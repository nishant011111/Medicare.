import React from 'react';
import {
  LayoutDashboard,
  Stethoscope,
  Building2,
  CalendarClock,
  UserCog,
  BarChart3,
  Bell,
  Settings,
} from 'lucide-react';
import { RoleCodeType } from '../types/auth';

export interface NavigationItemConfig {
  id: string;
  label: string;
  path: string;
  icon: React.FC<{ className?: string }>;
  description: string;
  allowedRoles: RoleCodeType[];
  requiredPermission?: string;
}

const ALL_STAFF_ROLES: RoleCodeType[] = [
  'SUPER_ADMIN',
  'HOSPITAL_ADMIN',
  'DOCTOR',
  'NURSE',
  'RECEPTIONIST',
  'PHARMACIST',
  'LAB_TECHNICIAN',
  'ACCOUNTANT',
];

/**
 * Active MediCore Left Sidebar Navigation
 * Includes only live, implemented hospital & platform modules.
 */
export const SIDEBAR_NAVIGATION_ITEMS: NavigationItemConfig[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
    description: 'Role-specific operational command center, KPIs, and hospital tenant overview.',
    allowedRoles: [...ALL_STAFF_ROLES],
  },
  {
    id: 'hospitals',
    label: 'Hospitals',
    path: '/super-admin/hospitals',
    icon: Building2,
    description: 'Manage registered hospitals, verification approvals, and tenant onboarding.',
    allowedRoles: ['SUPER_ADMIN'],
  },
  {
    id: 'doctors',
    label: 'Doctors',
    path: '/doctors',
    icon: Stethoscope,
    description: 'Attending physicians, specialization rosters, consultation fees, and schedules.',
    allowedRoles: ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'],
  },
  {
    id: 'departments',
    label: 'Departments',
    path: '/departments',
    icon: Building2,
    description: 'Clinical & diagnostic hospital departments, ward capacity, and service wings.',
    allowedRoles: ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'],
  },
  {
    id: 'appointments',
    label: 'Appointments',
    path: '/appointments',
    icon: CalendarClock,
    description: 'OPD slot booking, token queue management, check-in, and rescheduling.',
    allowedRoles: ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'],
    requiredPermission: 'clinical:appointments:view',
  },
  {
    id: 'staff-management',
    label: 'Staff Management',
    path: '/staff-management',
    icon: UserCog,
    description: 'Hospital staff invitations, RBAC role assignments, and membership status.',
    allowedRoles: ['SUPER_ADMIN', 'HOSPITAL_ADMIN'],
    requiredPermission: 'hospital:membership:manage',
  },
  {
    id: 'reports-analytics',
    label: 'Reports & Analytics',
    path: '/reports-analytics',
    icon: BarChart3,
    description: 'Hospital occupancy metrics, financial summaries, and platform audit logs.',
    allowedRoles: ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'ACCOUNTANT'],
  },
  {
    id: 'notifications',
    label: 'Notifications',
    path: '/super-admin/notifications',
    icon: Bell,
    description: 'Platform announcements, operational alerts, and system notices.',
    allowedRoles: ['SUPER_ADMIN'],
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/settings',
    icon: Settings,
    description: 'Account security, two-factor authentication, and active device sessions.',
    allowedRoles: [...ALL_STAFF_ROLES],
  },
];

export function getAuthorizedNavigationForRole(role: RoleCodeType | null): NavigationItemConfig[] {
  if (!role) return SIDEBAR_NAVIGATION_ITEMS;
  if (role === 'SUPER_ADMIN') return SIDEBAR_NAVIGATION_ITEMS;
  return SIDEBAR_NAVIGATION_ITEMS.filter((item) => item.allowedRoles.includes(role));
}
