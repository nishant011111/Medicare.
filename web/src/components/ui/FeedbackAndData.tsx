import React from 'react';
import { AlertTriangle, Inbox, TrendingUp, TrendingDown } from 'lucide-react';
import { MEDICORE_BRAND } from '../../assets/brand';
import { Button } from './Button';

export type BadgeVariant = 'primary' | 'teal' | 'navy' | 'success' | 'warning' | 'danger' | 'error' | 'neutral';

export const StatusBadge: React.FC<{
  label: string;
  variant?: BadgeVariant;
  dot?: boolean;
}> = ({ label, variant = 'neutral', dot = true }) => {
  const activeVariant = variant === 'error' ? 'danger' : variant;
  const styles: Record<BadgeVariant, string> = {
    primary: 'bg-[#0866B2]/10 text-[#0866B2] dark:bg-[#0866B2]/20 dark:text-sky-300 border-[#0866B2]/20',
    teal: 'bg-[#11A6A0]/10 text-[#0D8A85] dark:bg-[#11A6A0]/20 dark:text-teal-300 border-[#11A6A0]/20',
    navy: 'bg-[#102F4D]/10 text-[#102F4D] dark:bg-slate-800 dark:text-slate-200 border-[#102F4D]/20',
    success: 'bg-[#16A36A]/10 text-[#16A36A] dark:bg-[#16A36A]/20 dark:text-emerald-300 border-[#16A36A]/20',
    warning: 'bg-[#E9A23B]/15 text-amber-800 dark:bg-[#E9A23B]/20 dark:text-amber-300 border-[#E9A23B]/30',
    danger: 'bg-[#DC4C4C]/10 text-[#DC4C4C] dark:bg-[#DC4C4C]/20 dark:text-rose-300 border-[#DC4C4C]/20',
    error: 'bg-[#DC4C4C]/10 text-[#DC4C4C] dark:bg-[#DC4C4C]/20 dark:text-rose-300 border-[#DC4C4C]/20',
    neutral: 'bg-slate-100 text-[#718096] dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  };

  const dotColors: Record<BadgeVariant, string> = {
    primary: 'bg-[#0866B2]',
    teal: 'bg-[#11A6A0]',
    navy: 'bg-[#102F4D] dark:bg-slate-300',
    success: 'bg-[#16A36A]',
    warning: 'bg-[#E9A23B]',
    danger: 'bg-[#DC4C4C]',
    error: 'bg-[#DC4C4C]',
    neutral: 'bg-[#718096]',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-semibold rounded-md border whitespace-nowrap ${styles[activeVariant]}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[activeVariant]}`} />}
      {label}
    </span>
  );
};

export const Avatar: React.FC<{
  name: string;
  src?: string | null;
  size?: 'sm' | 'md' | 'lg';
  subtitle?: string;
}> = ({ name, src, size = 'md', subtitle }) => {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');

  const sizeMap = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-9 h-9 text-xs',
    lg: 'w-11 h-11 text-sm',
  }[size];

  return (
    <div className="inline-flex items-center gap-2.5">
      {src ? (
        <img
          src={src}
          alt={name}
          className={`${sizeMap} rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0`}
        />
      ) : (
        <div
          className={`${sizeMap} rounded-full bg-gradient-to-br from-[#0866B2] to-[#11A6A0] text-white font-bold flex items-center justify-center shrink-0`}
        >
          {initials || 'MC'}
        </div>
      )}
      {subtitle !== undefined && (
        <div className="min-w-0">
          <p className="text-xs font-bold text-[#172B43] dark:text-slate-100 truncate">{name}</p>
          <p className="text-[11px] text-[#718096] dark:text-slate-400 truncate">{subtitle}</p>
        </div>
      )}
    </div>
  );
};

export const Tooltip: React.FC<{
  content: string;
  children: React.ReactNode;
  side?: 'right' | 'top';
}> = ({ content, children, side = 'right' }) => {
  return (
    <div className="relative group inline-flex">
      {children}
      <div
        role="tooltip"
        className={`pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 absolute px-2.5 py-1 text-[11px] font-medium text-white bg-[#102F4D] rounded-lg shadow-md whitespace-nowrap ${
          side === 'right'
            ? 'left-full ml-2 top-1/2 -translate-y-1/2'
            : 'bottom-full mb-1.5 left-1/2 -translate-x-1/2'
        }`}
      >
        {content}
      </div>
    </div>
  );
};

