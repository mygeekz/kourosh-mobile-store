import React from 'react';
import { cn } from '../utils/cn';

export type FinancialStatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'partner' | 'customer';

export type FinancialStatusBadgeProps = {
  label: React.ReactNode;
  tone?: FinancialStatusTone;
  icon?: string;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
  title?: string;
};

const toneClassMap: Record<FinancialStatusTone, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300',
  warning: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300',
  danger: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300',
  info: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-300',
  neutral: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300',
  partner: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-300',
  customer: 'border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-900/60 dark:bg-cyan-950/30 dark:text-cyan-300',
};

const sizeClassMap = {
  xs: 'min-h-7 px-2.5 py-1 text-[10px] gap-1.5',
  sm: 'min-h-8 px-3 py-1.5 text-[11px] gap-2',
  md: 'min-h-9 px-3.5 py-2 text-xs gap-2',
} as const;

const defaultIconByTone: Record<FinancialStatusTone, string> = {
  success: 'fa-solid fa-circle-check',
  warning: 'fa-solid fa-clock',
  danger: 'fa-solid fa-triangle-exclamation',
  info: 'fa-solid fa-circle-info',
  neutral: 'fa-solid fa-circle-dot',
  partner: 'fa-solid fa-handshake',
  customer: 'fa-solid fa-user-check',
};

export const resolveFinancialStatusMeta = (status?: string | null): { label: string; tone: FinancialStatusTone; icon: string } => {
  const value = String(status || '').trim();
  if (!value) return { label: 'نامشخص', tone: 'neutral', icon: defaultIconByTone.neutral };
  if (/پرداخت شده|تکمیل شده|تسویه|تسویه‌شده|سرمایه برگشته|سرمایه کامل|بسته/.test(value)) {
    return { label: value, tone: 'success', icon: defaultIconByTone.success };
  }
  if (/معوق|برگشت|خطر|دیرکرد/.test(value)) {
    return { label: value, tone: 'danger', icon: defaultIconByTone.danger };
  }
  if (/جزئی|در جریان|مانده|باز|در انتظار|امروز|نزدیک/.test(value)) {
    return { label: value, tone: 'warning', icon: defaultIconByTone.warning };
  }
  if (/بدهکار|بدهی/.test(value)) {
    return { label: value, tone: 'danger', icon: 'fa-solid fa-wallet' };
  }
  if (/بستانکار|طلب/.test(value)) {
    return { label: value, tone: 'success', icon: 'fa-solid fa-hand-holding-dollar' };
  }
  return { label: value, tone: 'info', icon: defaultIconByTone.info };
};

const FinancialStatusBadge: React.FC<FinancialStatusBadgeProps> = ({
  label,
  tone = 'neutral',
  icon,
  size = 'sm',
  className,
  title,
}) => {
  const resolvedIcon = icon || defaultIconByTone[tone];
  return (
    <span
      title={title}
      className={cn(
        'financial-status-badge inline-flex shrink-0 items-center rounded-full border font-black leading-none shadow-sm',
        toneClassMap[tone],
        sizeClassMap[size],
        className,
      )}
    >
      {resolvedIcon ? <i className={cn(resolvedIcon, 'text-[0.9em]')} aria-hidden="true" /> : null}
      <span className="min-w-0 truncate">{label}</span>
    </span>
  );
};

export default FinancialStatusBadge;
