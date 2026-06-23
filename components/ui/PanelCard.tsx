import React from 'react';
import { cn } from '../../utils/cn';
import SurfaceHeader, { type SurfaceDensity, type SurfaceTone } from './SurfaceHeader';

interface PanelCardProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  footerClassName?: string;
  density?: SurfaceDensity;
  tone?: SurfaceTone;
  padded?: boolean;
  headerDivider?: boolean;
}

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
}: PanelCardProps) {
  const hasHeader = Boolean(title || subtitle || icon || actions);

  return (
    <section
      className={cn('ux-panel-card', !padded ? 'ux-panel-card--flush' : '', className)}
      data-ui-surface="panel-card"
      data-ui-card="true"
      data-ui-density={density}
      data-ui-tone={tone}
      dir="rtl"
    >
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
      {footer ? <footer className={cn('ux-panel-card__footer', footerClassName)}>{footer}</footer> : null}
    </section>
  );
}
