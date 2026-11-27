import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { MEDICORE_BRAND } from '../../assets/brand';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/FeedbackAndData';

export const UnauthorizedPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, primaryRole, activeHospital, getDefaultDashboardPath, logout } = useAuth();

  const state = location.state as {
    attemptedPath?: string;
    requiredRoles?: string[];
    requiredPermission?: string;
  } | null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F4F7FB] dark:bg-[#0A1929] text-[#172B43] dark:text-slate-100 p-4 sm:p-6">
      <div className="max-w-lg w-full bg-white dark:bg-[#10253E] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-6 sm:p-8 text-center space-y-5">
        <img
          src={MEDICORE_BRAND.logoPath}
          alt={MEDICORE_BRAND.fullTitle}
          className="h-20 w-auto object-contain mx-auto bg-white rounded-xl p-1.5 border border-slate-100"
        />

        <div className="w-12 h-12 rounded-2xl bg-[#DC4C4C]/10 text-[#DC4C4C] flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>

        <div className="space-y-1.5">
          <h1 className="text-xl font-bold text-[#102F4D] dark:text-white font-display">
            403 · Unauthorized Role or Tenant Access
          </h1>
          <p className="text-xs text-[#718096] dark:text-slate-300 leading-relaxed">
            Your authenticated session does not have the required role or hospital tenant permission
            to view this resource. Both frontend route guards and backend Express RBAC middleware
            enforce strict role isolation.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#F4F7FB] dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[#718096]">Authenticated User:</span>
            <span className="font-semibold tabular-nums">{user?.phone || user?.email || 'Unknown'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#718096]">Verified Active Role:</span>
            <StatusBadge label={primaryRole || 'NONE'} variant="primary" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#718096]">Authorized Hospital Scope:</span>
            <span className="font-mono font-semibold">
              {activeHospital?.hospitalName ||
                (primaryRole === 'SUPER_ADMIN' ? 'GLOBAL_PLATFORM' : 'UNASSIGNED')}
            </span>
          </div>
          {state?.attemptedPath && (
            <div className="flex items-center justify-between">
              <span className="text-[#718096]">Restricted Route:</span>
              <span className="font-mono text-[#DC4C4C]">{state.attemptedPath}</span>
            </div>
          )}
          {state?.requiredRoles && (
            <div className="flex items-center justify-between">
              <span className="text-[#718096]">Required Role(s):</span>
              <span className="font-mono font-semibold">{state.requiredRoles.join(', ')}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          {primaryRole === 'PATIENT' ? (
            <Button
              variant="primary"
              leftIcon={<ArrowLeft className="w-4 h-4" />}
              onClick={async () => {
                await logout();
                navigate('/login', { replace: true });
              }}
            >
              Sign Out &amp; Return to Login
            </Button>
          ) : (
            <Button
              variant="primary"
              leftIcon={<ArrowLeft className="w-4 h-4" />}
              onClick={() => navigate(getDefaultDashboardPath(), { replace: true })}
            >
              Return to Authorized Dashboard
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
