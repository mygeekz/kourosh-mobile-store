import React from 'react';

import { ResponsiveFilterBar, Surface, SurfaceHeader } from '@/components/ui';
import { cn } from '../../utils/cn';

export type ReportControlDockLayout = 'standard' | 'ledger' | 'search-actions' | 'compact' | 'executive' | 'approved';
export type ReportControlDockPresentation = 'standard' | 'executive' | 'approved';

type Props = {
  ariaLabel: string;
  children?: React.ReactNode;
  search?: React.ReactNode;
  filters?: React.ReactNode;
  actions?: React.ReactNode;
  secondaryRow?: React.ReactNode;
  layout?: ReportControlDockLayout;
  embedded?: boolean;
  className?: string;
  gridClassName?: string;
  toolbarClassName?: string;
  presentation?: ReportControlDockPresentation;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  headerActions?: React.ReactNode;
  footer?: React.ReactNode;
};


export function ReportControlDateSection({
  presets,
  fromField,
  toField,
}: {
  presets: React.ReactNode;
  fromField: React.ReactNode;
  toField: React.ReactNode;
}) {
  return (
    <section className="report-control-approved__date-section" aria-label="انتخاب بازه زمانی">
      <div className="report-control-approved__preset-block">
        <div className="report-control-approved__section-label">
          <i className="fa-regular fa-calendar" aria-hidden="true" />
          <span>میانبر تاریخ</span>
        </div>
        {presets}
      </div>
      <div className="report-control-approved__date-divider" aria-hidden="true" />
      <div className="report-control-approved__date-pair">
        {fromField}
        {toField}
      </div>
    </section>
  );
}

export function ReportControlComparison({
  title = 'مقایسه با دوره قبل',
  description,
  control,
  baseline,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  control?: React.ReactNode;
  baseline?: React.ReactNode;
}) {
  return (
    <section className="report-control-approved__comparison" aria-label="تنظیمات مقایسه دوره‌ای">
      <div className="report-control-approved__comparison-toggle">
        <div className="report-control-approved__comparison-copy">
          <div className="report-control-approved__comparison-title">{title}</div>
          {description ? <div className="report-control-approved__comparison-help">{description}</div> : null}
        </div>
        {control ? <div className="shrink-0">{control}</div> : null}
      </div>
      {baseline ? (
        <>
          <div className="report-control-approved__comparison-divider" aria-hidden="true" />
          <div className="report-control-approved__baseline-field">{baseline}</div>
        </>
      ) : null}
    </section>
  );
}

export function ReportControlFilters({ children }: { children: React.ReactNode }) {
  const count = Math.min(4, Math.max(1, React.Children.count(children)));
  return (
    <section
      className="report-control-approved__filters"
      aria-label="فیلترهای گزارش"
      data-ui-filter-count={count}
    >
      {children}
    </section>
  );
}

export function ReportControlSearch({ children }: { children: React.ReactNode }) {
  return <section className="report-control-approved__search" aria-label="جستجو در گزارش">{children}</section>;
}

export function ReportControlStatus({
  tone = 'info',
  icon,
  children,
}: {
  tone?: 'neutral' | 'success' | 'info';
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className={`report-control-approved__status report-control-approved__status--${tone}`}>
      {icon}
      {children}
    </div>
  );
}

export function ReportControlFooter({
  statuses,
  actions,
  ariaLabel = 'عملیات و وضعیت گزارش',
}: {
  statuses?: React.ReactNode;
  actions?: React.ReactNode;
  ariaLabel?: string;
}) {
  return (
    <div className="report-control-approved__footer-row" aria-label={ariaLabel}>
      {statuses ? <div className="report-control-approved__status-group" aria-live="polite">{statuses}</div> : null}
      {actions ? <div className="report-control-approved__action-group">{actions}</div> : null}
    </div>
  );
}

const layoutClasses: Record<ReportControlDockLayout, string> = {
  standard: 'md:grid-cols-2 xl:grid-cols-4',
  ledger: 'sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6',
  'search-actions': 'xl:grid-cols-4',
  compact: 'sm:grid-cols-2 lg:grid-cols-4',
  executive: 'md:grid-cols-2 xl:grid-cols-12',
  approved: '',
};

