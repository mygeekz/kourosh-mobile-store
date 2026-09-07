import React from 'react';
import { cn } from '../utils/cn';

type FinancialProgressTone = 'slate' | 'emerald' | 'amber' | 'rose' | 'sky' | 'brand';

type FinancialProgressBarProps = {
  value: number;
  label?: React.ReactNode;
  showPercent?: boolean;
  tone?: FinancialProgressTone;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
  barClassName?: string;
  ariaLabel?: string;
};

const toneClassMap: Record<FinancialProgressTone, string> = {
  slate: 'bg-slate-900 dark:bg-slate-100',
  emerald: 'bg-emerald-500 dark:bg-emerald-400',
  amber: 'bg-amber-500 dark:bg-amber-400',
  rose: 'bg-rose-500 dark:bg-rose-400',
  sky: 'bg-sky-500 dark:bg-sky-400',
  brand: 'bg-primary',
};

const sizeClassMap = {
  xs: 'h-1.5',
  sm: 'h-2.5',
  md: 'h-3',
} as const;

export const clampFinancialProgress = (value: number) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.min(100, Math.max(0, Math.round(numeric)));
};

const FinancialProgressBar: React.FC<FinancialProgressBarProps> = ({
  value,
  label,
  showPercent = true,
  tone = 'slate',
  size = 'sm',
  className,
  barClassName,
  ariaLabel,
}) => {
  const percent = clampFinancialProgress(value);

  return (
    <div className={cn('financial-progress', className)} aria-label={ariaLabel || (typeof label === 'string' ? label : undefined)}>
      {(label || showPercent) ? (
        <div className="mb-1 flex items-center justify-between gap-2 text-[11px] font-black text-slate-500 dark:text-slate-400">
          <span className="min-w-0 truncate">{label}</span>
          {showPercent ? <span className="shrink-0 tabular-nums">{percent.toLocaleString('fa-IR')}٪</span> : null}
        </div>
      ) : null}
      <div className={cn('financial-progress__track overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800', sizeClassMap[size])}>
        <div
          className={cn('financial-progress__bar h-full rounded-full transition-[width] duration-500 ease-out', toneClassMap[tone], barClassName)}
          style={{ width: `${percent}%`, marginLeft: 'auto' }}
        />
      </div>
    </div>
  );
};

export default FinancialProgressBar;
