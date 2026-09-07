import React from 'react';

import { IconGlyph, type IconGlyphTone } from '@/components/ui';
import { Surface } from '@/components/ui';
type Props = {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: React.ReactNode;
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

const PremiumStatCard: React.FC<Props> = ({ label, value, hint, icon, tone = 'neutral' }) => {
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
          <div className={`premium-stat-card__value ${valueToneClasses[tone]} break-words leading-7 sm:leading-8`}>{value}</div>
          {hint ? <div className="premium-stat-card__hint">{hint}</div> : null}
        </div>
        {icon ? (
          <IconGlyph size="lg" tone={iconToneMap[tone]} className="premium-stat-card__icon" aria-hidden="true">
            {icon}
          </IconGlyph>
        ) : null}
      </div>
    </Surface>
  );
};

export default PremiumStatCard;
