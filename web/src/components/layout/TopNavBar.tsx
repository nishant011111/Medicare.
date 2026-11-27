import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Building2,
  LogOut,
  Menu,
  Settings,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks/useToast';
import { getAuthorizedNavigationForRole } from '../../config/navigation';
import { ROLE_META } from '../../types/auth';
import { Button, IconButton } from '../ui/Button';
import { SearchInput } from '../ui/FormControls';
import { Avatar, StatusBadge } from '../ui/FeedbackAndData';
import { Breadcrumb, BreadcrumbItem, DropdownMenu } from '../ui/OverlaysAndNavigation';

export interface TopNavBarProps {
  pageTitle: string;
  breadcrumbs: BreadcrumbItem[];
  onToggleSidebar: () => void;
  onOpenMobileDrawer: () => void;
}

export const TopNavBar: React.FC<TopNavBarProps> = ({
  pageTitle,
  breadcrumbs,
  onToggleSidebar,
  onOpenMobileDrawer,
}) => {
  const navigate = useNavigate();
  const {
    user,
    primaryRole,
    activeHospital,
    switchHospitalContext,
    logout,
    logoutAllSessions,
  } = useAuth();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');

  const authorizedModules = getAuthorizedNavigationForRole(primaryRole);
  const matchingModules = searchQuery.trim()
    ? authorizedModules.filter(
        (m) =>
          m.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.description.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 5)
    : [];

  const handleLogout = async () => {
    await logout();
    showToast({
      title: 'Signed out securely',
      description: 'Your MediCore session and refresh credentials have been revoked.',
      variant: 'info',
    });
    navigate('/login', { replace: true });
  };

  const handleLogoutAll = async () => {
    await logoutAllSessions();
    showToast({
      title: 'All device sessions revoked',
      description: 'Every active refresh token for your account has been invalidated.',
      variant: 'warning',
    });
    navigate('/login', { replace: true });
  };

  const effectiveDisplayRole = primaryRole || 'SUPER_ADMIN';
  const roleMeta = ROLE_META[effectiveDisplayRole];

  return (
    <header className="sticky top-0 z-20 bg-white/95 dark:bg-[#10253E]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3">
      <div className="flex items-center justify-between gap-4">
        {/* Left Zone: Sidebar Toggle + Breadcrumbs + Page Title */}
        <div className="flex items-center gap-3 min-w-0">
          <IconButton
            icon={<Menu className="w-4 h-4" />}
            label="Toggle navigation sidebar"
            onClick={() => {
              if (window.innerWidth < 1024) {
                onOpenMobileDrawer();
              } else {
                onToggleSidebar();
              }
            }}
          />

          <div className="min-w-0">
            <div className="hidden sm:block">
              <Breadcrumb items={breadcrumbs} />
            </div>
            <h1 className="text-sm sm:text-base font-bold text-[#102F4D] dark:text-white font-display truncate">
              {pageTitle}
            </h1>
          </div>
        </div>

        {/* Center Zone: Module Search Field */}
        <div className="hidden md:block relative w-72 lg:w-80">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Quick jump to hospital module..."
          />
          {matchingModules.length > 0 && (
            <div className="absolute left-0 right-0 mt-1.5 rounded-2xl bg-white dark:bg-[#10253E] border border-slate-200 dark:border-slate-800 shadow-xl py-1.5 z-50">
              {matchingModules.map((mod) => {
                const Icon = mod.icon;
                return (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      navigate(mod.path);
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-left hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Icon className="w-4 h-4 text-[#0866B2] shrink-0" />
                    <div className="min-w-0">
                      <p className="font-semibold text-[#172B43] dark:text-slate-100 truncate">
                        {mod.label}
                      </p>
                      <p className="text-[11px] text-[#718096] dark:text-slate-400 truncate">
                        {mod.path}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Zone: Tenant Context, Role Menu Preview, Notifications, User Profile Dropdown */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Authorized Hospital Context Indicator / Selector */}
          {user && user.memberships && user.memberships.length > 0 ? (
            <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#F4F7FB] dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <Building2 className="w-3.5 h-3.5 text-[#11A6A0] shrink-0" />
              <select
                aria-label="Authorized Hospital Context"
                value={activeHospital?.hospitalId || ''}
                onChange={async (e) => {
                  const nextId = e.target.value;
                  if (nextId) {
                    try {
                      await switchHospitalContext(nextId);
                      showToast({
                        title: 'Hospital context updated',
                        description: 'Backend tenant token re-scoped to selected hospital.',
                        variant: 'success',
                      });
                    } catch (err) {
                      showToast({
                        title: 'Hospital switch rejected',
                        description:
                          err instanceof Error ? err.message : 'Unauthorized hospital context',
                        variant: 'error',
                      });
                    }
                  }
                }}
                className="text-xs font-semibold bg-transparent text-[#172B43] dark:text-slate-200 focus:outline-none max-w-[180px] truncate"
              >
                {user.memberships.map((m) => (
                  <option key={m.hospitalId} value={m.hospitalId}>
                    {m.hospitalName}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F4F7FB] dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-medium text-[#172B43] dark:text-slate-300">
              <Building2 className="w-3.5 h-3.5 text-[#0866B2]" />
              <span>
                {primaryRole === 'SUPER_ADMIN'
                  ? 'Platform Global Scope'
                  : 'No Hospital Assigned'}
              </span>
            </div>
          )}

          {/* Platform Notifications shortcut (Super Admin) */}
          {primaryRole === 'SUPER_ADMIN' && (
            <IconButton
              icon={<Bell className="w-4 h-4" />}
              label="Notifications"
              onClick={() => navigate('/super-admin/notifications')}
            />
          )}

          {/* Authenticated User Profile Dropdown or Sign In Button */}
          {user ? (
            <DropdownMenu
              trigger={
                <div className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <Avatar name={user?.fullName || 'MediCore User'} size="sm" />
                  <div className="hidden sm:block text-left">
                    <p className="text-xs font-bold text-[#172B43] dark:text-slate-100 leading-tight max-w-[130px] truncate">
                      {user?.fullName || 'Authenticated User'}
                    </p>
                    <p className="text-[10px] font-mono text-[#0866B2] dark:text-[#11A6A0] leading-tight">
                      {primaryRole || 'STAFF'}
                    </p>
                  </div>
                </div>
              }
              header={
                <div className="space-y-1.5">
                  <p className="text-xs font-bold text-[#172B43] dark:text-slate-100 truncate">
                    {user?.fullName}
                  </p>
                  <p className="text-[11px] text-[#718096] dark:text-slate-400 truncate tabular-nums">
                    {user?.phone || user?.email}
                  </p>
                  <div className="pt-1 flex flex-wrap items-center gap-1.5">
                    <StatusBadge label={roleMeta?.label || 'Staff'} variant="primary" />
                    {activeHospital && (
                      <StatusBadge label={activeHospital.hospitalName} variant="teal" />
                    )}
                  </div>
                </div>
              }
              items={[
                {
                  id: 'profile-settings',
                  label: 'Account & Security Settings',
                  icon: <Settings className="w-4 h-4" />,
                  onClick: () => navigate('/settings'),
                },
                {
                  id: 'revoke-all',
                  label: 'Revoke All Device Sessions',
                  icon: <ShieldAlert className="w-4 h-4" />,
                  onClick: () => void handleLogoutAll(),
                },
                {
                  id: 'logout',
                  label: 'Sign Out',
                  icon: <LogOut className="w-4 h-4" />,
                  danger: true,
                  onClick: () => void handleLogout(),
                },
              ]}
            />
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/login')}
            >
              Sign In
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
