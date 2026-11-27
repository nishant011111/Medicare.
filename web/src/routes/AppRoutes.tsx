import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ProtectedRoute } from './ProtectedRoute';
import { LoginPage } from '../pages/auth/LoginPage';
import { UnauthorizedPage } from '../pages/auth/UnauthorizedPage';
const SuperAdminPortalPage = lazy(() =>
  import('../pages/superadmin/SuperAdminPortalPage').then((m) => ({
    default: m.SuperAdminPortalPage,
  }))
);
const HospitalAdminPortalPage = lazy(() =>
  import('../pages/hospitaladmin/HospitalAdminPortalPage').then((m) => ({
    default: m.HospitalAdminPortalPage,
  }))
);
const RoleDashboardPage = lazy(() =>
  import('../pages/RoleDashboardPage').then((m) => ({ default: m.RoleDashboardPage }))
);
const SettingsPage = lazy(() =>
  import('../pages/SettingsPage').then((m) => ({ default: m.SettingsPage }))
);
const AppointmentsPage = lazy(() =>
  import('../pages/AppointmentsPage').then((m) => ({ default: m.AppointmentsPage }))
);

const RouteLoadingFallback: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
    <div className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-300">
      <span className="w-4 h-4 rounded-full border-2 border-[#0866B2] border-t-transparent animate-spin" />
      <span>Loading MediCore workspace...</span>
    </div>
  </div>
);

const DashboardEntryRedirect: React.FC = () => {
  const { getDefaultDashboardPath } = useAuth();
  const target = getDefaultDashboardPath();
  // Defensive guard: never redirect back onto '/dashboard' or '/' (prevents infinite redirect loops)
  const safeTarget =
    !target || target === '/dashboard' || target === '/' ? '/hospital/dashboard' : target;
  return <Navigate to={safeTarget} replace />;
};

const HospitalDashboardEntry: React.FC = () => {
  const { activeHospital } = useAuth();
  if (!activeHospital) {
    return <RoleDashboardPage dashboardRole="HOSPITAL_ADMIN" />;
  }
  return <HospitalAdminPortalPage module="overview" />;
};

const ReportsAnalyticsEntry: React.FC = () => {
  const { primaryRole, activeHospital } = useAuth();
  if (primaryRole === 'SUPER_ADMIN' && !activeHospital) {
    return <SuperAdminPortalPage section="analytics" />;
  }
  return <HospitalAdminPortalPage module="reports" />;
};

export const AppRoutes: React.FC = () => {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteLoadingFallback />}>
        <Routes>
          {/* Public Google & OTP Authentication Routes */}
          <Route path="/login" element={<LoginPage initialMode="SIGN_IN" />} />
          <Route path="/register" element={<LoginPage initialMode="SIGN_UP" />} />
          <Route path="/forgot-password" element={<Navigate to="/login" replace />} />
          <Route path="/reset-password" element={<Navigate to="/login" replace />} />
          <Route
            path="/unauthorized"
            element={
              <ProtectedRoute>
                <UnauthorizedPage />
              </ProtectedRoute>
            }
          />

          {/* Default Root & Generic Dashboard Redirect to Role-Specific Dashboard */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardEntryRedirect />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardEntryRedirect />
              </ProtectedRoute>
            }
          />

          <Route path="/patient/dashboard" element={<Navigate to="/dashboard" replace />} />

          {/* Super Admin Platform Portal Routes */}
          <Route
            path="/super-admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                <SuperAdminPortalPage section="overview" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/super-admin/hospitals"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                <SuperAdminPortalPage section="hospitals" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/super-admin/hospitals/:id"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                <SuperAdminPortalPage section="hospital-detail" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/super-admin/administrators"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                <SuperAdminPortalPage section="administrators" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/super-admin/users"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                <SuperAdminPortalPage section="users" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/super-admin/analytics"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                <SuperAdminPortalPage section="analytics" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/super-admin/activity-logs"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                <SuperAdminPortalPage section="activity-logs" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/super-admin/notifications"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                <SuperAdminPortalPage section="notifications" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/super-admin/settings"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                <SuperAdminPortalPage section="settings" />
              </ProtectedRoute>
            }
          />

          {/* Role-Based Clinical & Hospital Dashboards */}
          <Route
            path="/hospital/dashboard"
            element={
              <ProtectedRoute allowedRoles={['HOSPITAL_ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN']}>
                <HospitalDashboardEntry />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/dashboard"
            element={
              <ProtectedRoute allowedRoles={['DOCTOR', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']}>
                <RoleDashboardPage dashboardRole="DOCTOR" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/nurse/dashboard"
            element={
              <ProtectedRoute allowedRoles={['NURSE', 'DOCTOR', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']}>
                <RoleDashboardPage dashboardRole="NURSE" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reception/dashboard"
            element={
              <ProtectedRoute allowedRoles={['RECEPTIONIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']}>
                <RoleDashboardPage dashboardRole="RECEPTIONIST" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pharmacy/dashboard"
            element={
              <ProtectedRoute allowedRoles={['PHARMACIST', 'DOCTOR', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']}>
                <RoleDashboardPage dashboardRole="PHARMACIST" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/laboratory/dashboard"
            element={
              <ProtectedRoute
                allowedRoles={['LAB_TECHNICIAN', 'DOCTOR', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']}
              >
                <RoleDashboardPage dashboardRole="LAB_TECHNICIAN" />
              </ProtectedRoute>
            }
          />

          {/* Live Hospital Operations Modules */}
          <Route
            path="/departments"
            element={
              <ProtectedRoute
                allowedRoles={['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST']}
              >
                <HospitalAdminPortalPage module="departments" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctors"
            element={
              <ProtectedRoute
                allowedRoles={['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST']}
              >
                <HospitalAdminPortalPage module="doctors" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff-management"
            element={
              <ProtectedRoute
                allowedRoles={['SUPER_ADMIN', 'HOSPITAL_ADMIN']}
                requiredPermission="hospital:membership:manage"
              >
                <HospitalAdminPortalPage module="staff" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports-analytics"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'ACCOUNTANT']}>
                <ReportsAnalyticsEntry />
              </ProtectedRoute>
            }
          />

          {/* Interactive Appointments & Patient Booking Scheduler */}
          <Route
            path="/appointments"
            element={
              <ProtectedRoute
                allowedRoles={[
                  'SUPER_ADMIN',
                  'HOSPITAL_ADMIN',
                  'DOCTOR',
                  'NURSE',
                  'RECEPTIONIST',
                ]}
              >
                <AppointmentsPage />
              </ProtectedRoute>
            }
          />

          {/* Account Security, TOTP MFA & Session Settings */}
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />

          {/* Catch-All Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};
