import React from 'react';
import { cn } from '../../utils/cn';

export type SurfaceTone = 'neutral' | 'accent' | 'info' | 'success' | 'warning' | 'danger';
export type SurfaceDensity = 'comfortable' | 'compact';
export type SurfaceKind = 'page' | 'panel' | 'table' | 'section';

type TitleTag = 'h1' | 'h2' | 'h3' | 'div' | 'p';

type SurfaceHeaderProps = {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  kicker?: React.ReactNode;
  status?: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  leadClassName?: string;
  bodyClassName?: string;
  kickerClassName?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  statusClassName?: string;
  iconClassName?: string;
  actionsClassName?: string;
  kind?: SurfaceKind;
  tone?: SurfaceTone;
  density?: SurfaceDensity;
  titleAs?: TitleTag;
  dir?: 'rtl' | 'ltr';
};

export default function SurfaceHeader({
  title,
  subtitle,
  kicker,
  status,
  icon,
  actions,
  className,
  leadClassName,
  bodyClassName,
  kickerClassName,
  titleClassName,
  subtitleClassName,
  statusClassName,
  iconClassName,
  actionsClassName,
  kind = 'section',
  tone = 'neutral',
  density = 'comfortable',
  titleAs = 'h3',
  dir = 'rtl',
}: SurfaceHeaderProps) {
  const Title = titleAs;

  return (
    <header
      className={cn('ux-surface-header', `ux-surface-header--${kind}`, className)}
      data-ui-surface-header="true"
      data-ui-surface-kind={kind}
      data-ui-tone={tone}
      data-ui-density={density}
      dir={dir}
    >
      <div className={cn('ux-surface-header__lead', leadClassName)}>
        {icon ? <span className={cn('ux-surface-header__icon', iconClassName)}>{icon}</span> : null}
        <div className={cn('ux-surface-header__body', bodyClassName)}>
          {kicker ? <div className={cn('ux-surface-header__kicker', kickerClassName)}>{kicker}</div> : null}
          <div className="ux-surface-header__title-row">
            {title ? <Title className={cn('ux-surface-header__title', titleClassName)}>{title}</Title> : null}
            {status ? <div className={cn('ux-surface-header__status', statusClassName)}>{status}</div> : null}
          </div>
          {subtitle ? <p className={cn('ux-surface-header__subtitle', subtitleClassName)}>{subtitle}</p> : null}
        </div>
      </div>
      {actions ? <div className={cn('ux-surface-header__actions', actionsClassName)}>{actions}</div> : null}
    </header>
  );
}
