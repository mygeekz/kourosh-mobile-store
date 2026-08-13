import React from 'react';

import { IconGlyph, Surface, type IconGlyphTone } from '@/components/ui';

type Props = {
  label: string;
  value: React.ReactNode;
  icon?: string | React.ReactNode;
  hint?: string;
  tone?: 'neutral' | 'good' | 'warn' | 'bad' | 'info';
};

const valueToneClasses: Record<NonNullable<Props['tone']>, string> = {
  neutral: 'text-text',
  good: 'text-emerald-700 dark:text-emerald-300',
  warn: 'text-amber-700 dark:text-amber-300',
  bad: 'text-rose-700 dark:text-rose-300',
  info: 'text-sky-700 dark:text-sky-300',
};

const iconToneMap: Record<NonNullable<Props['tone']>, IconGlyphTone> = {
  neutral: 'neutral',
  good: 'success',
  warn: 'warning',
  bad: 'danger',
  info: 'info',
};

/**
 * Compatibility adapter for older report pages.
 * New report pages should import PremiumStatCard directly.
 */
export default function ModernKpiCard({
  label,
  value,
  icon,
  hint,
  tone = 'neutral',
}: Props) {
  const resolvedIcon = typeof icon === 'string' ? <i className={icon} /> : icon;

  return (
    <Surface
      surface="glass"
      variant="subtle"
      scheme="adaptive"
      className="premium-stat-card rounded-[22px]"
      contentClassName="p-3"
      data-tone={tone}
      data-ui-surface="kpi-card"
      data-ui-card="true"
      data-ui-card-kind="stat"
      dir="rtl"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 text-right">
          <div className="premium-stat-card__label">{label}</div>
          <div className={`premium-stat-card__value ${valueToneClasses[tone]} truncate`}>{value}</div>
          {hint ? <div className="premium-stat-card__hint">{hint}</div> : null}
        </div>
        {resolvedIcon ? (
          <IconGlyph size="lg" tone={iconToneMap[tone]} className="premium-stat-card__icon" aria-hidden="true">
            {resolvedIcon}
          </IconGlyph>
        ) : null}
      </div>
    </Surface>
  );
}
