import React from 'react';
import ActionCenterWidget from '../../../components/ActionCenterWidget';
import type { DashboardWidgetProps } from '../types';

export default function ActionCenterWidgetCard(_props: DashboardWidgetProps) {
  return (
    <div className="h-full dashboard-action-center-widget" data-ui-dashboard-widget-kind="action-center" data-ui-notification-surface="action-center-widget">
      <ActionCenterWidget />
    </div>
  );
}
