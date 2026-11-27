import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock,
  Eye,
  FileCheck2,
  Filter,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  UserCheck,
  UserCog,
  Users,
  XCircle,
  Bell,
  BarChart3,
  ArrowLeft,
} from 'lucide-react';
import { ApplicationShell } from '../../layouts/ApplicationShell';
import { Button } from '../../components/ui/Button';
import { SelectInput, TextareaInput, TextInput } from '../../components/ui/FormControls';
import {
  Card,
  EmptyState,
  ErrorState,
  SkeletonCard,
  StatCard,
  StatusBadge,
} from '../../components/ui/FeedbackAndData';
import { ConfirmationDialog, Modal, Pagination, Tabs } from '../../components/ui/OverlaysAndNavigation';
import { useToast } from '../../hooks/useToast';
import { formatDate, formatDateTime } from '../../utils/format';
import {
  DirectoryHospitalItem,
  HospitalAdministratorRecord,
  HospitalRecord,
  PlatformAuditLogItem,
  PlatformOverviewStats,
  PlatformUserRecord,
  SuperAdminService,
} from '../../services/superAdminService';
import { ApiClientError } from '../../services/api';

export type SuperAdminSectionType =
  | 'overview'
  | 'hospitals'
  | 'hospital-detail'
  | 'administrators'
  | 'users'
  | 'analytics'
  | 'activity-logs'
  | 'notifications'
  | 'settings';

