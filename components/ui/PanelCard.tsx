import React from 'react';
import { cn } from '../../utils/cn';
import SurfaceHeader, { type SurfaceDensity, type SurfaceTone } from './SurfaceHeader';

interface PanelCardProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title' | 'children'> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  footerClassName?: string;
  density?: SurfaceDensity;
  tone?: SurfaceTone;
  padded?: boolean;
  headerDivider?: boolean;
  variant?: 'default' | 'metric';
  metricValue?: React.ReactNode;
  metricHint?: React.ReactNode;
  metricBadge?: React.ReactNode;
}

const metricValueToneClasses: Record<SurfaceTone, string> = {
  neutral: 'text-[var(--ds-text-primary)]',
  accent: 'text-[var(--ds-text-primary)]',
  info: 'text-sky-700 dark:text-sky-300',
  success: 'text-emerald-700 dark:text-emerald-300',
  warning: 'text-amber-700 dark:text-amber-300',
  danger: 'text-rose-700 dark:text-rose-300',
};

const metricIconToneClasses: Record<SurfaceTone, string> = {
  neutral: 'text-[var(--ds-text-muted)]',
  accent: 'text-[var(--ds-text-primary)]',
  info: 'text-sky-600 dark:text-sky-300',
  success: 'text-emerald-600 dark:text-emerald-300',
  warning: 'text-amber-600 dark:text-amber-300',
  danger: 'text-rose-600 dark:text-rose-300',
};

export default function PanelCard({
  title,
  subtitle,
  icon,
  actions,
  footer,
  children,
  className,
  bodyClassName,
  footerClassName,
  density = 'comfortable',
  tone = 'neutral',
  padded = true,
  headerDivider = true,
  variant = 'default',
  metricValue,
  metricHint,
  metricBadge,
  ...sectionProps
}: PanelCardProps) {
  const isMetric = variant === 'metric';
  const hasHeader = !isMetric && Boolean(title || subtitle || icon || actions);

  return (
    <section
      {...sectionProps}
      className={cn('ux-panel-card', !padded ? 'ux-panel-card--flush' : '', className)}
      data-ui-surface="panel-card"
      data-ui-card="true"
      data-ui-card-kind={isMetric ? 'stat' : undefined}
      data-ui-contrast-contract="adaptive"
      data-ui-density={density}
      data-ui-tone={tone}
      dir="rtl"
    >
      {isMetric ? (
        <div className={cn('ux-panel-card__body', bodyClassName)}>
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0 flex-1 text-right">
              {title ? <div className="text-xs font-extrabold leading-5 text-[var(--ds-text-muted)]">{title}</div> : null}
              {metricBadge ? <div className="mt-1 flex flex-wrap items-center gap-2">{metricBadge}</div> : null}
              <div
                className={cn(
                  'mt-2 break-words text-xl font-black leading-7 tabular-nums sm:text-2xl sm:leading-8',
                  metricValueToneClasses[tone],
                )}
                data-ui-panel-metric-value="true"
              >
                {metricValue ?? '—'}
              </div>
              {metricHint ? <div className="mt-1.5 text-xs font-semibold leading-6 text-[var(--ds-text-muted)]" data-ui-panel-metric-hint="true">{metricHint}</div> : null}
              {children}
            </div>
            {icon ? (
              <span
                className={cn('shrink-0 text-base leading-none', metricIconToneClasses[tone])}
                data-ui-icon-surface="bare"
                aria-hidden="true"
              >
                {icon}
              </span>
            ) : null}
          </div>
        </div>
      ) : (
        <>
          {hasHeader ? (
            <SurfaceHeader
              kind="panel"
              tone={tone}
              density={density}
              icon={icon}
              title={title}
              subtitle={subtitle}
              actions={actions}
              className={cn('ux-panel-card__header', !headerDivider ? 'ux-panel-card__header--plain' : '')}
              leadClassName="ux-panel-card__lead"
              iconClassName="ux-panel-card__icon"
              titleClassName="ux-panel-card__title"
              subtitleClassName="ux-panel-card__subtitle"
              actionsClassName="ux-panel-card__actions"
            />
          ) : null}
          <div className={cn('ux-panel-card__body', bodyClassName)}>{children}</div>
        </>
      )}
      {footer ? <footer className={cn('ux-panel-card__footer', footerClassName)}>{footer}</footer> : null}
    </section>
  );
}
