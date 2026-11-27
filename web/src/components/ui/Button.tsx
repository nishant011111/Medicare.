import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  disabled,
  className = '',
  children,
  ...rest
}) => {
  const variantClasses: Record<ButtonVariant, string> = {
    primary:
      'bg-[#0866B2] hover:bg-[#065392] text-white border border-transparent shadow-xs focus-visible:ring-[#0866B2]',
    secondary:
      'bg-[#11A6A0] hover:bg-[#0D8A85] text-white border border-transparent shadow-xs focus-visible:ring-[#11A6A0]',
    outline:
      'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-[#172B43] dark:text-slate-100 border border-slate-300 dark:border-slate-700 focus-visible:ring-[#0866B2]',
    ghost:
      'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-[#172B43] dark:text-slate-200 border border-transparent focus-visible:ring-slate-400',
    danger:
      'bg-[#DC4C4C] hover:bg-[#C53939] text-white border border-transparent shadow-xs focus-visible:ring-[#DC4C4C]',
  };

  const sizeClasses: Record<ButtonSize, string> = {
    sm: 'px-3 py-1.5 text-xs gap-1.5 rounded-lg',
    md: 'px-4 py-2.5 text-xs font-semibold gap-2 rounded-xl',
    lg: 'px-5 py-3 text-sm font-semibold gap-2.5 rounded-xl',
  };

  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:opacity-55 disabled:cursor-not-allowed whitespace-nowrap shrink-0 ${
        variantClasses[variant]
      } ${sizeClasses[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!loading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
};

export const PrimaryButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
  <Button variant="primary" {...props} />
);

export const SecondaryButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
  <Button variant="secondary" {...props} />
);

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  label: string;
  variant?: 'default' | 'primary' | 'danger';
  badgeCount?: number;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  label,
  variant = 'default',
  badgeCount,
  className = '',
  ...rest
}) => {
  const styles = {
    default:
      'bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-[#172B43] dark:text-slate-200 border border-slate-200 dark:border-slate-800',
    primary: 'bg-[#0866B2] hover:bg-[#065392] text-white border border-transparent',
    danger: 'bg-[#DC4C4C]/10 hover:bg-[#DC4C4C]/20 text-[#DC4C4C] border border-[#DC4C4C]/20',
  }[variant];

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`relative inline-flex items-center justify-center w-9 h-9 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0866B2] shrink-0 ${styles} ${className}`}
      {...rest}
    >
      {icon}
      {typeof badgeCount === 'number' && badgeCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#DC4C4C] text-white text-[10px] font-bold font-mono flex items-center justify-center">
          {badgeCount > 99 ? '99+' : badgeCount}
        </span>
      )}
    </button>
  );
};
