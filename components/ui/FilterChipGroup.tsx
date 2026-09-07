import React from 'react';

import Button from '../Button';
import { cn } from '../../utils/cn';
import type { ButtonSize } from '../Button';

export type FilterChipOption<T extends string> = {
  value: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
  title?: string;
  disabled?: boolean;
};

export type FilterChipGroupProps<T extends string> = {
  value: T;
  options: readonly FilterChipOption<T>[];
  onValueChange: (value: T) => void;
  ariaLabel: string;
  label?: React.ReactNode;
  size?: ButtonSize;
  showIcons?: boolean;
  appearance?: 'chips' | 'segmented';
  fullWidth?: boolean;
  className?: string;
};

/**
 * Canonical compact filter/toggle group for dense SaaS toolbars.
 * Uses only the shared Button contract; no page-owned visual CSS.
 */
export default function FilterChipGroup<T extends string>({
  value,
  options,
  onValueChange,
  ariaLabel,
  label,
  size = 'xs',
  showIcons = false,
  appearance = 'chips',
  fullWidth = false,
  className,
}: FilterChipGroupProps<T>) {
  const segmented = appearance === 'segmented';

  return (
    <div className={cn('flex min-w-0 gap-1.5', segmented && label ? 'flex-col items-stretch' : 'flex-wrap items-center', fullWidth ? 'w-full' : '', className)} dir="rtl">
      {label ? <span className="shrink-0 text-[11px] font-black text-slate-500 dark:text-slate-400">{label}</span> : null}
      <div
        className={cn(
          'inline-flex min-w-0 items-center',
          segmented
            ? 'overflow-hidden rounded-[var(--ds-control-radius)] border border-[var(--ds-control-border)] bg-[var(--ds-control-bg)] shadow-[var(--ds-control-shadow)]'
            : 'flex-wrap gap-1',
          fullWidth ? 'w-full flex-1' : '',
        )}
        role="group"
        aria-label={ariaLabel}
        data-ui-filter-chip-appearance={appearance}
      >
        {options.map((option, index) => {
          const selected = option.value === value;
          return (
            <Button
              key={option.value}
              type="button"
              variant={selected ? 'primary' : segmented ? 'ghost' : 'secondary'}
              size={size}
              autoIcon={false}
              aria-pressed={selected}
              disabled={option.disabled}
              title={option.title}
              onClick={() => onValueChange(option.value)}
              leftIcon={showIcons ? option.icon : undefined}
              className={cn(
                segmented ? 'rounded-none border-0 shadow-none' : '',
                segmented && index > 0 ? 'border-e border-[var(--ds-control-border)]' : '',
                fullWidth ? 'flex-1 justify-center' : '',
              )}
            >
              {option.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
