import React from 'react';
import { Search, X } from 'lucide-react';

export interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const TextInput: React.FC<TextInputProps> = ({
  label,
  helperText,
  error,
  leftIcon,
  rightElement,
  id,
  className = '',
  ...rest
}) => {
  const inputId = id || (label ? `mc-input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold text-[#172B43] dark:text-slate-200"
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && (
          <span className="absolute left-3 text-[#718096] dark:text-slate-400 pointer-events-none">
            {leftIcon}
          </span>
        )}
        <input
          id={inputId}
          className={`w-full py-2.5 text-sm rounded-xl bg-white dark:bg-slate-950 text-[#172B43] dark:text-slate-100 placeholder:text-[#718096]/70 border transition-colors focus:outline-none focus:ring-2 ${
            leftIcon ? 'pl-9' : 'pl-3.5'
          } ${rightElement ? 'pr-10' : 'pr-3.5'} ${
            error
              ? 'border-[#DC4C4C] focus:ring-[#DC4C4C]/30'
              : 'border-slate-200 dark:border-slate-800 focus:border-[#0866B2] focus:ring-[#0866B2]/20'
          } ${className}`}
          {...rest}
        />
        {rightElement && <div className="absolute right-2.5 flex items-center">{rightElement}</div>}
      </div>
      {error ? (
        <p className="text-xs font-medium text-[#DC4C4C]" role="alert">
          {error}
        </p>
      ) : (
        helperText && <p className="text-xs text-[#718096] dark:text-slate-400">{helperText}</p>
      )}
    </div>
  );
};

export interface SearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  onClear,
  placeholder = 'Search patients, records, or modules...',
  className = '',
  ...rest
}) => {
  return (
    <div className={`relative flex items-center ${className}`}>
      <Search className="w-4 h-4 text-[#718096] absolute left-3 pointer-events-none" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-[#F4F7FB] dark:bg-slate-900 text-[#172B43] dark:text-slate-100 placeholder:text-[#718096] border border-slate-200 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-950 focus:border-[#0866B2] focus:outline-none transition-colors"
        {...rest}
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            onChange('');
            onClear?.();
          }}
          className="absolute right-2.5 text-[#718096] hover:text-[#172B43] dark:hover:text-slate-200"
          aria-label="Clear search"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectDropdownProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
}

export const SelectDropdown: React.FC<SelectDropdownProps> = ({
  label,
  options,
  error,
  id,
  className = '',
  ...rest
}) => {
  const selectId = id || (label ? `mc-select-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label
          htmlFor={selectId}
          className="block text-xs font-semibold text-[#172B43] dark:text-slate-200"
        >
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`w-full px-3.5 py-2.5 text-sm rounded-xl bg-white dark:bg-slate-950 text-[#172B43] dark:text-slate-100 border transition-colors focus:outline-none focus:ring-2 ${
          error
            ? 'border-[#DC4C4C] focus:ring-[#DC4C4C]/30'
            : 'border-slate-200 dark:border-slate-800 focus:border-[#0866B2] focus:ring-[#0866B2]/20'
        } ${className}`}
        {...rest}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs font-medium text-[#DC4C4C]">{error}</p>}
    </div>
  );
};

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea: React.FC<TextareaProps> = ({
  label,
  error,
  id,
  className = '',
  rows = 3,
  ...rest
}) => {
  const areaId = id || (label ? `mc-textarea-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label
          htmlFor={areaId}
          className="block text-xs font-semibold text-[#172B43] dark:text-slate-200"
        >
          {label}
        </label>
      )}
      <textarea
        id={areaId}
        rows={rows}
        className={`w-full px-3.5 py-2.5 text-sm rounded-xl bg-white dark:bg-slate-950 text-[#172B43] dark:text-slate-100 border border-slate-200 dark:border-slate-800 focus:border-[#0866B2] focus:outline-none focus:ring-2 focus:ring-[#0866B2]/20 ${className}`}
        {...rest}
      />
      {error && <p className="text-xs font-medium text-[#DC4C4C]">{error}</p>}
    </div>
  );
};

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  description?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  label,
  description,
  id,
  className = '',
  ...rest
}) => {
  const chkId = id || `mc-chk-${label.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <label htmlFor={chkId} className={`inline-flex items-start gap-2.5 cursor-pointer ${className}`}>
      <input
        id={chkId}
        type="checkbox"
        className="mt-0.5 h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-[#0866B2] focus:ring-[#0866B2]"
        {...rest}
      />
      <span className="text-xs">
        <span className="font-medium text-[#172B43] dark:text-slate-200">{label}</span>
        {description && (
          <span className="block text-[#718096] dark:text-slate-400 mt-0.5">{description}</span>
        )}
      </span>
    </label>
  );
};

export interface RadioButtonProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
}

export const RadioButton: React.FC<RadioButtonProps> = ({ label, id, className = '', ...rest }) => {
  const radioId = id || `mc-radio-${label.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <label htmlFor={radioId} className={`inline-flex items-center gap-2 cursor-pointer ${className}`}>
      <input
        id={radioId}
        type="radio"
        className="h-4 w-4 border-slate-300 dark:border-slate-700 text-[#0866B2] focus:ring-[#0866B2]"
        {...rest}
      />
      <span className="text-xs font-medium text-[#172B43] dark:text-slate-200">{label}</span>
    </label>
  );
};

export interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onChange,
  label,
  disabled = false,
}) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className="inline-flex items-center gap-2.5 disabled:opacity-50 cursor-pointer"
    >
      <span
        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ${
          checked ? 'bg-[#11A6A0]' : 'bg-slate-300 dark:bg-slate-700'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition-transform duration-200 mt-0.5 ${
            checked ? 'translate-x-4.5' : 'translate-x-0.5'
          }`}
        />
      </span>
      {label && (
        <span className="text-xs font-medium text-[#172B43] dark:text-slate-200">{label}</span>
      )}
    </button>
  );
};

export interface TextareaInputProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

export const TextareaInput: React.FC<TextareaInputProps> = ({
  label,
  helperText,
  error,
  id,
  className = '',
  ...rest
}) => {
  const textareaId = id || (label ? `mc-textarea-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);
  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={textareaId} className="block text-xs font-semibold text-[#172B43] dark:text-slate-200">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={`w-full px-3.5 py-2.5 text-sm rounded-xl bg-white dark:bg-slate-950 text-[#172B43] dark:text-slate-100 placeholder:text-[#718096]/70 border transition-colors focus:outline-none focus:ring-2 ${
          error
            ? 'border-[#DC4C4C] focus:ring-[#DC4C4C]/30'
            : 'border-slate-200 dark:border-slate-800 focus:border-[#0866B2] focus:ring-[#0866B2]/20'
        } ${className}`}
        {...rest}
      />
      {error ? (
        <p className="text-xs font-medium text-[#DC4C4C]" role="alert">{error}</p>
      ) : (
        helperText && <p className="text-xs text-[#718096] dark:text-slate-400">{helperText}</p>
      )}
    </div>
  );
};

export const SelectInput = SelectDropdown;
