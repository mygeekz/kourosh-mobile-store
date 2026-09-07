import React from 'react';

import { IconGlyph } from '@/components/ui';
import { Surface } from '@/components/ui';
type Props = {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode | string;
  actions?: React.ReactNode;
  toolbarRight?: React.ReactNode;
  className?: string;
  backAction?: () => void;
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void | Promise<void>;
  children: React.ReactNode;
};

export default function ModernReportShell({ title, subtitle, icon, actions, toolbarRight, children, className }: Props) {
  return (
    <div className={['ux-report-shell report-page space-y-3 report-shell-v2-page reports-redesign-v1', className || ''].join(' ')} dir="rtl" data-ui-report-shell="modern" data-ui-report-page="true">
      <Surface
        surface="glass"
        variant="bar"
        scheme="adaptive"
        wrapContent={false}
        className="ux-report-shell-head reports-shell-compact-head report-shell-v2-head rounded-[18px]"
        data-ui-report-header="inner"
      >
        <div className="report-shell-v2-main" data-ui-report-header-main="true">
          <div className="report-shell-v2-titleCluster" data-ui-report-title-cluster="true">
            {icon ? (
              <IconGlyph size="lg" tone="accent" className="report-shell-v2-icon" aria-hidden="true">
                {typeof icon === 'string' ? <i className={icon} /> : icon}
              </IconGlyph>
            ) : null}

            <div className="report-shell-v2-copy">
              <div className="report-shell-v2-crumbs">
                <span className="report-shell-v2-kicker">گزارش تحلیلی</span>
                <h1 className="report-shell-v2-title">{title}</h1>
              </div>
              {subtitle ? <p className="report-shell-v2-subtitle">{subtitle}</p> : null}
            </div>
          </div>

          {(actions || toolbarRight) ? <div className="report-shell-v2-actions">{actions || toolbarRight}</div> : null}
        </div>
      </Surface>

      <div className="ux-report-shell-body report-shell-v2-body" data-ui-report-body="true">{children}</div>
    </div>
  );
}
