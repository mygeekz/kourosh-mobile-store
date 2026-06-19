import React from 'react';
import { Link } from 'react-router-dom';

type Props = {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  badge?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
};

const PremiumReportShell: React.FC<Props> = ({ title, subtitle, icon, badge, right, children }) => {
  return (
    <div className="report-page reports-premium-feel report-shell-v2-page reports-redesign-v1" dir="rtl" data-ui-report-shell="premium" data-ui-report-page="true">
      <div className="report-surface report-surface-inner report-shell-v2-surface" data-ui-report-surface="true">
        <header className="report-shell-premium-head reports-shell-compact-head report-shell-v2-head" data-ui-report-header="inner">
          <div className="report-shell-v2-main" data-ui-report-header-main="true">
            <div className="report-shell-v2-titleCluster" data-ui-report-title-cluster="true">
              {icon ? <div className="report-shell-v2-icon" aria-hidden="true">{icon}</div> : null}

              <div className="report-shell-v2-copy">
                <div className="report-shell-v2-crumbs">
                  <Link className="report-shell-v2-crumbLink" to="/reports">گزارش‌ها</Link>
                  <span className="report-shell-v2-crumbSep" aria-hidden="true">/</span>
                  <h1 className="report-shell-v2-title">{title}</h1>
                  {badge ? <span className="report-shell-v2-badge">{badge}</span> : null}
                </div>
                {subtitle ? <p className="report-shell-v2-subtitle">{subtitle}</p> : null}
              </div>
            </div>

            {right ? <div className="report-shell-v2-actions">{right}</div> : null}
          </div>
        </header>

        <div className="report-shell-v2-body" data-ui-report-body="true">{children}</div>
      </div>
    </div>
  );
};

export default PremiumReportShell;