/**
 * Canonical report control surface.
 *
 * Use grid mode (children) for date/select/action fields and toolbar mode
 * (search/filters/actions) for table tooling. The component owns the shared
 * responsive geometry while field/button appearance remains delegated to the
 * existing reference primitives.
 */
export default function ReportControlDock({
  ariaLabel,
  children,
  search,
  filters,
  actions,
  secondaryRow,
  layout = 'standard',
  embedded = false,
  className,
  gridClassName,
  toolbarClassName,
  presentation = 'standard',
  title,
  subtitle,
  icon,
  headerActions,
  footer,
}: Props) {
  const hasToolbarSlots = Boolean(search || filters || actions || secondaryRow);

  const isApproved = presentation === 'approved';

  const content = hasToolbarSlots ? (
    <ResponsiveFilterBar
      className={cn(embedded ? undefined : 'p-4 md:p-5', toolbarClassName)}
      search={search}
      filters={filters}
      actions={actions}
      secondaryRow={secondaryRow}
    />
  ) : isApproved ? (
    <div className={cn('report-control-approved__body', gridClassName)} aria-label={ariaLabel}>
      {children}
    </div>
  ) : (
    <div
      className={cn(
        'report-filter-grid grid grid-cols-1 gap-3',
        layoutClasses[layout],
        gridClassName,
      )}
      aria-label={ariaLabel}
    >
      {children}
    </div>
  );

  if (embedded) {
    return (
      <div
        className={cn('min-w-0', className)}
        data-ui-report-control-dock="true"
        data-ui-report-control-dock-mode={hasToolbarSlots ? 'toolbar' : 'grid'}
        aria-label={hasToolbarSlots ? ariaLabel : undefined}
        dir="rtl"
      >
        {content}
      </div>
    );
  }

  const isExecutive = presentation === 'executive';

  return (
    <Surface
      surface="glass"
      variant={isExecutive || isApproved ? 'panel' : 'subtle'}
      scheme="adaptive"
      className={cn(
        isApproved ? 'report-control-approved rounded-[28px]' : isExecutive ? 'rounded-[28px]' : 'rounded-[24px]',
        className,
      )}
      contentClassName="p-0"
      data-ui-report-control-dock="true"
      data-ui-report-control-dock-mode={hasToolbarSlots ? 'toolbar' : 'grid'}
      data-ui-report-control-dock-presentation={presentation}
      aria-label={hasToolbarSlots ? ariaLabel : undefined}
      dir="rtl"
    >
      {isApproved ? (
        <div className="report-control-approved__inner">
          {(title || subtitle || icon || headerActions) ? (
            <header className="report-control-approved__header">
              <div className="report-control-approved__header-lead">
                {icon ? <span className="report-control-approved__header-icon" aria-hidden="true">{icon}</span> : null}
                <div className="report-control-approved__header-copy">
                  {title ? <h2 className="report-control-approved__title">{title}</h2> : null}
                  {subtitle ? <p className="report-control-approved__subtitle">{subtitle}</p> : null}
                </div>
              </div>
              {headerActions ? <div className="report-control-approved__header-actions">{headerActions}</div> : null}
            </header>
          ) : null}
          {content}
          {footer ? <div className="report-control-approved__footer">{footer}</div> : null}
        </div>
      ) : isExecutive ? (
        <div className="min-w-0 p-4 sm:p-5 lg:p-6">
          {(title || subtitle || icon || headerActions) ? (
            <SurfaceHeader
              title={title}
              subtitle={subtitle}
              icon={icon}
              actions={headerActions}
              kind="section"
              density="comfortable"
              titleAs="h2"
              className="mb-5 border-b border-[var(--ds-border-subtle)] pb-4 sm:mb-6 sm:pb-5"
              titleClassName="text-lg font-black sm:text-xl"
              subtitleClassName="mt-1 text-xs font-bold leading-6 text-[var(--ds-text-muted)] sm:text-sm"
              iconClassName="mt-1 text-lg text-[var(--ds-accent-fg)]"
            />
          ) : null}
          {content}
          {footer ? <div className="mt-4 sm:mt-5">{footer}</div> : null}
        </div>
      ) : (
        <>
          {content}
          {footer ? <div className="p-4 pt-0 md:p-5 md:pt-0">{footer}</div> : null}
        </>
      )}
    </Surface>
  );
}
