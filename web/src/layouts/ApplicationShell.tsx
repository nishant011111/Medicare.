import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MEDICORE_BRAND } from '../assets/brand';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/useToast';
import { Sidebar } from '../components/layout/Sidebar';
import { TopNavBar } from '../components/layout/TopNavBar';
import { Breadcrumb, BreadcrumbItem } from '../components/ui/OverlaysAndNavigation';

export interface ApplicationShellProps {
  pageTitle: string;
  pageSubtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  headerActions?: React.ReactNode;
  children: React.ReactNode;
}

export const ApplicationShell: React.FC<ApplicationShellProps> = ({
  pageTitle,
  pageSubtitle,
  breadcrumbs = [{ label: 'MediCore', path: '/dashboard' }, { label: pageTitle }],
  headerActions,
  children,
}) => {
  const navigate = useNavigate();
  const { primaryRole, getDefaultDashboardPath, logout } = useAuth();
  const { showToast } = useToast();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const defaultDashboardPath = getDefaultDashboardPath();

  const handleLogout = async () => {
    await logout();
    showToast({
      title: 'Signed out of MediCore',
      description: 'Session revoked and authentication state cleared.',
      variant: 'info',
    });
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen flex bg-[#F4F7FB] dark:bg-[#0A1929] text-[#172B43] dark:text-slate-100">
      {/* Left Collapsible Sidebar & Responsive Mobile Drawer */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        mobileOpen={mobileDrawerOpen}
        onCloseMobile={() => setMobileDrawerOpen(false)}
        activeRole={primaryRole}
        defaultDashboardPath={defaultDashboardPath}
        onLogout={() => void handleLogout()}
      />

      {/* Right Workspace Column: Top Navigation Bar + Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopNavBar
          pageTitle={pageTitle}
          breadcrumbs={breadcrumbs}
          onToggleSidebar={() => setSidebarCollapsed((prev) => !prev)}
          onOpenMobileDrawer={() => setMobileDrawerOpen(true)}
        />

        {/* Main Content Viewport */}
        <main className="relative flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
          {/* Subtle Brand Watermark (Behind All Content, pointer-events: none) */}
          <div
            aria-hidden="true"
            className="pointer-events-none select-none fixed lg:absolute inset-0 z-0 flex items-center justify-center overflow-hidden"
          >
            <div
              className="medicore-dashboard-watermark"
              style={{
                backgroundImage: `url('${MEDICORE_BRAND.logoPath}')`,
              }}
            />
          </div>

          {/* Foreground Content Container (z-10) */}
          <div className="medicore-dashboard-content relative z-10 max-w-7xl mx-auto w-full space-y-6">
            {/* Page Header Banner */}
            <div className="mc-surface-card bg-white dark:bg-[#10253E] border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <div className="sm:hidden">
                  <Breadcrumb items={breadcrumbs} />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#102F4D] dark:text-white font-display">
                  {pageTitle}
                </h2>
                {pageSubtitle && (
                  <p className="text-xs sm:text-sm text-[#718096] dark:text-slate-300">
                    {pageSubtitle}
                  </p>
                )}
              </div>
              {headerActions && (
                <div className="flex flex-wrap items-center gap-2.5 shrink-0">{headerActions}</div>
              )}
            </div>

            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
