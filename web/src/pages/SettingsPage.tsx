import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Mail, Phone, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/useToast';
import { ApplicationShell } from '../layouts/ApplicationShell';
import { Button } from '../components/ui/Button';
import { Card, StatusBadge } from '../components/ui/FeedbackAndData';
import { MfaSetupPanel } from '../components/security/MfaSetupPanel';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, primaryRole, activeHospital, logout, logoutAllSessions } = useAuth();
  const { showToast } = useToast();

  return (
    <ApplicationShell
      pageTitle="Account & Security Settings"
      pageSubtitle="Manage your verified Google Sign-In identity, Multi-Factor Authentication (TOTP), and active sessions."
      breadcrumbs={[
        { label: 'MediCore', path: '/dashboard' },
        { label: 'Settings' },
      ]}
      headerActions={
        <StatusBadge
          label={user?.email ? 'Google Auth Active' : 'Mobile OTP Auth Active'}
          variant="success"
        />
      }
    >
      <div className="space-y-6">
        {/* Top Row: Identity Profile & Theme / Session Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card
            title="Authenticated Account & Role Profile"
            subtitle="Verified directly from GET /api/v1/auth/me"
          >
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-[#718096]">Full Name</span>
                <span className="font-bold text-[#172B43] dark:text-slate-100">{user?.fullName}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-[#718096] inline-flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#0866B2]" />
                  Verified Google Email
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-[#172B43] dark:text-slate-100">
                    {user?.email || 'Not linked'}
                  </span>
                  {user?.email && user?.isEmailVerified && (
                    <StatusBadge label="Verified" variant="success" />
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-[#718096] inline-flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#0866B2]" />
                  Registered Mobile Number
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold tabular-nums text-[#172B43] dark:text-slate-100">
                    {user?.phone || 'Not linked'}
                  </span>
                  {user?.isPhoneVerified && <StatusBadge label="OTP Verified" variant="success" />}
                </div>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-[#718096]">Primary Authorized Role</span>
                <StatusBadge label={primaryRole || 'STAFF'} variant="primary" />
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-[#718096]">Authorized Hospital Tenant</span>
                <span className="font-semibold text-[#172B43] dark:text-slate-100">
                  {activeHospital?.hospitalName ||
                    (primaryRole === 'SUPER_ADMIN' ? 'Global Platform Governance' : 'None')}
                </span>
              </div>
            </div>
          </Card>

          <Card
            title="Session & Access Controls"
            subtitle="Review authentication security and revoke active refresh credentials"
          >
            <div className="space-y-5">
              <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0A1929]/50 p-3 flex items-start gap-2.5 text-xs">
                <ShieldCheck className="w-4 h-4 text-[#11A6A0] shrink-0 mt-0.5" />
                <p className="text-[#718096] dark:text-slate-300 leading-relaxed">
                  Your account is protected with verified <strong>Google Sign-In</strong> and{' '}
                  <strong>Mobile SMS OTP</strong> authentication alongside rotating HttpOnly session
                  tokens.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<ShieldAlert className="w-3.5 h-3.5" />}
                  onClick={async () => {
                    await logoutAllSessions();
                    showToast({
                      title: 'All sessions revoked',
                      description: 'All active refresh tokens for your user have been invalidated.',
                      variant: 'warning',
                    });
                    navigate('/login', { replace: true });
                  }}
                >
                  Revoke All Device Sessions
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  leftIcon={<LogOut className="w-3.5 h-3.5" />}
                  onClick={async () => {
                    await logout();
                    navigate('/login', { replace: true });
                  }}
                >
                  Sign Out Current Session
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Multi-Factor Authentication (TOTP) Wizard */}
        <MfaSetupPanel />
      </div>
    </ApplicationShell>
  );
};
