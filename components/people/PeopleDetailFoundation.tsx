import React from 'react';
import { Button, IconGlyph, Surface } from '../ui';
import { cn } from '../../utils/cn';

export type PeopleDetailEntity = 'customer' | 'partner';

type ShellProps = React.HTMLAttributes<HTMLElement> & {
  entity: PeopleDetailEntity;
  children: React.ReactNode;
};

export const PeopleDetailPageShell: React.FC<ShellProps> = ({ entity, children, className, ...props }) => (
  <main
    {...props}
    dir="rtl"
    className={cn('mx-auto w-full max-w-7xl min-w-0 space-y-4 px-3 py-3 sm:px-4 lg:px-6 lg:pb-6', className)}
    data-ui-people-detail-page="standard-v282"
    data-ui-people-detail-entity={entity}
    data-ui-people-scope="detail"
  >
    {children}
  </main>
);

export const PeopleDetailSurface: React.FC<React.ComponentProps<typeof Surface> & { section?: string }> = ({
  children,
  className,
  section,
  ...props
}) => (
  <Surface
    {...props}
    surface="glass"
    variant="panel"
    scheme="adaptive"
    wrapContent={false}
    className={cn('min-w-0 overflow-hidden rounded-2xl', className)}
    data-ui-people-detail-surface={section || 'section'}
  >
    {children}
  </Surface>
);

export const PeopleDetailHeaderActions: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className, ...props }) => (
  <div
    {...props}
    className={cn(
      'grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:max-w-[34rem] sm:flex-wrap sm:items-center sm:justify-end',
      className,
    )}
    data-ui-people-detail-header-actions="standard-v282"
  >
    {children}
  </div>
);

type HeroHeaderProps = {
  entity: PeopleDetailEntity;
  titleId: string;
  iconClass: string;
  eyebrow: React.ReactNode;
  title: React.ReactNode;
  subtitle: React.ReactNode;
  badges?: React.ReactNode;
  actions?: React.ReactNode;
};

export const PeopleDetailHeroHeader: React.FC<HeroHeaderProps> = ({
  entity,
  titleId,
  iconClass,
  eyebrow,
  title,
  subtitle,
  badges,
  actions,
}) => (
  <header className="p-4 sm:p-5" aria-labelledby={titleId} data-ui-people-detail-header={`standard-v282-${entity}`}>
    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <IconGlyph tone="accent" size="lg" className="mt-0.5 h-10 w-10 sm:h-11 sm:w-11" aria-hidden="true">
          <i className={iconClass} />
        </IconGlyph>
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-[var(--ds-text-muted)]">
            <i className="fa-solid fa-address-card" aria-hidden="true" />
            <span>{eyebrow}</span>
          </div>
          <h1 id={titleId} className="mt-1 break-words text-2xl font-black leading-tight text-[var(--ds-text-primary)] sm:text-3xl">
            {title}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--ds-text-muted)]">{subtitle}</p>
          {badges ? <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2">{badges}</div> : null}
        </div>
      </div>
      {actions ? <PeopleDetailHeaderActions>{actions}</PeopleDetailHeaderActions> : null}
    </div>
  </header>
);

type QuickAction = {
  key: string;
  label: React.ReactNode;
  sub?: React.ReactNode;
  icon: string;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
};

export const PeopleDetailQuickActionGrid: React.FC<{
  actions: QuickAction[];
  primaryKey?: string;
  ariaLabel?: string;
}> = ({ actions, primaryKey, ariaLabel = 'اقدام‌های سریع پرونده' }) => (
  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4" aria-label={ariaLabel} data-ui-people-detail-quick-actions="standard-v282">
    {actions.map((action) => {
      const primary = action.key === primaryKey;
      return (
        <Button
          key={action.key}
          type="button"
          onClick={action.onClick}
          disabled={action.disabled}
          variant={primary ? 'primary' : 'secondary'}
          size="sm"
          autoIcon={false}
          className="w-full"
          leftIcon={<i className={action.icon} aria-hidden="true" />}
          title={typeof action.sub === 'string' ? action.sub : undefined}
        >
          {action.label}
        </Button>
      );
    })}
  </div>
);

export const PeopleDetailSegmentedActions: React.FC<{
  items: Array<{ key: string; label: React.ReactNode; iconClass?: string }>;
  activeKey: string;
  onChange: (key: string) => void;
  ariaLabel: string;
  className?: string;
}> = ({ items, activeKey, onChange, ariaLabel, className }) => (
  <div className={cn('flex min-w-0 flex-wrap items-center gap-1.5', className)} role="group" aria-label={ariaLabel} data-ui-people-detail-segmented="standard-v282">
    {items.map((item) => {
      const active = item.key === activeKey;
      return (
        <Button
          key={item.key}
          type="button"
          variant={active ? 'primary' : 'secondary'}
          size="xs"
          autoIcon={false}
          aria-pressed={active}
          onClick={() => onChange(item.key)}
          leftIcon={item.iconClass ? <i className={item.iconClass} aria-hidden="true" /> : undefined}
        >
          {item.label}
        </Button>
      );
    })}
  </div>
);

export const PeopleDetailSectionHeading: React.FC<{
  id?: string;
  iconClass: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}> = ({ id, iconClass, title, subtitle, actions, className }) => (
  <div className={cn('flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between', className)} data-ui-people-detail-section-heading="standard-v282">
    <div className="flex min-w-0 items-start gap-2.5">
      <IconGlyph tone="accent" size="md" aria-hidden="true"><i className={iconClass} /></IconGlyph>
      <div className="min-w-0">
        <h2 id={id} className="text-base font-black text-[var(--ds-text-primary)] sm:text-lg">{title}</h2>
        {subtitle ? <p className="mt-1 text-xs leading-6 text-[var(--ds-text-muted)]">{subtitle}</p> : null}
      </div>
    </div>
    {actions ? <div className="flex min-w-0 flex-wrap items-center gap-2 sm:justify-end">{actions}</div> : null}
  </div>
);