export const SuperAdminPortalPage: React.FC<{ section: SuperAdminSectionType }> = ({ section }) => {
  const { id: routeHospitalId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Shared Loading & Error
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liveTime, setLiveTime] = useState(() => new Date());

  // 1. Overview State
  const [overview, setOverview] = useState<PlatformOverviewStats | null>(null);

  // 2. Hospitals State
  const [hospitalsTab, setHospitalsTab] = useState<'tenants' | 'directory'>('tenants');
  const [hospitals, setHospitals] = useState<HospitalRecord[]>([]);
  const [hospitalSearch, setHospitalSearch] = useState('');
  const [hospitalStatusFilter, setHospitalStatusFilter] = useState('ALL');
  const [hospitalPage, setHospitalPage] = useState(1);
  const [hospitalTotalPages, setHospitalTotalPages] = useState(1);
  const [directoryHospitals, setDirectoryHospitals] = useState<DirectoryHospitalItem[]>([]);
  const [showRegisterHospitalModal, setShowRegisterHospitalModal] = useState(false);
  const [editingHospital, setEditingHospital] = useState<HospitalRecord | null>(null);
  const [confirmHospitalAction, setConfirmHospitalAction] = useState<{
    hospital: HospitalRecord;
    action: 'APPROVE' | 'SUSPEND' | 'REJECT';
    reason: string;
  } | null>(null);
  const [hospitalForm, setHospitalForm] = useState({
    name: '',
    registrationNumber: '',
    category: 'Multi-Specialty Hospital',
    address: '',
    city: 'Ranchi',
    state: 'Jharkhand',
    contactEmail: '',
    contactPhone: '',
    totalBeds: '120',
    availableBeds: '40',
    departments: 'General Medicine, Cardiology, Orthopedics, Pediatrics, Emergency',
  });

  // 3. Hospital Detail State
  const [hospitalDetail, setHospitalDetail] = useState<Awaited<
    ReturnType<typeof SuperAdminService.getHospitalDetail>
  > | null>(null);

  // 4. Hospital Administrators State
  const [administrators, setAdministrators] = useState<HospitalAdministratorRecord[]>([]);
  const [adminSearch, setAdminSearch] = useState('');
  const [adminStatusFilter, setAdminStatusFilter] = useState('ALL');
  const [showCreateAdminModal, setShowCreateAdminModal] = useState(false);
  const [adminForm, setAdminForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    hospitalId: '',
  });
  const [confirmAdminToggle, setConfirmAdminToggle] = useState<HospitalAdministratorRecord | null>(null);

  // 5. Platform Users State
  const [platformUsers, setPlatformUsers] = useState<PlatformUserRecord[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('ALL');
  const [userStatusFilter, setUserStatusFilter] = useState('ALL');
  const [selectedUserModal, setSelectedUserModal] = useState<PlatformUserRecord | null>(null);

  // 6. Platform Analytics State
  const [analyticsRange, setAnalyticsRange] = useState<'7d' | '30d' | '90d' | '12m'>('30d');
  const [analyticsData, setAnalyticsData] = useState<Awaited<
    ReturnType<typeof SuperAdminService.getPlatformAnalytics>
  > | null>(null);

  // 7. Activity Logs State
  const [auditLogs, setAuditLogs] = useState<PlatformAuditLogItem[]>([]);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditEntityFilter, setAuditEntityFilter] = useState('ALL');
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotalPages, setAuditTotalPages] = useState(1);

  // 8. Notifications & Announcements State
  const [announcementsData, setAnnouncementsData] = useState<Awaited<
    ReturnType<typeof SuperAdminService.getAnnouncements>
  > | null>(null);
  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    body: '',
    category: 'OPERATIONS_NOTICE',
    targetScope: 'ALL_TENANTS',
  });

  // 9. System Settings State
  const [settingsData, setSettingsData] = useState<Awaited<
    ReturnType<typeof SuperAdminService.getSystemSettings>
  > | null>(null);
  const [settingsForm, setSettingsForm] = useState({
    platformName: '',
    organizationName: '',
    supportEmail: '',
    securityContactEmail: '',
    defaultTimezone: 'Asia/Kolkata',
    maintenanceMode: false,
    maintenanceBannerText: '',
    allowSelfHospitalRegistration: true,
    requireDirectoryVerificationBeforeActivation: true,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setLiveTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const loadSectionData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (section === 'overview') {
        const [ov, hospRes] = await Promise.all([
          SuperAdminService.getPlatformOverview(),
          SuperAdminService.listHospitals({ limit: 8 }),
        ]);
        setOverview(ov);
        setHospitals(hospRes.data || []);
      } else if (section === 'hospitals') {
        const [hospRes, dirRes] = await Promise.all([
          SuperAdminService.listHospitals({
            search: hospitalSearch,
            status: hospitalStatusFilter,
            page: hospitalPage,
            limit: 10,
          }),
          SuperAdminService.listDirectoryHospitals(hospitalSearch),
        ]);
        setHospitals(hospRes.data || []);
        setHospitalTotalPages(hospRes.meta?.totalPages || 1);
        setDirectoryHospitals(dirRes.data || []);
      } else if (section === 'hospital-detail' && routeHospitalId) {
        const detail = await SuperAdminService.getHospitalDetail(routeHospitalId);
        setHospitalDetail(detail);
      } else if (section === 'administrators') {
        const [admins, hospRes] = await Promise.all([
          SuperAdminService.listAdministrators({
            search: adminSearch,
            status: adminStatusFilter,
          }),
          SuperAdminService.listHospitals({ limit: 50 }),
        ]);
        setAdministrators(admins);
        setHospitals(hospRes.data || []);
        if (!adminForm.hospitalId && hospRes.data?.length > 0) {
          setAdminForm((prev) => ({ ...prev, hospitalId: hospRes.data[0].id }));
        }
      } else if (section === 'users') {
        const users = await SuperAdminService.listPlatformUsers(userSearch);
        setPlatformUsers(users);
      } else if (section === 'analytics') {
        const data = await SuperAdminService.getPlatformAnalytics(analyticsRange);
        setAnalyticsData(data);
      } else if (section === 'activity-logs') {
        const res = await SuperAdminService.listAuditLogs({
          search: auditSearch,
          entityType: auditEntityFilter,
          page: auditPage,
          limit: 20,
        });
        setAuditLogs(res.data || []);
        setAuditTotalPages(res.meta?.totalPages || 1);
      } else if (section === 'notifications') {
        const data = await SuperAdminService.getAnnouncements();
        setAnnouncementsData(data);
      } else if (section === 'settings') {
        const data = await SuperAdminService.getSystemSettings();
        setSettingsData(data);
        setSettingsForm({
          platformName: data.preferences.platformName,
          organizationName: data.preferences.organizationName,
          supportEmail: data.preferences.supportEmail,
          securityContactEmail: data.preferences.securityContactEmail,
          defaultTimezone: data.preferences.defaultTimezone,
          maintenanceMode: data.preferences.maintenanceMode,
          maintenanceBannerText: data.preferences.maintenanceBannerText || '',
          allowSelfHospitalRegistration: data.preferences.allowSelfHospitalRegistration,
          requireDirectoryVerificationBeforeActivation:
            data.preferences.requireDirectoryVerificationBeforeActivation,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Super Admin data');
    } finally {
      setLoading(false);
    }
  }, [
    section,
    routeHospitalId,
    hospitalSearch,
    hospitalStatusFilter,
    hospitalPage,
    adminSearch,
    adminStatusFilter,
    userSearch,
    analyticsRange,
    auditSearch,
    auditEntityFilter,
    auditPage,
  ]);

  useEffect(() => {
    void loadSectionData();
  }, [loadSectionData]);

  // Handlers
  const handleSaveHospital = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const departments = hospitalForm.departments
        .split(',')
        .map((d) => d.trim())
        .filter(Boolean);

      if (editingHospital) {
        await SuperAdminService.updateHospital(editingHospital.id, {
          name: hospitalForm.name,
          category: hospitalForm.category,
          address: hospitalForm.address,
          city: hospitalForm.city,
          state: hospitalForm.state,
          contactEmail: hospitalForm.contactEmail,
          contactPhone: hospitalForm.contactPhone,
          totalBeds: Number(hospitalForm.totalBeds) || 100,
          availableBeds: Number(hospitalForm.availableBeds) || 25,
          departments,
        });
        showToast({
          title: 'Hospital updated',
          description: `${hospitalForm.name} profile saved.`,
          variant: 'success',
        });
      } else {
        await SuperAdminService.registerHospital({
          name: hospitalForm.name,
          registrationNumber: hospitalForm.registrationNumber,
          category: hospitalForm.category,
          address: hospitalForm.address,
          city: hospitalForm.city,
          state: hospitalForm.state,
          contactEmail: hospitalForm.contactEmail,
          contactPhone: hospitalForm.contactPhone,
          totalBeds: Number(hospitalForm.totalBeds) || 100,
          availableBeds: Number(hospitalForm.availableBeds) || 25,
          departments,
        });
        showToast({
          title: 'Hospital registered',
          description: `${hospitalForm.name} registered in platform registry.`,
          variant: 'success',
        });
      }
      setShowRegisterHospitalModal(false);
      setEditingHospital(null);
      await loadSectionData();
    } catch (err) {
      showToast({
        title: 'Operation failed',
        description: err instanceof ApiClientError ? err.message : 'Could not save hospital',
        variant: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmHospitalStatusAction = async () => {
    if (!confirmHospitalAction || submitting) return;
    setSubmitting(true);
    try {
      const { hospital, action, reason } = confirmHospitalAction;
      if (action === 'APPROVE') {
        await SuperAdminService.approveHospital(hospital.id);
      } else if (action === 'SUSPEND') {
        await SuperAdminService.suspendHospital(hospital.id, reason || 'Suspended by Super Admin');
      } else {
        await SuperAdminService.rejectHospital(hospital.id, reason || 'Rejected by Super Admin');
      }
      showToast({
        title: `Hospital ${action.toLowerCase()}d`,
        description: `${hospital.name} status updated and recorded in audit trail.`,
        variant: 'success',
      });
      setConfirmHospitalAction(null);
      await loadSectionData();
    } catch (err) {
      showToast({
        title: 'Status update failed',
        description: err instanceof Error ? err.message : 'Unable to update hospital status',
        variant: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await SuperAdminService.createAdministrator(adminForm);
      showToast({
        title: 'Hospital Administrator assigned',
        description: `${adminForm.fullName} has been granted HOSPITAL_ADMIN access.`,
        variant: 'success',
      });
      setShowCreateAdminModal(false);
      setAdminForm({
        fullName: '',
        email: '',
        phone: '',
        password: '',
        hospitalId: hospitals[0]?.id || '',
      });
      await loadSectionData();
    } catch (err) {
      showToast({
        title: 'Failed to assign administrator',
        description: err instanceof Error ? err.message : 'Check input parameters',
        variant: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleAdminStatus = async () => {
    if (!confirmAdminToggle || submitting) return;
    setSubmitting(true);
    try {
      const nextStatus = !confirmAdminToggle.isActive;
      await SuperAdminService.updateAdministrator(confirmAdminToggle.userId, {
        isActive: nextStatus,
      });
      showToast({
        title: nextStatus ? 'Administrator activated' : 'Administrator deactivated',
        description: `${confirmAdminToggle.fullName} account status updated.`,
        variant: 'success',
      });
      setConfirmAdminToggle(null);
      await loadSectionData();
    } catch (err) {
      showToast({
        title: 'Update failed',
        description: err instanceof Error ? err.message : 'Could not update administrator status',
        variant: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleUserStatus = async (user: PlatformUserRecord) => {
    try {
      await SuperAdminService.updatePlatformUserStatus(user.id, !user.isActive);
      showToast({
        title: !user.isActive ? 'User activated' : 'User deactivated',
        description: `${user.fullName} status updated.`,
        variant: 'success',
      });
      await loadSectionData();
    } catch (err) {
      showToast({
        title: 'Status update failed',
        description: err instanceof Error ? err.message : 'Unable to update user status',
        variant: 'error',
      });
    }
  };

  const handlePublishAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await SuperAdminService.createAnnouncement(announcementForm);
      showToast({
        title: 'Announcement published',
        description: 'Platform notice recorded and dispatched to in-app notification outbox.',
        variant: 'success',
      });
      setAnnouncementForm({
        title: '',
        body: '',
        category: 'OPERATIONS_NOTICE',
        targetScope: 'ALL_TENANTS',
      });
      await loadSectionData();
    } catch (err) {
      showToast({
        title: 'Failed to publish announcement',
        description: err instanceof Error ? err.message : 'Please verify fields',
        variant: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await SuperAdminService.updateSystemSettings(settingsForm);
      showToast({
        title: 'System settings saved',
        description: 'Platform preferences updated and logged in audit trail.',
        variant: 'success',
      });
      await loadSectionData();
    } catch (err) {
      showToast({
        title: 'Settings update failed',
        description: err instanceof Error ? err.message : 'Unable to save settings',
        variant: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const sectionMeta: Record<SuperAdminSectionType, { title: string; subtitle: string }> = {
    overview: {
      title: 'Super Admin Platform Overview',
      subtitle: 'Central command center for the MediCore multi-hospital healthcare network.',
    },
    hospitals: {
      title: 'Hospital Tenant & Directory Management',
      subtitle: 'Register, inspect, approve, suspend, and verify hospitals across the MediCore network.',
    },
    'hospital-detail': {
      title: hospitalDetail?.hospital.name || 'Hospital Inspection',
      subtitle: 'Comprehensive tenant profile, assigned administrators, clinical roster, and audit trail.',
    },
    administrators: {
      title: 'Hospital Administrator Management',
      subtitle: 'Provision and manage HOSPITAL_ADMIN accounts and hospital tenant assignments.',
    },
    users: {
      title: 'Platform User Directory',
      subtitle: 'Cross-hospital account governance across clinicians, staff, administrators, and patients.',
    },
    analytics: {
      title: 'Platform Analytics & Growth Metrics',
      subtitle: 'Real-time multi-tenant registration, role distribution, and hospital activity metrics.',
    },
    'activity-logs': {
      title: 'Platform Activity & Security Audit Trail',
      subtitle: 'Immutable administrative, authentication, and tenant governance logs (PHI/Token sanitized).',
    },
    notifications: {
      title: 'Platform Announcements & Notification Center',
      subtitle: 'Broadcast system advisories and inspect notification outbox delivery status.',
    },
    settings: {
      title: 'Platform System Settings & Readiness',
      subtitle: 'Configure platform branding, tenant onboarding policies, and inspect SaaS plan tiers.',
    },
  };

  const currentMeta = sectionMeta[section];

  return (
    <ApplicationShell
      pageTitle={currentMeta.title}
      pageSubtitle={currentMeta.subtitle}
      breadcrumbs={[
        { label: 'MediCore Platform', path: '/super-admin/dashboard' },
        { label: currentMeta.title },
      ]}
      headerActions={
        <div className="flex items-center gap-2">
          <span className="hidden md:inline-flex items-center gap-1.5 text-xs text-[#718096] dark:text-slate-400 mr-2">
            <Clock className="w-3.5 h-3.5 text-[#0866B2]" />
            {liveTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            onClick={() => void loadSectionData()}
          >
            Refresh
          </Button>
          {section !== 'hospitals' && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Building2 className="w-3.5 h-3.5" />}
              onClick={() => navigate('/super-admin/hospitals')}
            >
              Manage Hospitals
            </Button>
          )}
        </div>
      }
    >
      {/* Quick Sub-Navigation Tabs across all 8 Super Admin Modules */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200/80 dark:border-slate-800">
        {[
          { id: 'overview', label: 'Overview', path: '/super-admin/dashboard', icon: Activity },
          { id: 'hospitals', label: 'Hospitals', path: '/super-admin/hospitals', icon: Building2 },
          { id: 'administrators', label: 'Hospital Admins', path: '/super-admin/administrators', icon: UserCog },
          { id: 'users', label: 'Platform Users', path: '/super-admin/users', icon: Users },
          { id: 'analytics', label: 'Analytics', path: '/super-admin/analytics', icon: BarChart3 },
          { id: 'activity-logs', label: 'Activity Logs', path: '/super-admin/activity-logs', icon: FileCheck2 },
          { id: 'notifications', label: 'Notifications', path: '/super-admin/notifications', icon: Bell },
          { id: 'settings', label: 'System Settings', path: '/super-admin/settings', icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = section === tab.id || (section === 'hospital-detail' && tab.id === 'hospitals');
          return (
            <Link
              key={tab.id}
              to={tab.path}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                active
                  ? 'bg-[#0866B2] text-white shadow-xs'
                  : 'text-[#718096] dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 hover:text-[#102F4D]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </Link>
          );
        })}
      </div>

      {error && <ErrorState title="Error loading platform data" message={error} onRetry={loadSectionData} />}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : null}

      {/* ===================================================================
          SECTION 1: OVERVIEW
      =================================================================== */}
      {!loading && section === 'overview' && overview && (
        <div className="space-y-6">
          {/* 8 Real Backend Statistic Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total Registered Hospitals"
              value={String(overview.totalHospitals)}
              trend={`${overview.directoryHospitalsTotal} in Ranchi Directory`}
              trendDirection="up"
              icon={<Building2 className="w-4 h-4" />}
            />
            <StatCard
              label="Active / Approved Hospitals"
              value={String(overview.activeHospitals)}
              trend={`${overview.pendingHospitals} pending approval`}
              trendDirection="up"
              icon={<CheckCircle2 className="w-4 h-4" />}
            />
            <StatCard
              label="Inactive / Suspended Hospitals"
              value={String(overview.inactiveHospitals)}
              trend={`${overview.suspendedHospitals} suspended · ${overview.rejectedHospitals} rejected`}
              trendDirection="neutral"
              icon={<ShieldAlert className="w-4 h-4" />}
            />
            <StatCard
              label="Total Platform Users"
              value={String(overview.totalPlatformUsers)}
              trend={`${overview.activePlatformUsers} active accounts`}
              trendDirection="up"
              icon={<Users className="w-4 h-4" />}
            />
            <StatCard
              label="Registered Patients"
              value={String(overview.totalRegisteredPatients)}
              trend="Across all hospitals"
              trendDirection="up"
              icon={<UserCheck className="w-4 h-4" />}
            />
            <StatCard
              label="Total Doctors"
              value={String(overview.totalDoctors)}
              trend="Verified & pending"
              trendDirection="up"
              icon={<Stethoscope className="w-4 h-4" />}
            />
            <StatCard
              label="Hospital Staff & Admins"
              value={String(overview.totalStaff)}
              trend={`${overview.totalHospitalAdmins} Hospital Admins`}
              trendDirection="up"
              icon={<UserCog className="w-4 h-4" />}
            />
            <StatCard
              label="Total Appointments"
              value={String(overview.totalAppointments)}
              trend={`${overview.completedAppointments} completed`}
              trendDirection="up"
              icon={<CalendarClock className="w-4 h-4" />}
            />
          </div>

          {/* Quick Actions + Hospital Overview Table */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card
              title="Super Admin Quick Governance"
              subtitle="Direct shortcuts to core platform operations"
              className="lg:col-span-1"
            >
              <div className="grid grid-cols-1 gap-2.5">
                <Button
                  variant="primary"
                  fullWidth
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={() => {
                    setEditingHospital(null);
                    setShowRegisterHospitalModal(true);
                    navigate('/super-admin/hospitals');
                  }}
                >
                  Register New Hospital Tenant
                </Button>
                <Button
                  variant="secondary"
                  fullWidth
                  leftIcon={<UserCog className="w-4 h-4" />}
                  onClick={() => navigate('/super-admin/administrators')}
                >
                  Assign Hospital Administrator
                </Button>
                <Button
                  variant="outline"
                  fullWidth
                  leftIcon={<Users className="w-4 h-4" />}
                  onClick={() => navigate('/super-admin/users')}
                >
                  Inspect Platform Users
                </Button>
                <Button
                  variant="outline"
                  fullWidth
                  leftIcon={<FileCheck2 className="w-4 h-4" />}
                  onClick={() => navigate('/super-admin/activity-logs')}
                >
                  View Security Audit Trail
                </Button>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-[#718096] dark:text-slate-400">
                Last synchronized: {formatDateTime(overview.lastUpdatedAt)}
              </div>
            </Card>

            <Card
              title="Recent Platform Audit Trail"
              subtitle="Latest administrative & security events from backend AuditLog"
              className="lg:col-span-2"
              headerRight={
                <Link to="/super-admin/activity-logs" className="text-xs font-semibold text-[#0866B2] hover:underline">
                  View All Logs
                </Link>
              }
            >
              {overview.recentAuditLogs.length === 0 ? (
                <EmptyState title="No recent audit logs" description="Administrative events will appear here." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-[#718096] dark:text-slate-400">
                        <th className="py-2 pr-3 font-semibold">Action</th>
                        <th className="py-2 px-3 font-semibold">Actor</th>
                        <th className="py-2 px-3 font-semibold">Entity</th>
                        <th className="py-2 pl-3 font-semibold text-right">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                      {overview.recentAuditLogs.slice(0, 6).map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 pr-3 font-mono font-semibold text-[#102F4D] dark:text-slate-100">
                            {log.action}
                          </td>
                          <td className="py-2.5 px-3 text-[#718096] dark:text-slate-300">
                            {log.actorName}
                          </td>
                          <td className="py-2.5 px-3 text-[#718096] dark:text-slate-400">
                            {log.entityType} {log.hospitalName ? `· ${log.hospitalName}` : ''}
                          </td>
                          <td className="py-2.5 pl-3 text-right text-[#718096] dark:text-slate-400">
                            {formatDateTime(log.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* ===================================================================
          SECTION 2: HOSPITALS MANAGEMENT
      =================================================================== */}
      {!loading && section === 'hospitals' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <Tabs
              tabs={[
                { id: 'tenants', label: `Registered Hospital Tenants (${hospitals.length})` },
                { id: 'directory', label: `Ranchi Hospital Directory (${directoryHospitals.length})` },
              ]}
              activeTab={hospitalsTab}
              onChange={(id) => setHospitalsTab(id as 'tenants' | 'directory')}
            />
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => {
                setEditingHospital(null);
                setHospitalForm({
                  name: '',
                  registrationNumber: `REG-JH-${Date.now().toString().slice(-4)}`,
                  category: 'Multi-Specialty Hospital',
                  address: '',
                  city: 'Ranchi',
                  state: 'Jharkhand',
                  contactEmail: '',
                  contactPhone: '',
                  totalBeds: '120',
                  availableBeds: '40',
                  departments: 'General Medicine, Cardiology, Orthopedics, Pediatrics, Emergency',
                });
                setShowRegisterHospitalModal(true);
              }}
            >
              Register New Hospital
            </Button>
          </div>

          <Card>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <div className="md:col-span-2">
                <TextInput
                  placeholder="Search hospital name, registration number, or city..."
                  value={hospitalSearch}
                  onChange={(e) => {
                    setHospitalSearch(e.target.value);
                    setHospitalPage(1);
                  }}
                  leftIcon={<Search className="w-4 h-4" />}
                />
              </div>
              {hospitalsTab === 'tenants' && (
                <SelectInput
                  value={hospitalStatusFilter}
                  onChange={(e) => {
                    setHospitalStatusFilter(e.target.value);
                    setHospitalPage(1);
                  }}
                  options={[
                    { value: 'ALL', label: 'All Statuses' },
                    { value: 'APPROVED', label: 'Approved / Active' },
                    { value: 'PENDING', label: 'Pending Approval' },
                    { value: 'SUSPENDED', label: 'Suspended' },
                    { value: 'REJECTED', label: 'Rejected' },
                  ]}
                />
              )}
            </div>

            {hospitalsTab === 'tenants' ? (
              hospitals.length === 0 ? (
                <EmptyState
                  title="No hospital tenants match your filter"
                  description="Register a new hospital tenant or verify a Ranchi Directory hospital."
                  actionLabel="Register Hospital"
                  onAction={() => setShowRegisterHospitalModal(true)}
                />
              ) : (
                <div className="space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-[#718096] dark:text-slate-400">
                          <th className="py-2.5 pr-3 font-semibold">Hospital Name &amp; Reg No.</th>
                          <th className="py-2.5 px-3 font-semibold">Category &amp; Location</th>
                          <th className="py-2.5 px-3 font-semibold">Contact Details</th>
                          <th className="py-2.5 px-3 font-semibold">Beds</th>
                          <th className="py-2.5 px-3 font-semibold">Status</th>
                          <th className="py-2.5 pl-3 font-semibold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                        {hospitals.map((h) => (
                          <tr key={h.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                            <td className="py-3 pr-3">
                              <div className="font-bold text-[#102F4D] dark:text-white">{h.name}</div>
                              <div className="text-[11px] text-[#718096] font-mono">
                                {h.registrationNumber} · Added {formatDate(h.createdAt)}
                              </div>
                            </td>
                            <td className="py-3 px-3 text-[#172B43] dark:text-slate-200">
                              <div>{h.category}</div>
                              <div className="text-[11px] text-[#718096]">
                                {h.city}, {h.state}
                              </div>
                            </td>
                            <td className="py-3 px-3 text-[#718096] dark:text-slate-300">
                              <div>{h.contactEmail}</div>
                              <div className="text-[11px]">{h.contactPhone}</div>
                            </td>
                            <td className="py-3 px-3 text-[#172B43] dark:text-slate-200">
                              {h.availableBeds} / {h.totalBeds}
                            </td>
                            <td className="py-3 px-3">
                              <StatusBadge
                                label={h.status}
                                variant={
                                  h.status === 'APPROVED' || h.status === 'ACTIVE'
                                    ? 'success'
                                    : h.status === 'PENDING'
                                    ? 'warning'
                                    : 'error'
                                }
                              />
                            </td>
                            <td className="py-3 pl-3 text-right">
                              <div className="inline-flex items-center gap-1.5 flex-wrap justify-end">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => navigate(`/super-admin/hospitals/${h.id}`)}
                                >
                                  Inspect
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingHospital(h);
                                    setHospitalForm({
                                      name: h.name,
                                      registrationNumber: h.registrationNumber,
                                      category: h.category,
                                      address: h.address,
                                      city: h.city,
                                      state: h.state,
                                      contactEmail: h.contactEmail,
                                      contactPhone: h.contactPhone,
                                      totalBeds: String(h.totalBeds),
                                      availableBeds: String(h.availableBeds),
                                      departments: (h.departments || []).join(', '),
                                    });
                                    setShowRegisterHospitalModal(true);
                                  }}
                                >
                                  Edit
                                </Button>
                                {h.status !== 'APPROVED' && (
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() =>
                                      setConfirmHospitalAction({
                                        hospital: h,
                                        action: 'APPROVE',
                                        reason: 'Verified hospital credentials',
                                      })
                                    }
                                  >
                                    Approve
                                  </Button>
                                )}
                                {h.status !== 'SUSPENDED' && (
                                  <Button
                                    size="sm"
                                    variant="danger"
                                    onClick={() =>
                                      setConfirmHospitalAction({
                                        hospital: h,
                                        action: 'SUSPEND',
                                        reason: 'Compliance review suspension',
                                      })
                                    }
                                  >
                                    Suspend
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Pagination
                    currentPage={hospitalPage}
                    totalPages={hospitalTotalPages}
                    onPageChange={setHospitalPage}
                  />
                </div>
              )
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-[#718096]">
                      <th className="py-2.5 pr-3 font-semibold">Code &amp; Hospital Name</th>
                      <th className="py-2.5 px-3 font-semibold">Type &amp; Ownership</th>
                      <th className="py-2.5 px-3 font-semibold">Address</th>
                      <th className="py-2.5 px-3 font-semibold">Verification Status</th>
                      <th className="py-2.5 pl-3 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                    {directoryHospitals.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 pr-3">
                          <div className="font-bold text-[#102F4D] dark:text-white">{d.name}</div>
                          <div className="text-[11px] font-mono text-[#718096]">{d.directoryCode}</div>
                        </td>
                        <td className="py-2.5 px-3 text-[#718096] dark:text-slate-300">
                          {d.facilityType} · {d.ownershipType}
                        </td>
                        <td className="py-2.5 px-3 text-[#718096] dark:text-slate-300">
                          {d.address}, {d.city} ({d.pincode})
                        </td>
                        <td className="py-2.5 px-3">
                          <StatusBadge
                            label={d.verificationStatus}
                            variant={d.verificationStatus === 'VERIFIED' ? 'success' : 'warning'}
                          />
                        </td>
                        <td className="py-2.5 pl-3 text-right">
                          {d.verificationStatus !== 'VERIFIED' ? (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={async () => {
                                await SuperAdminService.verifyDirectoryHospital(d.id, true);
                                showToast({
                                  title: 'Directory hospital verified',
                                  description: `${d.name} verified and activated as tenant.`,
                                  variant: 'success',
                                });
                                await loadSectionData();
                              }}
                            >
                              Verify &amp; Activate
                            </Button>
                          ) : (
                            <span className="text-[11px] text-[#16A36A] font-semibold">Verified Tenant</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ===================================================================
          SECTION 3: HOSPITAL DETAILS PAGE (/super-admin/hospitals/:id)
      =================================================================== */}
      {!loading && section === 'hospital-detail' && hospitalDetail && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
              onClick={() => navigate('/super-admin/hospitals')}
            >
              Back to Hospitals
            </Button>
            <div className="flex items-center gap-2">
              {hospitalDetail.hospital.status !== 'APPROVED' && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    setConfirmHospitalAction({
                      hospital: hospitalDetail.hospital,
                      action: 'APPROVE',
                      reason: 'Approved from Hospital Detail inspection',
                    })
                  }
                >
                  Approve Hospital
                </Button>
              )}
              {hospitalDetail.hospital.status !== 'SUSPENDED' && (
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() =>
                    setConfirmHospitalAction({
                      hospital: hospitalDetail.hospital,
                      action: 'SUSPEND',
                      reason: 'Suspended from Hospital Detail inspection',
                    })
                  }
                >
                  Suspend Hospital
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Hospital Status"
              value={hospitalDetail.hospital.status}
              trend={hospitalDetail.hospital.registrationNumber}
              trendDirection="up"
              icon={<Building2 className="w-4 h-4" />}
            />
            <StatCard
              label="Assigned Doctors"
              value={String(hospitalDetail.statistics.totalDoctors)}
              trend={`${hospitalDetail.statistics.totalStaff} total staff`}
              trendDirection="up"
              icon={<Stethoscope className="w-4 h-4" />}
            />
            <StatCard
              label="Registered Patients"
              value={String(hospitalDetail.statistics.totalPatients)}
              trend="Hospital-linked patients"
              trendDirection="up"
              icon={<Users className="w-4 h-4" />}
            />
            <StatCard
              label="Appointments"
              value={String(hospitalDetail.statistics.totalAppointments)}
              trend={`${hospitalDetail.statistics.completedAppointments} completed`}
              trendDirection="up"
              icon={<CalendarClock className="w-4 h-4" />}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Hospital Profile & Contact Information">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <dt className="text-[#718096]">Hospital Name</dt>
                  <dd className="font-bold text-[#102F4D] dark:text-white mt-0.5">
                    {hospitalDetail.hospital.name}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#718096]">Registration Number</dt>
                  <dd className="font-mono font-semibold text-[#102F4D] dark:text-white mt-0.5">
                    {hospitalDetail.hospital.registrationNumber}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#718096]">Category</dt>
                  <dd className="font-semibold text-[#172B43] dark:text-slate-200 mt-0.5">
                    {hospitalDetail.hospital.category}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#718096]">Bed Capacity</dt>
                  <dd className="font-semibold text-[#172B43] dark:text-slate-200 mt-0.5">
                    {hospitalDetail.hospital.availableBeds} available / {hospitalDetail.hospital.totalBeds} total
                  </dd>
                </div>
                <div>
                  <dt className="text-[#718096]">Contact Email &amp; Phone</dt>
                  <dd className="text-[#172B43] dark:text-slate-200 mt-0.5">
                    {hospitalDetail.hospital.contactEmail} · {hospitalDetail.hospital.contactPhone}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#718096]">Location</dt>
                  <dd className="text-[#172B43] dark:text-slate-200 mt-0.5">
                    {hospitalDetail.hospital.address}, {hospitalDetail.hospital.city}, {hospitalDetail.hospital.state}
                  </dd>
                </div>
              </dl>
            </Card>

            <Card title={`Assigned Hospital Administrators (${hospitalDetail.administrators.length})`}>
              {hospitalDetail.administrators.length === 0 ? (
                <EmptyState
                  title="No administrator assigned"
                  description="Assign a HOSPITAL_ADMIN user to manage this hospital."
                  actionLabel="Assign Administrator"
                  onAction={() => navigate('/super-admin/administrators')}
                />
              ) : (
                <div className="space-y-2.5 text-xs">
                  {hospitalDetail.administrators.map((adm) => (
                    <div
                      key={adm.userId}
                      className="p-3 rounded-xl bg-[#F4F7FB] dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-bold text-[#102F4D] dark:text-white">{adm.fullName}</p>
                        <p className="text-[#718096]">
                          {adm.email} {adm.phone ? `· ${adm.phone}` : ''}
                        </p>
                      </div>
                      <StatusBadge
                        label={adm.isActive ? 'ACTIVE' : 'INACTIVE'}
                        variant={adm.isActive ? 'success' : 'error'}
                      />
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* ===================================================================
          SECTION 4: HOSPITAL ADMINISTRATOR MANAGEMENT
      =================================================================== */}
      {!loading && section === 'administrators' && (
        <div className="space-y-5">
          <Card
            title="Hospital Administrators"
            subtitle="Manage HOSPITAL_ADMIN accounts and their assigned hospital tenants"
            headerRight={
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => setShowCreateAdminModal(true)}
              >
                Create / Assign Administrator
              </Button>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <div className="md:col-span-2">
                <TextInput
                  placeholder="Search administrator name, email, phone, or hospital..."
                  value={adminSearch}
                  onChange={(e) => setAdminSearch(e.target.value)}
                  leftIcon={<Search className="w-4 h-4" />}
                />
              </div>
              <SelectInput
                value={adminStatusFilter}
                onChange={(e) => setAdminStatusFilter(e.target.value)}
                options={[
                  { value: 'ALL', label: 'All Statuses' },
                  { value: 'ACTIVE', label: 'Active' },
                  { value: 'INACTIVE', label: 'Inactive' },
                ]}
              />
            </div>

            {administrators.length === 0 ? (
              <EmptyState
                title="No hospital administrators found"
                description="Create and assign a hospital administrator to an active or pending hospital."
                actionLabel="Create Administrator"
                onAction={() => setShowCreateAdminModal(true)}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-[#718096]">
                      <th className="py-2.5 pr-3 font-semibold">Administrator</th>
                      <th className="py-2.5 px-3 font-semibold">Contact</th>
                      <th className="py-2.5 px-3 font-semibold">Assigned Hospital</th>
                      <th className="py-2.5 px-3 font-semibold">Assigned Date</th>
                      <th className="py-2.5 px-3 font-semibold">Status</th>
                      <th className="py-2.5 pl-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                    {administrators.map((adm) => (
                      <tr key={adm.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                        <td className="py-3 pr-3 font-bold text-[#102F4D] dark:text-white">
                          {adm.fullName}
                        </td>
                        <td className="py-3 px-3 text-[#718096] dark:text-slate-300">
                          <div>{adm.email}</div>
                          <div className="text-[11px]">{adm.phone || 'No phone'}</div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-semibold text-[#172B43] dark:text-slate-200">
                            {adm.hospitalName}
                          </span>
                          <span className="ml-2 text-[11px] text-[#718096]">({adm.hospitalStatus})</span>
                        </td>
                        <td className="py-3 px-3 text-[#718096]">{formatDate(adm.assignedAt)}</td>
                        <td className="py-3 px-3">
                          <StatusBadge
                            label={adm.isActive ? 'ACTIVE' : 'INACTIVE'}
                            variant={adm.isActive ? 'success' : 'error'}
                          />
                        </td>
                        <td className="py-3 pl-3 text-right">
                          <Button
                            size="sm"
                            variant={adm.isActive ? 'danger' : 'secondary'}
                            onClick={() => setConfirmAdminToggle(adm)}
                          >
                            {adm.isActive ? 'Deactivate' : 'Activate'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ===================================================================
          SECTION 5: PLATFORM USER MANAGEMENT
      =================================================================== */}
      {!loading && section === 'users' && (
        <Card
          title="Platform User Directory"
          subtitle="Search and filter all registered platform accounts across roles and hospitals"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <TextInput
              placeholder="Search by full name, email, or phone..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
            <SelectInput
              value={userRoleFilter}
              onChange={(e) => setUserRoleFilter(e.target.value)}
              options={[
                { value: 'ALL', label: 'All Roles' },
                { value: 'SUPER_ADMIN', label: 'SUPER_ADMIN' },
                { value: 'HOSPITAL_ADMIN', label: 'HOSPITAL_ADMIN' },
                { value: 'DOCTOR', label: 'DOCTOR' },
                { value: 'NURSE', label: 'NURSE' },
                { value: 'RECEPTIONIST', label: 'RECEPTIONIST' },
                { value: 'PHARMACIST', label: 'PHARMACIST' },
                { value: 'LAB_TECHNICIAN', label: 'LAB_TECHNICIAN' },
                { value: 'ACCOUNTANT', label: 'ACCOUNTANT' },
                { value: 'PATIENT', label: 'PATIENT' },
              ]}
            />
            <SelectInput
              value={userStatusFilter}
              onChange={(e) => setUserStatusFilter(e.target.value)}
              options={[
                { value: 'ALL', label: 'All Account Statuses' },
                { value: 'ACTIVE', label: 'Active Accounts' },
                { value: 'INACTIVE', label: 'Deactivated Accounts' },
              ]}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[#718096]">
                  <th className="py-2.5 pr-3 font-semibold">User</th>
                  <th className="py-2.5 px-3 font-semibold">Roles</th>
                  <th className="py-2.5 px-3 font-semibold">Hospital Memberships</th>
                  <th className="py-2.5 px-3 font-semibold">Status</th>
                  <th className="py-2.5 pl-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                {platformUsers
                  .filter((u) => {
                    const allRoles = [
                      ...(u.globalRoles || []),
                      ...(u.activeRoles || []),
                      ...(u.memberships?.flatMap((m) => m.roles) || []),
                    ];
                    if (userRoleFilter !== 'ALL' && !allRoles.includes(userRoleFilter as any)) {
                      return false;
                    }
                    if (userStatusFilter === 'ACTIVE' && !u.isActive) return false;
                    if (userStatusFilter === 'INACTIVE' && u.isActive) return false;
                    return true;
                  })
                  .map((u) => {
                    const rolesList = Array.from(
                      new Set([
                        ...(u.globalRoles || []),
                        ...(u.activeRoles || []),
                        ...(u.memberships?.flatMap((m) => m.roles) || []),
                      ])
                    );
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                        <td className="py-3 pr-3">
                          <div className="font-bold text-[#102F4D] dark:text-white">{u.fullName}</div>
                          <div className="text-[11px] text-[#718096]">
                            {u.email} {u.phone ? `· ${u.phone}` : ''}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-[#0866B2] dark:text-sky-400">
                          {rolesList.join(' · ') || 'USER'}
                        </td>
                        <td className="py-3 px-3 text-[#718096] dark:text-slate-300">
                          {u.memberships?.length
                            ? u.memberships.map((m) => m.hospitalName).join(', ')
                            : 'Global / None'}
                        </td>
                        <td className="py-3 px-3">
                          <StatusBadge
                            label={u.isActive ? 'ACTIVE' : 'INACTIVE'}
                            variant={u.isActive ? 'success' : 'error'}
                          />
                        </td>
                        <td className="py-3 pl-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <Button size="sm" variant="outline" onClick={() => setSelectedUserModal(u)}>
                              Details
                            </Button>
                            {!u.globalRoles?.includes('SUPER_ADMIN') && (
                              <Button
                                size="sm"
                                variant={u.isActive ? 'danger' : 'secondary'}
                                onClick={() => void handleToggleUserStatus(u)}
                              >
                                {u.isActive ? 'Deactivate' : 'Activate'}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ===================================================================
          SECTION 6: PLATFORM ANALYTICS
      =================================================================== */}
      {!loading && section === 'analytics' && analyticsData && (
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-xs text-[#718096]">
              Window: {formatDate(analyticsData.windowStart)} – {formatDate(analyticsData.windowEnd)}
            </p>
            <div className="inline-flex rounded-lg bg-white dark:bg-slate-900 p-1 border border-slate-200 dark:border-slate-800">
              {(['7d', '30d', '90d', '12m'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setAnalyticsRange(r)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                    analyticsRange === r
                      ? 'bg-[#0866B2] text-white'
                      : 'text-[#718096] hover:text-[#102F4D]'
                  }`}
                >
                  {r.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Hospitals Registered in Window"
              value={String(analyticsData.summary.hospitalsRegisteredInRange)}
              trend={`${analyticsData.summary.totalHospitals} total`}
              trendDirection="up"
              icon={<Building2 className="w-4 h-4" />}
            />
            <StatCard
              label="Users Registered in Window"
              value={String(analyticsData.summary.usersRegisteredInRange)}
              trend={`${analyticsData.summary.totalUsers} total`}
              trendDirection="up"
              icon={<Users className="w-4 h-4" />}
            />
            <StatCard
              label="Total Registered Patients"
              value={String(analyticsData.summary.totalPatients)}
              trend="Platform-wide"
              trendDirection="up"
              icon={<UserCheck className="w-4 h-4" />}
            />
            <StatCard
              label="Audit Events in Window"
              value={String(analyticsData.summary.totalAuditEvents)}
              trend="Logged actions"
              trendDirection="up"
              icon={<Activity className="w-4 h-4" />}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Platform User Distribution by Role">
              <div className="space-y-3">
                {analyticsData.roleDistribution.map((item) => (
                  <div key={item.role} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-mono font-semibold text-[#102F4D] dark:text-white">
                        {item.role}
                      </span>
                      <span className="font-bold text-[#0866B2]">{item.count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-[#0866B2] rounded-full"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(8, (item.count / Math.max(1, analyticsData.summary.totalUsers)) * 100)
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Hospital Activity Distribution">
              {analyticsData.hospitalActivityDistribution.length === 0 ? (
                <EmptyState title="No hospitals registered yet" description="Register a hospital to view activity distribution." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-[#718096]">
                        <th className="py-2 pr-2 font-semibold">Hospital</th>
                        <th className="py-2 px-2 font-semibold">Status</th>
                        <th className="py-2 px-2 font-semibold text-right">Staff</th>
                        <th className="py-2 px-2 font-semibold text-right">Patients</th>
                        <th className="py-2 pl-2 font-semibold text-right">Appointments</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                      {analyticsData.hospitalActivityDistribution.map((h) => (
                        <tr key={h.hospitalId}>
                          <td className="py-2 pr-2 font-semibold text-[#102F4D] dark:text-white">
                            {h.hospitalName}
                          </td>
                          <td className="py-2 px-2 text-[#718096]">{h.status}</td>
                          <td className="py-2 px-2 text-right">{h.staffCount}</td>
                          <td className="py-2 px-2 text-right">{h.patientsCount}</td>
                          <td className="py-2 pl-2 text-right font-semibold">{h.appointmentsCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* ===================================================================
          SECTION 7: ACTIVITY LOGS & AUDIT TRAIL
      =================================================================== */}
      {!loading && section === 'activity-logs' && (
        <Card
          title="Platform Activity & Security Audit Logs"
          subtitle="Real backend AuditLog entries with automatic redaction of tokens and credentials"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div className="md:col-span-2">
              <TextInput
                placeholder="Search action, actor name, email, or hospital..."
                value={auditSearch}
                onChange={(e) => {
                  setAuditSearch(e.target.value);
                  setAuditPage(1);
                }}
                leftIcon={<Search className="w-4 h-4" />}
              />
            </div>
            <SelectInput
              value={auditEntityFilter}
              onChange={(e) => {
                setAuditEntityFilter(e.target.value);
                setAuditPage(1);
              }}
              options={[
                { value: 'ALL', label: 'All Entity Types' },
                { value: 'HOSPITAL', label: 'HOSPITAL' },
                { value: 'USER', label: 'USER' },
                { value: 'PATIENT', label: 'PATIENT' },
                { value: 'APPOINTMENT', label: 'APPOINTMENT' },
                { value: 'SYSTEM_SETTINGS', label: 'SYSTEM_SETTINGS' },
              ]}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[#718096]">
                  <th className="py-2.5 pr-3 font-semibold">Action</th>
                  <th className="py-2.5 px-3 font-semibold">Actor</th>
                  <th className="py-2.5 px-3 font-semibold">Target Entity</th>
                  <th className="py-2.5 px-3 font-semibold">Sanitized Details</th>
                  <th className="py-2.5 pl-3 font-semibold text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 pr-3 font-mono font-bold text-[#102F4D] dark:text-white">
                      {log.action}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-[#172B43] dark:text-slate-200">{log.actorName}</div>
                      <div className="text-[11px] text-[#718096]">{log.actorEmail || 'System'}</div>
                    </td>
                    <td className="py-2.5 px-3 text-[#718096] dark:text-slate-300">
                      {log.entityType} {log.hospitalName ? `· ${log.hospitalName}` : ''}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-[#718096] max-w-xs truncate">
                      {log.metadata ? JSON.stringify(log.metadata) : '—'}
                    </td>
                    <td className="py-2.5 pl-3 text-right text-[#718096]">
                      {formatDateTime(log.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4">
            <Pagination
              currentPage={auditPage}
              totalPages={auditTotalPages}
              onPageChange={setAuditPage}
            />
          </div>
        </Card>
      )}

      {/* ===================================================================
          SECTION 8: PLATFORM NOTIFICATIONS & ANNOUNCEMENTS
      =================================================================== */}
      {!loading && section === 'notifications' && announcementsData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card title="Publish Platform Announcement" className="lg:col-span-1">
            <form onSubmit={handlePublishAnnouncement} className="space-y-3">
              <TextInput
                label="Announcement Title"
                placeholder="e.g. Scheduled Maintenance Window"
                value={announcementForm.title}
                onChange={(e) => setAnnouncementForm((prev) => ({ ...prev, title: e.target.value }))}
                required
              />
              <SelectInput
                label="Category"
                value={announcementForm.category}
                onChange={(e) => setAnnouncementForm((prev) => ({ ...prev, category: e.target.value }))}
                options={[
                  { value: 'OPERATIONS_NOTICE', label: 'Operations Notice' },
                  { value: 'SECURITY_ADVISORY', label: 'Security Advisory' },
                  { value: 'FEATURE_RELEASE', label: 'Feature Release' },
                  { value: 'MAINTENANCE', label: 'Scheduled Maintenance' },
                ]}
              />
              <SelectInput
                label="Target Audience"
                value={announcementForm.targetScope}
                onChange={(e) => setAnnouncementForm((prev) => ({ ...prev, targetScope: e.target.value }))}
                options={[
                  { value: 'ALL_TENANTS', label: 'All Hospital Tenants' },
                  { value: 'ENTERPRISE_ONLY', label: 'Enterprise Tier Hospitals' },
                ]}
              />
              <TextareaInput
                label="Message Body"
                placeholder="Enter official announcement details..."
                value={announcementForm.body}
                onChange={(e) => setAnnouncementForm((prev) => ({ ...prev, body: e.target.value }))}
                rows={4}
                required
              />
              <Button type="submit" variant="primary" fullWidth loading={submitting}>
                Publish Announcement
              </Button>
            </form>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-[#718096] space-y-1">
              <p>
                <strong>In-App Outbox:</strong> {announcementsData.deliveryCapabilities.inAppNotificationStore}
              </p>
              <p>
                <strong>Email Gateway:</strong> {announcementsData.deliveryCapabilities.emailProvider}
              </p>
            </div>
          </Card>

          <Card title="Published Announcements & System Alerts" className="lg:col-span-2">
            {announcementsData.announcements.length === 0 ? (
              <EmptyState title="No platform announcements" description="Publish an announcement to notify hospital administrators." />
            ) : (
              <div className="space-y-3">
                {announcementsData.announcements.map((a) => (
                  <div
                    key={a.id}
                    className="p-4 rounded-xl bg-[#F4F7FB] dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-bold text-[#102F4D] dark:text-white">{a.title}</h4>
                      <span className="text-[11px] text-[#718096] font-mono">
                        {a.category} · {a.targetScope}
                      </span>
                    </div>
                    <p className="text-xs text-[#172B43] dark:text-slate-300 leading-relaxed">{a.body}</p>
                    <p className="text-[11px] text-[#718096]">Published {formatDateTime(a.publishedAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ===================================================================
          SECTION 9: SYSTEM SETTINGS
      =================================================================== */}
      {!loading && section === 'settings' && settingsData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card title="Platform Governance & Branding Preferences" className="lg:col-span-2">
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextInput
                  label="Platform Name"
                  value={settingsForm.platformName}
                  onChange={(e) => setSettingsForm((prev) => ({ ...prev, platformName: e.target.value }))}
                  required
                />
                <TextInput
                  label="Organization Name"
                  value={settingsForm.organizationName}
                  onChange={(e) => setSettingsForm((prev) => ({ ...prev, organizationName: e.target.value }))}
                  required
                />
                <TextInput
                  label="Platform Support Email"
                  type="email"
                  value={settingsForm.supportEmail}
                  onChange={(e) => setSettingsForm((prev) => ({ ...prev, supportEmail: e.target.value }))}
                  required
                />
                <TextInput
                  label="Security Incident Contact Email"
                  type="email"
                  value={settingsForm.securityContactEmail}
                  onChange={(e) =>
                    setSettingsForm((prev) => ({ ...prev, securityContactEmail: e.target.value }))
                  }
                  required
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" variant="primary" loading={submitting}>
                  Save Platform Settings
                </Button>
              </div>
            </form>
          </Card>

          <Card title="System Environment Status" className="lg:col-span-1">
            <dl className="space-y-3 text-xs">
              <div>
                <dt className="text-[#718096]">Runtime Environment</dt>
                <dd className="font-mono font-bold text-[#102F4D] dark:text-white mt-0.5">
                  {settingsData.systemStatus.environment}
                </dd>
              </div>
              <div>
                <dt className="text-[#718096]">Database Engine</dt>
                <dd className="font-mono font-semibold text-[#16A36A] mt-0.5">
                  {settingsData.systemStatus.databaseAdapter}
                </dd>
              </div>
              <div>
                <dt className="text-[#718096]">Ranchi Directory Dataset</dt>
                <dd className="font-bold text-[#102F4D] dark:text-white mt-0.5">
                  {settingsData.systemStatus.directoryDatasetCount} verified records loaded
                </dd>
              </div>
              <div>
                <dt className="text-[#718096]">Total API Requests Processed</dt>
                <dd className="font-mono text-[#172B43] dark:text-slate-200 mt-0.5">
                  {settingsData.systemStatus.totalApiRequests}
                </dd>
              </div>
            </dl>
          </Card>
        </div>
      )}

      {/* Register / Edit Hospital Modal */}
      <Modal
        isOpen={showRegisterHospitalModal}
        onClose={() => {
          setShowRegisterHospitalModal(false);
          setEditingHospital(null);
        }}
        title={editingHospital ? `Edit Hospital: ${editingHospital.name}` : 'Register New Hospital Tenant'}
      >
        <form onSubmit={handleSaveHospital} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TextInput
              label="Hospital Name"
              value={hospitalForm.name}
              onChange={(e) => setHospitalForm((p) => ({ ...p, name: e.target.value }))}
              required
            />
            <TextInput
              label="Registration Number"
              value={hospitalForm.registrationNumber}
              onChange={(e) => setHospitalForm((p) => ({ ...p, registrationNumber: e.target.value }))}
              disabled={Boolean(editingHospital)}
              required
            />
            <TextInput
              label="Category"
              value={hospitalForm.category}
              onChange={(e) => setHospitalForm((p) => ({ ...p, category: e.target.value }))}
              required
            />
            <TextInput
              label="Contact Email"
              type="email"
              value={hospitalForm.contactEmail}
              onChange={(e) => setHospitalForm((p) => ({ ...p, contactEmail: e.target.value }))}
              required
            />
            <TextInput
              label="Contact Phone"
              value={hospitalForm.contactPhone}
              onChange={(e) => setHospitalForm((p) => ({ ...p, contactPhone: e.target.value }))}
              required
            />
            <TextInput
              label="City"
              value={hospitalForm.city}
              onChange={(e) => setHospitalForm((p) => ({ ...p, city: e.target.value }))}
              required
            />
            <TextInput
              label="State"
              value={hospitalForm.state}
              onChange={(e) => setHospitalForm((p) => ({ ...p, state: e.target.value }))}
              required
            />
            <TextInput
              label="Total Beds"
              type="number"
              value={hospitalForm.totalBeds}
              onChange={(e) => setHospitalForm((p) => ({ ...p, totalBeds: e.target.value }))}
              required
            />
          </div>
          <TextInput
            label="Street Address"
            value={hospitalForm.address}
            onChange={(e) => setHospitalForm((p) => ({ ...p, address: e.target.value }))}
            required
          />
          <TextInput
            label="Departments (comma-separated)"
            value={hospitalForm.departments}
            onChange={(e) => setHospitalForm((p) => ({ ...p, departments: e.target.value }))}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowRegisterHospitalModal(false);
                setEditingHospital(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              {editingHospital ? 'Save Changes' : 'Register Hospital'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Create Hospital Administrator Modal */}
      <Modal
        isOpen={showCreateAdminModal}
        onClose={() => setShowCreateAdminModal(false)}
        title="Create & Assign Hospital Administrator"
      >
        <form onSubmit={handleCreateAdmin} className="space-y-3">
          <TextInput
            label="Full Name"
            placeholder="Dr. / Mr. / Ms. Full Name"
            value={adminForm.fullName}
            onChange={(e) => setAdminForm((p) => ({ ...p, fullName: e.target.value }))}
            required
          />
          <TextInput
            label="Email Address"
            type="email"
            placeholder="admin@hospital.org"
            value={adminForm.email}
            onChange={(e) => setAdminForm((p) => ({ ...p, email: e.target.value }))}
            required
          />
          <TextInput
            label="Phone Number"
            placeholder="+919876543210"
            value={adminForm.phone}
            onChange={(e) => setAdminForm((p) => ({ ...p, phone: e.target.value }))}
          />
          <TextInput
            label="Initial Password"
            type="password"
            placeholder="Minimum 8 characters"
            value={adminForm.password}
            onChange={(e) => setAdminForm((p) => ({ ...p, password: e.target.value }))}
            required
          />
          <SelectInput
            label="Target Hospital"
            value={adminForm.hospitalId}
            onChange={(e) => setAdminForm((p) => ({ ...p, hospitalId: e.target.value }))}
            options={hospitals.map((h) => ({
              value: h.id,
              label: `${h.name} (${h.registrationNumber})`,
            }))}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowCreateAdminModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              Assign Administrator
            </Button>
          </div>
        </form>
      </Modal>

      {/* User Details Modal */}
      <Modal
        isOpen={Boolean(selectedUserModal)}
        onClose={() => setSelectedUserModal(null)}
        title={selectedUserModal ? `User Profile: ${selectedUserModal.fullName}` : 'User Profile'}
      >
        {selectedUserModal && (
          <div className="space-y-3 text-xs">
            <p>
              <strong>Email:</strong> {selectedUserModal.email}
            </p>
            <p>
              <strong>Phone:</strong> {selectedUserModal.phone || 'Not provided'}
            </p>
            <p>
              <strong>Global Roles:</strong> {selectedUserModal.globalRoles?.join(', ') || 'None'}
            </p>
            <p>
              <strong>Active Hospital Roles:</strong> {selectedUserModal.activeRoles?.join(', ') || 'None'}
            </p>
            <div>
              <strong>Hospital Memberships ({selectedUserModal.memberships?.length || 0}):</strong>
              <ul className="mt-1 space-y-1 pl-4 list-disc">
                {selectedUserModal.memberships?.map((m) => (
                  <li key={m.id}>
                    {m.hospitalName} — {m.roles.join(', ')} ({m.status})
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirmation Dialogs */}
      <ConfirmationDialog
        isOpen={Boolean(confirmHospitalAction)}
        onClose={() => setConfirmHospitalAction(null)}
        onConfirm={() => void handleConfirmHospitalStatusAction()}
        title={
          confirmHospitalAction
            ? `${confirmHospitalAction.action} Hospital: ${confirmHospitalAction.hospital.name}`
            : 'Confirm Action'
        }
        description={
          confirmHospitalAction
            ? `Are you sure you want to ${confirmHospitalAction.action.toLowerCase()} ${
                confirmHospitalAction.hospital.name
              }? This action is immediately enforced and recorded in the platform audit log.`
            : ''
        }
        confirmLabel={confirmHospitalAction ? confirmHospitalAction.action : 'Confirm'}
        variant={confirmHospitalAction?.action === 'APPROVE' ? 'primary' : 'danger'}
      />

      <ConfirmationDialog
        isOpen={Boolean(confirmAdminToggle)}
        onClose={() => setConfirmAdminToggle(null)}
        onConfirm={() => void handleToggleAdminStatus()}
        title={
          confirmAdminToggle
            ? `${confirmAdminToggle.isActive ? 'Deactivate' : 'Activate'} Administrator`
            : 'Confirm'
        }
        description={
          confirmAdminToggle
            ? `Are you sure you want to ${
                confirmAdminToggle.isActive ? 'deactivate' : 'activate'
              } ${confirmAdminToggle.fullName}'s administrator account?`
            : ''
        }
        confirmLabel={confirmAdminToggle?.isActive ? 'Deactivate' : 'Activate'}
        variant={confirmAdminToggle?.isActive ? 'danger' : 'primary'}
      />
    </ApplicationShell>
  );
};