export const Card: React.FC<{
  title?: string;
  subtitle?: string;
  headerRight?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}> = ({ title, subtitle, headerRight, className = '', children }) => {
  return (
    <div
      className={`mc-surface-card bg-white dark:bg-[#10253E] border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xs p-5 ${className}`}
    >
      {(title || subtitle || headerRight) && (
        <div className="flex items-start justify-between gap-4 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800/80">
          <div>
            {title && (
              <h3 className="text-sm font-bold text-[#172B43] dark:text-slate-100 font-display">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-[#718096] dark:text-slate-400 mt-0.5">{subtitle}</p>
            )}
          </div>
          {headerRight && <div className="shrink-0">{headerRight}</div>}
        </div>
      )}
      {children}
    </div>
  );
};

export const StatCard: React.FC<{
  label: string;
  value: string;
  trend?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
}> = ({ label, value, trend, trendDirection = 'up', icon }) => {
  return (
    <div className="mc-surface-card bg-white dark:bg-[#10253E] border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-[#718096] dark:text-slate-400">{label}</span>
        <div className="flex items-center gap-1.5">
          {icon && (
            <div className="w-8 h-8 rounded-xl bg-[#0866B2]/10 dark:bg-[#0866B2]/20 text-[#0866B2] dark:text-sky-300 flex items-center justify-center">
              {icon}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-2">
        <p className="text-2xl font-bold font-mono tabular-nums text-[#172B43] dark:text-slate-100">
          {value}
        </p>
        {trend && (
          <span
            className={`inline-flex items-center gap-1 text-xs font-semibold font-mono ${
              trendDirection === 'up'
                ? 'text-[#16A36A]'
                : trendDirection === 'down'
                ? 'text-[#DC4C4C]'
                : 'text-[#718096]'
            }`}
          >
            {trendDirection === 'up' && <TrendingUp className="w-3.5 h-3.5" />}
            {trendDirection === 'down' && <TrendingDown className="w-3.5 h-3.5" />}
            {trend}
          </span>
        )}
      </div>
    </div>
  );
};

export const LoadingSkeleton: React.FC<{ lines?: number; className?: string }> = ({
  lines = 3,
  className = '',
}) => {
  return (
    <div className={`space-y-2.5 animate-pulse ${className}`} aria-busy="true">
      {Array.from({ length: lines }).map((_, idx) => (
        <div
          key={idx}
          className={`h-4 rounded-lg bg-slate-200 dark:bg-slate-800 ${
            idx === lines - 1 ? 'w-2/3' : 'w-full'
          }`}
        />
      ))}
    </div>
  );
};

export const EmptyState: React.FC<{
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}> = ({ title, description, actionLabel, onAction }) => {
  return (
    <div className="text-center py-10 px-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
      <div className="w-10 h-10 rounded-xl bg-[#0866B2]/10 text-[#0866B2] flex items-center justify-center mx-auto mb-3">
        <Inbox className="w-5 h-5" />
      </div>
      <h4 className="text-sm font-bold text-[#172B43] dark:text-slate-100">{title}</h4>
      <p className="text-xs text-[#718096] dark:text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <div className="mt-4">
          <Button size="sm" variant="primary" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
};

export const ErrorState: React.FC<{
  title?: string;
  message: string;
  onRetry?: () => void;
}> = ({ title = 'Unable to complete operation', message, onRetry }) => {
  return (
    <div
      role="alert"
      className="p-4 rounded-2xl border border-[#DC4C4C]/30 bg-[#DC4C4C]/5 dark:bg-[#DC4C4C]/10 flex items-start justify-between gap-4"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-[#DC4C4C] shrink-0 mt-0.5" />
        <div>
          <h4 className="text-xs font-bold text-[#172B43] dark:text-slate-100">{title}</h4>
          <p className="text-xs text-[#DC4C4C] dark:text-rose-300 mt-0.5 leading-relaxed">
            {message}
          </p>
        </div>
      </div>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
};

export const OfficialLogoLoader: React.FC<{ message?: string }> = ({
  message = 'Verifying secure MediCore session...',
}) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F4F7FB] dark:bg-[#0A1929] p-6">
      <div className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-white dark:bg-[#10253E] border border-slate-200 dark:border-slate-800 shadow-sm max-w-sm w-full text-center">
        <img
          src={MEDICORE_BRAND.logoPath}
          alt={MEDICORE_BRAND.fullTitle}
          className="w-52 sm:w-60 h-auto object-contain mx-auto bg-white rounded-xl p-2"
        />
        <div className="flex items-center justify-center gap-2.5 text-xs font-semibold text-[#172B43] dark:text-slate-200">
          <span className="h-2.5 w-2.5 rounded-full bg-[#11A6A0] animate-ping" />
          <span>{message}</span>
        </div>
      </div>
    </div>
  );
};

export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-white dark:bg-[#10253E] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 animate-pulse space-y-3 ${className}`}>
    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
    <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
    <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-3/4" />
  </div>
);
