import React from 'react';

import { cn } from '../../utils/cn';

export type IconGlyphTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';
export type IconGlyphSize = 'sm' | 'md' | 'lg';

/**
 * Transitional adapter for legacy tone strings while modules move to IconGlyphTone.
 * Background, border and shadow tokens are intentionally ignored; only semantic
 * foreground meaning is carried into the canonical chrome-free icon.
 */
export const inferIconGlyphTone = (value: string | null | undefined): IconGlyphTone => {
  const tone = String(value || '').toLowerCase();
  if (/rose|red|danger|error/.test(tone)) return 'danger';
  if (/emerald|green|success|good/.test(tone)) return 'success';
  if (/amber|orange|yellow|warning|warn/.test(tone)) return 'warning';
  if (/violet|purple|fuchsia|indigo|primary|accent/.test(tone)) return 'accent';
  if (/sky|blue|cyan|info/.test(tone)) return 'info';
  return 'neutral';
};

const toneClasses: Record<IconGlyphTone, string> = {
  neutral: 'text-slate-500 dark:text-slate-300',
  accent: 'text-primary',
  success: 'text-emerald-600 dark:text-emerald-300',
  warning: 'text-amber-600 dark:text-amber-300',
  danger: 'text-rose-600 dark:text-rose-300',
  info: 'text-sky-600 dark:text-sky-300',
};

const sizeClasses: Record<IconGlyphSize, string> = {
  sm: 'h-6 w-6 text-[11px]',
  md: 'h-8 w-8 text-sm',
  lg: 'h-10 w-10 text-base',
};

export type IconGlyphProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: IconGlyphTone;
  size?: IconGlyphSize;
};

/**
 * Canonical decorative icon wrapper.
 *
 * Icons are intentionally chrome-free: no colored tile, border, glow or shadow.
 * Semantic status color belongs to the icon foreground or its surrounding status badge.
 */
const IconGlyph = React.forwardRef<HTMLSpanElement, IconGlyphProps>(function IconGlyph(
  { tone = 'neutral', size = 'md', className, children, ...props },
  ref,
) {
  return (
    <span
      {...props}
      ref={ref}
      data-ui-icon-surface="bare"
      className={cn(
        'inline-flex shrink-0 items-center justify-center',
        toneClasses[tone],
        sizeClasses[size],
        className,
        '[&&]:!border-0 [&&]:!bg-none [&&]:!bg-transparent [&&]:!shadow-none [&&]:!filter-none',
        '[&&::before]:!bg-none [&&::before]:!bg-transparent [&&::before]:!shadow-none',
        '[&&::after]:!bg-none [&&::after]:!bg-transparent [&&::after]:!shadow-none',
      )}
    >
      {children}
    </span>
  );
});

export default IconGlyph;
