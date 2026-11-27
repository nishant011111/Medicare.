import { apiRequest } from './api';
import { RoleCodeType } from '../types/auth';

export interface PlatformOverviewStats {
  totalHospitals: number;
  activeHospitals: number;
  inactiveHospitals: number;
  pendingHospitals: number;
  suspendedHospitals: number;
  rejectedHospitals: number;
  directoryHospitalsTotal: number;
  directoryVerifiedCount: number;
  totalRegisteredPatients: number;
  totalDoctors: number;
  totalStaff: number;
  totalHospitalAdmins: number;
  totalPlatformUsers: number;
  activePlatformUsers: number;
  totalAppointments: number;
  completedAppointments: number;
  recentAuditLogs: PlatformAuditLogItem[];
  lastUpdatedAt: string;
}

export interface HospitalRecord {
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
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'ACTIVE';
  departments: string[];
  about?: string | null;
  operatingHours?: string | null;
  cancellationPolicyHours?: number | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HospitalAdministratorRecord {
  id: string;
  userId: string;
  membershipId: string | null;
  fullName: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  hospitalId: string | null;
  hospitalName: string;
  hospitalStatus: string;
  membershipStatus: string;
  assignedAt: string;
}

export interface PlatformUserRecord {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  isEmailVerified: boolean;
  isActive: boolean;
  activeHospitalId: string | null;
  globalRoles: RoleCodeType[];
  activeRoles: RoleCodeType[];
  permissions: string[];
  memberships: Array<{
    id: string;
    hospitalId: string;
    hospitalName: string;
    hospitalCity: string;
    hospitalCategory: string;
    hospitalStatus: string;
    department: string | null;
    employeeCode: string | null;
    status: string;
    roles: RoleCodeType[];
    joinedAt: string;
  }>;
  createdAt: string;
}

export interface PlatformAuditLogItem {
  id: string;
  userId: string | null;
  actorName: string;
  actorEmail: string | null;
  hospitalId: string | null;
  hospitalName: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  ipAddress: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface DirectoryHospitalItem {
  id: string;
  directoryCode: string;
  name: string;
  facilityType: string;
  ownershipType: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  primaryPhone: string | null;
  email: string | null;
  website: string | null;
  emergencyAvailable: boolean | null;
  specialties: string[];
  verificationStatus: 'PENDING_VERIFICATION' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED';
  isActiveTenant: boolean;
}

export const SuperAdminService = {
  async getPlatformOverview() {
    const res = await apiRequest<{ data: PlatformOverviewStats }>('/admin/overview');
    return res.data;
  },

  async listHospitals(params?: { search?: string; status?: string; category?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.status && params.status !== 'ALL') query.set('status', params.status);
    if (params?.category && params.category !== 'ALL') query.set('category', params.category);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString() ? `?${query.toString()}` : '';
    return apiRequest<{
      data: HospitalRecord[];
      meta: { total: number; page: number; limit: number; totalPages: number };
      statistics: Record<string, unknown>;
    }>(`/admin/hospitals${qs}`);
  },

  async getHospitalDetail(hospitalId: string) {
    const res = await apiRequest<{
      data: {
        hospital: HospitalRecord;
        administrators: Array<{
          userId: string;
          membershipId: string | null;
          fullName: string;
          email: string;
          phone: string | null;
          isActive: boolean;
          membershipStatus: string;
          assignedAt: string;
        }>;
        doctors: Array<{
          id: string;
          fullName: string;
          specialization: string;
          departmentName: string;
          qualification: string;
          consultationFee?: number | null;
          verificationStatus: string;
        }>;
        staff: Array<{
          membershipId: string;
          userId: string;
          fullName: string;
          email: string;
          phone: string | null;
          department: string;
          employeeCode: string | null;
          status: string;
          isActive: boolean;
          roles: string[];
          joinedAt: string;
        }>;
        statistics: {
          totalDoctors: number;
          totalStaff: number;
          totalPatients: number;
          totalAppointments: number;
          completedAppointments: number;
          pendingAppointments: number;
        };
        recentActivity: PlatformAuditLogItem[];
      };
    }>(`/admin/hospitals/${hospitalId}`);
    return res.data;
  },

  async registerHospital(input: {
    name: string;
    registrationNumber: string;
    category: string;
    address: string;
    city: string;
    state: string;
    contactEmail: string;
    contactPhone: string;
    totalBeds?: number;
    availableBeds?: number;
    departments?: string[];
  }) {
    const res = await apiRequest<{ data: HospitalRecord }>('/hospitals', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return res.data;
  },

  async updateHospital(
    hospitalId: string,
    updates: Partial<{
      name: string;
      category: string;
      address: string;
      city: string;
      state: string;
      contactEmail: string;
      contactPhone: string;
      totalBeds: number;
      availableBeds: number;
      departments: string[];
    }>
  ) {
    const res = await apiRequest<{ data: HospitalRecord }>(`/hospitals/${hospitalId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    return res.data;
  },

  async approveHospital(hospitalId: string) {
    const res = await apiRequest<{ data: HospitalRecord }>(`/admin/hospitals/${hospitalId}/approve`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    return res.data;
  },

  async suspendHospital(hospitalId: string, reason?: string) {
    const res = await apiRequest<{ data: HospitalRecord }>(`/admin/hospitals/${hospitalId}/suspend`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    return res.data;
  },

  async rejectHospital(hospitalId: string, reason?: string) {
    const res = await apiRequest<{ data: HospitalRecord }>(`/admin/hospitals/${hospitalId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    return res.data;
  },

  async listDirectoryHospitals(search?: string) {
    const qs = search ? `?search=${encodeURIComponent(search)}&limit=50` : '?limit=50';
    return apiRequest<{ data: DirectoryHospitalItem[] }>(`/platform/hospital-directory${qs}`);
  },

  async verifyDirectoryHospital(directoryId: string, activateTenant = true) {
    return apiRequest<{ data: DirectoryHospitalItem }>(
      `/platform/hospital-directory/${directoryId}/verify`,
      {
        method: 'POST',
        body: JSON.stringify({
          activateTenant,
          verificationNotes: 'Verified by Super Admin via MediCore Web Console',
        }),
      }
    );
  },

  async listAdministrators(params?: { search?: string; hospitalId?: string; status?: string }) {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.hospitalId) query.set('hospitalId', params.hospitalId);
    if (params?.status && params.status !== 'ALL') query.set('status', params.status);
    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await apiRequest<{ data: HospitalAdministratorRecord[] }>(`/admin/administrators${qs}`);
    return res.data;
  },

  async createAdministrator(input: {
    fullName: string;
    email: string;
    phone?: string;
    password?: string;
    hospitalId: string;
  }) {
    const res = await apiRequest<{ data: HospitalAdministratorRecord }>('/admin/administrators', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return res.data;
  },

  async updateAdministrator(
    userId: string,
    updates: Partial<{ fullName: string; phone: string; isActive: boolean; hospitalId: string }>
  ) {
    const res = await apiRequest<{ data: Partial<HospitalAdministratorRecord> }>(
      `/admin/administrators/${userId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }
    );
    return res.data;
  },

  async listPlatformUsers(search?: string) {
    const qs = search ? `?search=${encodeURIComponent(search)}` : '';
    const res = await apiRequest<{ data: PlatformUserRecord[] }>(`/admin/users${qs}`);
    return res.data;
  },

  async updatePlatformUserStatus(userId: string, isActive: boolean) {
    const res = await apiRequest<{ data: PlatformUserRecord }>(`/admin/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
    return res.data;
  },

  async getPlatformAnalytics(range: '7d' | '30d' | '90d' | '12m' = '30d') {
    const res = await apiRequest<{
      data: {
        range: string;
        windowStart: string;
        windowEnd: string;
        summary: {
          totalHospitals: number;
          hospitalsRegisteredInRange: number;
          totalUsers: number;
          usersRegisteredInRange: number;
          totalPatients: number;
          totalAppointments: number;
          totalAuditEvents: number;
        };
        roleDistribution: Array<{ role: string; count: number }>;
        hospitalStatusBreakdown: {
          APPROVED: number;
          PENDING: number;
          SUSPENDED: number;
          REJECTED: number;
        };
        hospitalActivityDistribution: Array<{
          hospitalId: string;
          hospitalName: string;
          city: string;
          status: string;
          patientsCount: number;
          appointmentsCount: number;
          staffCount: number;
        }>;
      };
    }>(`/admin/analytics?range=${range}`);
    return res.data;
  },

  async listAuditLogs(params?: {
    search?: string;
    action?: string;
    entityType?: string;
    page?: number;
    limit?: number;
  }) {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.action && params.action !== 'ALL') query.set('action', params.action);
    if (params?.entityType && params.entityType !== 'ALL') query.set('entityType', params.entityType);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString() ? `?${query.toString()}` : '';
    return apiRequest<{
      data: PlatformAuditLogItem[];
      meta: { total: number; page: number; limit: number; totalPages: number };
    }>(`/admin/audit-logs${qs}`);
  },

  async getAnnouncements() {
    const res = await apiRequest<{
      data: {
        announcements: Array<{
          id: string;
          title: string;
          body: string;
          category: string;
          targetScope: string;
          publishedByUserId: string;
          publishedAt: string;
        }>;
        notifications: Array<{
          id: string;
          category: string;
          eventType: string;
          publicTitle: string;
          authenticatedBody: string;
          status: string;
          readAt?: string;
          createdAt: string;
        }>;
        deliveryCapabilities: {
          inAppNotificationStore: string;
          emailProvider: string;
          smsProvider: string;
        };
      };
    }>('/admin/announcements');
    return res.data;
  },

  async createAnnouncement(input: {
    title: string;
    body: string;
    category: string;
    targetScope: string;
  }) {
    const res = await apiRequest<{ data: unknown }>('/admin/announcements', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return res.data;
  },

  async getSystemSettings() {
    const res = await apiRequest<{
      data: {
        preferences: {
          platformName: string;
          organizationName: string;
          supportEmail: string;
          securityContactEmail: string;
          defaultTimezone: string;
          defaultCurrency: string;
          maintenanceMode: boolean;
          maintenanceBannerText: string;
          allowSelfHospitalRegistration: boolean;
          requireDirectoryVerificationBeforeActivation: boolean;
          defaultEmailNotifications: boolean;
          defaultPushNotifications: boolean;
          defaultSmsNotifications: boolean;
          updatedAt: string;
        };
        subscriptionPlans: Array<{
          id: string;
          planCode: string;
          name: string;
          description: string;
          monthlyPricePaise: number;
          annualPricePaise: number;
          trialDays: number;
          maxStaffAccounts: number;
          monthlyAiTokenLimit: number;
          isActive: boolean;
        }>;
        systemStatus: {
          environment: string;
          databaseAdapter: string;
          directoryDatasetCount: number;
          totalApiRequests: number;
          failedAuthAttempts: number;
        };
      };
    }>('/admin/settings');
    return res.data;
  },

  async updateSystemSettings(updates: Record<string, unknown>) {
    const res = await apiRequest<{ data: Record<string, unknown> }>('/admin/settings', {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    return res.data;
  },
};
