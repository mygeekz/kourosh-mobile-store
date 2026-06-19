import React from 'react';

type Props = {
  title: string;
  subtitle?: string;
  icon?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
};

export default function ModernReportShell({ title, subtitle, icon, actions, children }: Props) {
  return (
    <div className="ux-report-shell report-page space-y-3 report-shell-v2-page reports-redesign-v1" dir="rtl" data-ui-report-shell="modern" data-ui-report-page="true">
      <header className="ux-toolbar-surface ux-toolbar-surface--premium ux-report-shell-head reports-shell-compact-head report-shell-v2-head" data-ui-report-header="inner">
        <div className="report-shell-v2-main" data-ui-report-header-main="true">
          <div className="report-shell-v2-titleCluster" data-ui-report-title-cluster="true">
            {icon ? <div className="report-shell-v2-icon" aria-hidden="true">{icon}</div> : null}

            <div className="report-shell-v2-copy">
              <div className="report-shell-v2-crumbs">
                <span className="report-shell-v2-kicker">گزارش تحلیلی</span>
                <h1 className="report-shell-v2-title">{title}</h1>
              </div>
              {subtitle ? <p className="report-shell-v2-subtitle">{subtitle}</p> : null}
            </div>
          </div>

          {actions ? <div className="report-shell-v2-actions">{actions}</div> : null}
        </div>
      </header>

      <div className="ux-report-shell-body report-shell-v2-body" data-ui-report-body="true">{children}</div>
    </div>
  );
}
