import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  BarChart3,
  Building2,
  CalendarClock,
  CheckCircle2,
  RefreshCw,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  UserCog,
  Users,
} from 'lucide-react';
import { useAuth, useRole } from '../context/AuthContext';
import { apiRequest, ApiClientError } from '../services/api';
import { HospitalAdminService, HospitalOverviewData } from '../services/hospitalAdminService';
import { ROLE_META, RoleCodeType } from '../types/auth';
import { ApplicationShell } from '../layouts/ApplicationShell';
import { Button } from '../components/ui/Button';
import {
  Card,
  EmptyState,
  ErrorState,
  SkeletonCard,
  StatCard,
} from '../components/ui/FeedbackAndData';
import { formatDateTime } from '../utils/format';

export const RoleDashboardPage: React.FC<{ dashboardRole?: RoleCodeType }> = ({
  dashboardRole,
}) => {
  const navigate = useNavigate();
  const { user, activeHospital } = useAuth();
  const { role } = useRole();

  const effectiveRole = dashboardRole || role || 'DOCTOR';
  const roleInfo = ROLE_META[effectiveRole] || ROLE_META.DOCTOR;

  const [overview, setOverview] = useState<HospitalOverviewData | null>(null);
  const [directoryCount, setDirectoryCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const readyPromise = apiRequest<{ directoryRecordsLoaded?: number }>('/health/ready', {
        skipAuth: true,
      }).catch(() => null);

      const overviewPromise = activeHospital
        ? HospitalAdminService.getOverview().catch((err) => {
            if (err instanceof ApiClientError && err.status === 400) {
              return null;
            }
            throw err;
          })
        : Promise.resolve(null);

      const [readyRes, overviewData] = await Promise.all([readyPromise, overviewPromise]);
      setDirectoryCount(readyRes?.directoryRecordsLoaded ?? null);
      setOverview(overviewData);
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'Unable to load hospital workspace overview right now.'
      );
    } finally {
      setLoading(false);
    }
  }, [activeHospital]);

  useEffect(() => {
    void loadDashboardData();
  }, [loadDashboardData]);

  const roleQuickActions: Array<{
    label: string;
    path: string;
    icon: React.FC<{ className?: string }>;
    roles: RoleCodeType[];
  }> = [
    {
      label: 'Appointments & Queue',
      path: '/appointments',
      icon: CalendarClock,
      roles: ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'],
    },
    {
      label: 'Doctors & Schedules',
      path: '/doctors',
      icon: Stethoscope,
      roles: ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'],
    },
    {
      label: 'Hospital Departments',
      path: '/departments',
      icon: Building2,
      roles: ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'],
    },
    {
      label: 'Staff Management',
      path: '/staff-management',
      icon: UserCog,
      roles: ['SUPER_ADMIN', 'HOSPITAL_ADMIN'],
    },
    {
      label: 'Reports & Analytics',
      path: '/reports-analytics',
      icon: BarChart3,
      roles: ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'ACCOUNTANT'],
    },
    {
      label: 'Account & Security Settings',
      path: '/settings',
      icon: Settings,
      roles: [
        'SUPER_ADMIN',
        'HOSPITAL_ADMIN',
        'DOCTOR',
        'NURSE',
        'RECEPTIONIST',
        'PHARMACIST',
        'LAB_TECHNICIAN',
        'ACCOUNTANT',
      ],
    },
  ];

  const visibleQuickActions = roleQuickActions.filter(
    (action) => effectiveRole === 'SUPER_ADMIN' || action.roles.includes(effectiveRole)
  );

  const maxDeptAppointments = Math.max(
    1,
    ...(overview?.departmentPerformance.map((d) => d.appointmentsCount) || [1])
  );

  return (
    <ApplicationShell
      pageTitle={`${roleInfo.label} Dashboard`}
      pageSubtitle={
        activeHospital
          ? `${activeHospital.hospitalName} · ${roleInfo.description}`
          : roleInfo.description
      }
      breadcrumbs={[
        { label: 'MediCore', path: roleInfo.dashboardPath },
        { label: `${roleInfo.label} Workspace` },
      ]}
      headerActions={
        <Button
          variant="outline"
          size="sm"
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          onClick={() => void loadDashboardData()}
        >
          Refresh
        </Button>
      }
    >
      {/* Privileged Role MFA Enrollment Prompt */}
      {(effectiveRole === 'SUPER_ADMIN' ||
        effectiveRole === 'HOSPITAL_ADMIN' ||
        effectiveRole === 'DOCTOR') && (
        <div
          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border px-4 py-3.5 text-xs ${
            user?.mfaEnabled
              ? 'border-[#16A36A]/30 bg-[#16A36A]/5'
              : 'border-[#E9A23B]/40 bg-[#E9A23B]/10'
          }`}
        >
          <div className="flex items-start sm:items-center gap-3">
            {user?.mfaEnabled ? (
              <ShieldCheck className="w-5 h-5 text-[#16A36A] shrink-0" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-[#E9A23B] shrink-0" />
            )}
            <div>
              <p className="font-bold text-[#102F4D] dark:text-white">
                {user?.mfaEnabled
                  ? 'Two-Factor Authentication is active'
                  : `Two-Factor Authentication recommended for ${roleInfo.label}`}
              </p>
              <p className="text-[11px] text-[#718096] dark:text-slate-300 mt-0.5">
                {user?.mfaEnabled
                  ? 'Your clinical account requires a 6-digit authenticator code on sign-in.'
                  : 'Protect administrative and clinical records with authenticator-based two-factor verification.'}
              </p>
            </div>
          </div>
          <Link to="/settings" className="shrink-0">
            <Button variant={user?.mfaEnabled ? 'outline' : 'primary'} size="sm">
              {user?.mfaEnabled ? 'Manage Security' : 'Enable 2FA'}
            </Button>
          </Link>
        </div>
      )}

      {error && (
        <ErrorState
          title="Unable to load hospital metrics"
          message={error}
          onRetry={() => void loadDashboardData()}
        />
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : overview ? (
        <div className="space-y-6">
          {/* Live Hospital KPI Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Registered Patients"
              value={String(overview.statistics.totalPatients)}
              trend={`${overview.statistics.totalDepartments} departments`}
              trendDirection="up"
              icon={<Users className="w-4 h-4" />}
            />
            <StatCard
              label="Attending Doctors"
              value={String(overview.statistics.totalDoctors)}
              trend={`${overview.statistics.totalStaff} total staff`}
              trendDirection="neutral"
              icon={<Stethoscope className="w-4 h-4" />}
            />
            <StatCard
              label="Today's Appointments"
              value={String(overview.statistics.todayAppointments)}
              trend={`${overview.statistics.pendingAppointments} pending`}
              trendDirection="up"
              icon={<CalendarClock className="w-4 h-4" />}
            />
            <StatCard
              label="Completed Consultations"
              value={String(overview.statistics.completedConsultations)}
              trend={`${overview.statistics.cancelledAppointments} cancelled`}
              trendDirection="up"
              icon={<CheckCircle2 className="w-4 h-4" />}
            />
          </div>

          {/* Primary Operational Row: Recent Appointments & Quick Navigation */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card
                title="Hospital Appointments Queue"
                subtitle="Live OPD bookings and check-ins for your hospital"
                headerRight={
                  <Link
                    to="/appointments"
                    className="text-xs font-semibold text-[#0866B2] hover:underline"
                  >
                    Open scheduler
                  </Link>
                }
              >
                {overview.recentAppointments.length === 0 ? (
                  <EmptyState
                    title="No scheduled appointments yet"
                    description="New OPD bookings for this hospital will appear here in real time."
                    actionLabel="Open Appointments"
                    onAction={() => navigate('/appointments')}
                  />
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {overview.recentAppointments.slice(0, 6).map((apt) => (
                      <div
                        key={apt.id}
                        className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#172B43] dark:text-slate-100 truncate">
                            {apt.patientName || 'Registered Patient'}
                          </p>
                          <p className="text-[11px] text-[#718096] dark:text-slate-400 truncate">
                            {apt.doctorName || 'Attending Physician'} ·{' '}
                            {apt.departmentName || apt.doctorSpecialization || 'OPD'}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-mono font-semibold text-[#172B43] dark:text-slate-200">
                            {apt.appointmentDate} · {apt.slotStartTime}
                          </p>
                          <p className="text-[11px] font-medium text-[#0866B2] dark:text-[#11A6A0]">
                            {apt.status.replace(/_/g, ' ')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            <Card title="Quick Actions" subtitle="Authorized workflows for your role">
              <div className="grid grid-cols-1 gap-2">
                {visibleQuickActions.map((act) => {
                  const Icon = act.icon;
                  return (
                    <Button
                      key={act.path}
                      variant="outline"
                      size="sm"
                      fullWidth
                      leftIcon={<Icon className="w-3.5 h-3.5" />}
                      onClick={() => navigate(act.path)}
                      className="justify-start"
                    >
                      {act.label}
                    </Button>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Secondary Row: Department Workload & Recent Audit Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card
              title="Departmental Workload"
              subtitle="Live doctor staffing and appointment counts per department"
            >
              {overview.departmentPerformance.length === 0 ? (
                <p className="text-xs text-[#718096] dark:text-slate-400 py-4">
                  No clinical departments configured for this hospital yet.
                </p>
              ) : (
                <div className="space-y-3.5">
                  {overview.departmentPerformance.map((dept) => {
                    const widthPct = Math.max(
                      6,
                      Math.round((dept.appointmentsCount / maxDeptAppointments) * 100)
                    );
                    return (
                      <div key={dept.departmentId} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-[#172B43] dark:text-slate-200">
                            {dept.departmentName}
                          </span>
                          <span className="font-mono text-[#718096] dark:text-slate-400">
                            {dept.doctorsCount} doctors · {dept.appointmentsCount} visits
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#0866B2]"
                            style={{ width: `${widthPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            <Card
              title="Recent Hospital Activity"
              subtitle="Latest recorded operational and clinical events"
            >
              {overview.recentActivity.length === 0 ? (
                <p className="text-xs text-[#718096] dark:text-slate-400 py-4">
                  No recent activity logged for this hospital yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {overview.recentActivity.slice(0, 6).map((item) => (
                    <div key={item.id} className="flex items-start gap-2.5 text-xs">
                      <Activity className="w-4 h-4 text-[#11A6A0] shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="font-semibold text-[#172B43] dark:text-slate-100 truncate">
                          {item.action.replace(/_/g, ' ')}
                        </p>
                        <p className="text-[11px] text-[#718096] dark:text-slate-400 truncate">
                          {item.actorName} · {item.entityType} · {formatDateTime(item.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              label="Assigned Role"
              value={roleInfo.label}
              trend={roleInfo.code}
              trendDirection="neutral"
              icon={<ShieldCheck className="w-4 h-4" />}
            />
            <StatCard
              label="Hospital Scope"
              value={activeHospital ? activeHospital.hospitalName : 'Unassigned'}
              trend={activeHospital ? activeHospital.hospitalCity : 'Select hospital context'}
              trendDirection="neutral"
              icon={<Building2 className="w-4 h-4" />}
            />
            <StatCard
              label="Directory Hospitals"
              value={String(directoryCount ?? 25)}
              trend="Verified registry"
              trendDirection="up"
              icon={<Users className="w-4 h-4" />}
            />
          </div>

          <Card
            title="Workspace Actions"
            subtitle="Navigate to your authorized modules or configure account security"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {visibleQuickActions.map((act) => {
                const Icon = act.icon;
                return (
                  <Button
                    key={act.path}
                    variant="outline"
                    size="sm"
                    fullWidth
                    leftIcon={<Icon className="w-3.5 h-3.5" />}
                    onClick={() => navigate(act.path)}
                    className="justify-start"
                  >
                    {act.label}
                  </Button>
                );
              })}
            </div>
          </Card>
        </div>
      )}
    </ApplicationShell>
  );
};
