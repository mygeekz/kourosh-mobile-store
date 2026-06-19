import React from 'react';
import { cn } from '../../utils/cn';

interface PanelCardProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export default function PanelCard({ title, subtitle, icon, actions, children, className }: PanelCardProps) {
  return (
    <section className={cn('ux-panel-card', className)} data-ui-surface="panel-card" data-ui-card="true" dir="rtl">
      {(title || actions) ? (
        <header className="ux-panel-card__header">
          <div className="ux-panel-card__lead" data-ui-card-lead="true">
            {icon ? <span className="ux-panel-card__icon">{icon}</span> : null}
            <div>
              {title ? <h3 className="ux-panel-card__title">{title}</h3> : null}
              {subtitle ? <p className="ux-panel-card__subtitle">{subtitle}</p> : null}
            </div>
          </div>
          {actions ? <div className="ux-panel-card__actions" data-ui-card-actions="true">{actions}</div> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}
