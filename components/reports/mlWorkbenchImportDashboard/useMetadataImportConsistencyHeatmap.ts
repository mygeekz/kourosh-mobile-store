import { useMemo } from 'react';
import type { ImportResultPayload, MetadataToShadowReadinessBridgePayload } from './metadataImportDashboardTypes';
import { deriveMetadataConsistencyHeatmapPayload } from './metadataImportConsistencyHeatmapUtils';

export function useMetadataImportConsistencyHeatmap(
  importPayload: ImportResultPayload | null,
  readinessPayload: MetadataToShadowReadinessBridgePayload | null,
) {
  return useMemo(
    () => deriveMetadataConsistencyHeatmapPayload(importPayload, readinessPayload),
    [importPayload, readinessPayload],
  );
}
