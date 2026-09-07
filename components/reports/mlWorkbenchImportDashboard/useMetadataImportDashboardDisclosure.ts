import { useState } from 'react';
import type { Phase11LDisclosurePanelKey } from './metadataImportDashboardTypes';

export function useMetadataImportDashboardDisclosure() {
  const [expandedMlPanels, setExpandedMlPanels] = useState<Record<Phase11LDisclosurePanelKey, boolean>>({
    shadowReadiness: false,
    consistencyHeatmap: false,
    offlineMetrics: false,
    trendRegression: false,
    annotationWorkspace: false,
  });

  const toggleMlDisclosurePanel = (panelKey: Phase11LDisclosurePanelKey) => {
    setExpandedMlPanels((current) => ({
      ...current,
      [panelKey]: !current[panelKey],
    }));
  };

  return { expandedMlPanels, toggleMlDisclosurePanel };
}
