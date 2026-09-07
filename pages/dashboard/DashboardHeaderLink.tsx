import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

type DashboardHeaderLinkProps = {
  to: string;
  children: ReactNode;
  ariaLabel?: string;
};

/** Canonical compact text link used in dashboard headers and metric metadata. */
export default function DashboardHeaderLink({ to, children, ariaLabel }: DashboardHeaderLinkProps) {
  return (
    <Link
      to={to}
      aria-label={ariaLabel}
      className="app-dashboard-header-link"
      data-dashboard-header-link="true"
      data-rgl-no-drag
    >
      {children}
    </Link>
  );
}
