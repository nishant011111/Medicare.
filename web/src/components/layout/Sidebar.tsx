import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, LogOut, ShieldCheck, X } from 'lucide-react';
import { MEDICORE_BRAND } from '../../assets/brand';
import { getAuthorizedNavigationForRole } from '../../config/navigation';
import { ROLE_META, RoleCodeType } from '../../types/auth';
import { Tooltip } from '../ui/FeedbackAndData';

export interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  activeRole: RoleCodeType | null;
  defaultDashboardPath: string;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
  activeRole,
  defaultDashboardPath,
  onLogout,
}) => {
  const location = useLocation();
  const navItems = getAuthorizedNavigationForRole(activeRole);
  const roleLabel = activeRole ? ROLE_META[activeRole]?.label : 'Staff Portal';

  const renderSidebarContent = (isMobileDrawer: boolean) => {
    const isCompact = !isMobileDrawer && collapsed;

    return (
      <div className="flex flex-col h-full bg-white dark:bg-[#10253E] border-r border-slate-200 dark:border-slate-800 text-[#172B43] dark:text-slate-100 select-none">
        {/* Top Brand Identity Area */}
        <div
          className={`flex items-center justify-between gap-2.5 border-b border-slate-100 dark:border-slate-800/80 ${
            isCompact ? 'px-2.5 py-3.5 justify-center' : 'px-4 py-3.5'
          }`}
        >
          <NavLink
            to={defaultDashboardPath}
            onClick={() => isMobileDrawer && onCloseMobile()}
            className="flex items-center gap-3 min-w-0"
          >
            <img
              src={MEDICORE_BRAND.logoPath}
              alt={MEDICORE_BRAND.fullTitle}
              className={`object-contain rounded-lg bg-white border border-slate-200/80 dark:border-slate-700 p-0.5 shrink-0 transition-all ${
                isCompact ? 'w-10 h-10' : 'w-12 h-10'
              }`}
            />
            {!isCompact && (
              <div className="min-w-0">
                <p className="text-base font-bold tracking-tight text-[#102F4D] dark:text-white font-display leading-tight truncate">
                  {MEDICORE_BRAND.name}
                </p>
                <p className="text-[11px] font-medium text-[#718096] dark:text-slate-400 truncate">
                  {MEDICORE_BRAND.subtitle}
                </p>
              </div>
            )}
          </NavLink>

          {isMobileDrawer ? (
            <button
              type="button"
              onClick={onCloseMobile}
              className="p-1.5 rounded-lg text-[#718096] hover:text-[#172B43] dark:hover:text-white"
              aria-label="Close navigation drawer"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            !isCompact && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="p-1.5 rounded-lg text-[#718096] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Collapse sidebar"
                title="Collapse sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )
          )}
        </div>

        {/* Role Scope Indicator */}
        {!isCompact ? (
          <div className="px-4 py-2.5 bg-[#F4F7FB] dark:bg-slate-900/70 border-b border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#0866B2] dark:text-sky-400 truncate">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-[#11A6A0]" />
              <span>{roleLabel}</span>
            </span>
            <span className="text-[10px] font-mono text-[#718096] dark:text-slate-400">
              {navItems.length} modules
            </span>
          </div>
        ) : (
          <div className="py-2 flex justify-center border-b border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onToggleCollapse}
              className="p-1.5 rounded-lg text-[#718096] hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Expand sidebar"
              title="Expand sidebar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Scrollable Navigation Menu */}
        <nav
          aria-label="Main Hospital Modules"
          className="flex-1 overflow-y-auto px-2.5 py-3 space-y-1"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const targetPath = item.id === 'dashboard' ? defaultDashboardPath : item.path;
            const isDashboardActive =
              item.id === 'dashboard' &&
              (location.pathname === '/dashboard' || location.pathname.endsWith('/dashboard'));
            const isItemActive = isDashboardActive || location.pathname === item.path;

            const linkNode = (
              <NavLink
                key={item.id}
                to={targetPath}
                onClick={() => isMobileDrawer && onCloseMobile()}
                className={`flex items-center gap-3 rounded-xl text-xs font-medium transition-all duration-150 ${
                  isCompact ? 'justify-center p-2.5' : 'px-3 py-2.5'
                } ${
                  isItemActive
                    ? 'bg-[#0866B2] text-white font-semibold shadow-xs'
                    : 'text-[#172B43] dark:text-slate-300 hover:bg-[#F4F7FB] dark:hover:bg-slate-800/70'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isItemActive ? 'text-white' : 'text-[#0866B2] dark:text-[#11A6A0]'
                  }`}
                />
                {!isCompact && <span className="truncate flex-1">{item.label}</span>}
              </NavLink>
            );

            return isCompact ? (
              <div key={item.id} className="flex justify-center">
                <Tooltip content={item.label} side="right">
                  {linkNode}
                </Tooltip>
              </div>
            ) : (
              linkNode
            );
          })}
        </nav>

        {/* Bottom Logout Area */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800">
          {isCompact ? (
            <div className="flex justify-center">
              <Tooltip content="Sign Out of MediCore" side="right">
                <button
                  type="button"
                  onClick={onLogout}
                  className="p-2.5 rounded-xl text-[#DC4C4C] hover:bg-[#DC4C4C]/10 transition-colors"
                  aria-label="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </Tooltip>
            </div>
          ) : (
            <button
              type="button"
              onClick={onLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-[#DC4C4C] hover:bg-[#DC4C4C]/10 transition-colors"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop / Tablet Collapsible Sidebar */}
      <aside
        className={`hidden lg:block shrink-0 transition-all duration-200 z-30 ${
          collapsed ? 'w-[72px]' : 'w-64'
        }`}
      >
        <div className="sticky top-0 h-screen">{renderSidebarContent(false)}</div>
      </aside>

      {/* Mobile Slide-Out Navigation Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-[#102F4D]/60 backdrop-blur-xs"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10 w-72 max-w-[85vw] h-full shadow-2xl">
            {renderSidebarContent(true)}
          </div>
        </div>
      )}
    </>
  );
};
