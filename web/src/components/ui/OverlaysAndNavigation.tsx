import React, { useState, useRef, useEffect } from 'react';
import { ChevronRight, ChevronLeft, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from './Button';

export interface DropdownMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  danger?: boolean;
  onClick: () => void;
}

export const DropdownMenu: React.FC<{
  trigger: React.ReactNode;
  items: DropdownMenuItem[];
  header?: React.ReactNode;
  align?: 'left' | 'right';
}> = ({ trigger, items, header, align = 'right' }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      <div onClick={() => setOpen((prev) => !prev)} className="cursor-pointer">
        {trigger}
      </div>
      {open && (
        <div
          className={`absolute mt-2 w-64 rounded-2xl bg-white dark:bg-[#10253E] border border-slate-200 dark:border-slate-800 shadow-xl z-50 py-1.5 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {header && (
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
              {header}
            </div>
          )}
          <div className="py-1">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setOpen(false);
                  item.onClick();
                }}
                className={`w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium transition-colors text-left ${
                  item.danger
                    ? 'text-[#DC4C4C] hover:bg-[#DC4C4C]/10'
                    : 'text-[#172B43] dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/70'
                }`}
              >
                {item.icon && <span className="shrink-0">{item.icon}</span>}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const Modal: React.FC<{
  open?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}> = ({ open, isOpen, onClose, title, subtitle, children, footer }) => {
  const isVisible = open !== undefined ? open : isOpen ?? false;
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#102F4D]/60 backdrop-blur-xs">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="mc-modal-title"
        className="bg-white dark:bg-[#10253E] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden"
      >
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3
              id="mc-modal-title"
              className="text-base font-bold text-[#172B43] dark:text-slate-100 font-display"
            >
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-[#718096] dark:text-slate-400 mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#718096] hover:text-[#172B43] dark:hover:text-slate-200 p-1 rounded-lg"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 text-sm text-[#172B43] dark:text-slate-200">{children}</div>
        {footer && (
          <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export const ConfirmationDialog: React.FC<{
  open?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
  variant?: string;
}> = ({
  open,
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm Action',
  danger = false,
}) => {
  const isVisible = open !== undefined ? open : isOpen ?? false;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            size="sm"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-xs text-[#718096] dark:text-slate-300 leading-relaxed">{description}</p>
    </Modal>
  );
};

export const Drawer: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ open, onClose, title, children }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#102F4D]/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#10253E] border-l border-slate-200 dark:border-slate-800 w-full max-w-md h-full flex flex-col shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-base font-bold text-[#172B43] dark:text-slate-100 font-display">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-[#718096] hover:text-[#172B43] dark:hover:text-slate-200 p-1 rounded-lg"
            aria-label="Close drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

export interface TabOption {
  id: string;
  label: string;
  badge?: string | number;
}

export const Tabs: React.FC<{
  tabs: TabOption[];
  activeTab: string;
  onChange: (id: string) => void;
}> = ({ tabs, activeTab, onChange }) => {
  return (
    <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-x-auto max-w-full">
      {tabs.map((tab) => {
        const active = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 ${
              active
                ? 'bg-[#0866B2] text-white shadow-xs'
                : 'text-[#718096] dark:text-slate-400 hover:text-[#172B43] dark:hover:text-slate-200'
            }`}
          >
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                  active
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-200 dark:bg-slate-800 text-[#172B43] dark:text-slate-300'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

export const Breadcrumb: React.FC<{ items: BreadcrumbItem[] }> = ({ items }) => {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-[#718096]">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={`${item.label}-${index}`}>
            {index > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
            {item.path && !isLast ? (
              <Link
                to={item.path}
                className="hover:text-[#0866B2] dark:hover:text-sky-400 transition-colors font-medium"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={
                  isLast
                    ? 'font-semibold text-[#172B43] dark:text-slate-200 truncate'
                    : 'font-medium'
                }
              >
                {item.label}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export const Pagination: React.FC<{
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}> = ({ currentPage, totalPages, onPageChange }) => {
  return (
    <div className="flex items-center justify-between gap-4 pt-3">
      <span className="text-xs text-[#718096] dark:text-slate-400 font-mono">
        Page {currentPage} of {Math.max(1, totalPages)}
      </span>
      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          variant="outline"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
        >
          Prev
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
        >
          Next
        </Button>
      </div>
    </div>
  );
};

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
}

export function DataTable<T extends { id: string | number }>({
  columns,
  data,
  emptyMessage = 'No records available.',
}: {
  columns: DataTableColumn<T>[];
  data: T[];
  emptyMessage?: string;
}) {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-[#F4F7FB] dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-[#718096] dark:text-slate-400">
            {columns.map((col) => (
              <th key={col.key} className="py-3 px-4 whitespace-nowrap">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800 text-xs bg-white/95 dark:bg-[#10253E]/95">
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="py-8 px-4 text-center text-[#718096] dark:text-slate-400"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={row.id}
                className="hover:bg-slate-50/90 dark:hover:bg-slate-800/50 transition-colors"
              >
                {columns.map((col) => (
                  <td key={col.key} className="py-3 px-4 text-[#172B43] dark:text-slate-200">
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
