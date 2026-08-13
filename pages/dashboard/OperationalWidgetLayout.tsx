import type { ReactNode } from 'react';

type OperationalWidgetLayoutProps = {
  header: ReactNode;
  children: ReactNode;
  compact?: boolean;
  scrollLabel: string;
  scroll?: boolean;
};

/** Canonical header/body split for operational dashboard widgets. */
export default function OperationalWidgetLayout({
  header,
  children,
  compact = false,
  scrollLabel,
  scroll = true,
}: OperationalWidgetLayoutProps) {
  return (
    <section
      data-ui-dashboard-operational-panel="true"
      data-dashboard-widget-density={compact ? 'compact' : 'regular'}
      className="app-dashboard-operational"
    >
      <header data-ui-dashboard-operational-header="true" className="app-dashboard-operational__header">
        {header}
      </header>
      <div data-ui-dashboard-operational-body="true" className="app-dashboard-operational__body">
        <div
          data-ui-dashboard-operational-scroll={scroll ? 'true' : 'false'}
          role="region"
          aria-label={scrollLabel}
          tabIndex={scroll ? 0 : undefined}
          className={scroll ? 'app-dashboard-operational__viewport' : 'app-dashboard-operational__content'}
        >
          {children}
        </div>
      </div>
    </section>
  );
}
