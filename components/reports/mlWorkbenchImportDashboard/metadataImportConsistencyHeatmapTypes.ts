import type { ImportResultRow, MetadataToShadowReadinessBridgeRow } from './metadataImportDashboardTypes';

export type MetadataConsistencySeverity = 'stable' | 'watch' | 'inconsistent' | 'missing';

export type MetadataConsistencyFieldKey =
  | 'candidatePackageId'
  | 'modelKey'
  | 'modelVersion'
  | 'predictionType'
  | 'validationStatus'
  | 'safetyPolicyStatus'
  | 'candidateManifestHash'
  | 'trainingPackageReference'
  | 'metadataOnly'
  | 'warningCount'
  | 'errorCount'
  | 'forbiddenFieldCount'
  | 'createdAt';

export type MetadataConsistencyBatchCell = {
  candidatePackageId: string;
  fieldKey: MetadataConsistencyFieldKey;
  fieldLabel: string;
  present: boolean;
  stableWithPrevious: boolean | null;
  normalizedValue: string;
  severity: MetadataConsistencySeverity;
  metadataOnlyCell: true;
};

export type MetadataConsistencyFieldCluster = {
  id: 'identity_fields' | 'contract_fields' | 'safety_fields' | 'lineage_fields' | 'timeline_fields';
  label: string;
  description: string;
  fieldKeys: MetadataConsistencyFieldKey[];
  presentRatio: number;
  stabilityRatio: number;
  severity: MetadataConsistencySeverity;
  simpleDeterministicCluster: true;
};

export type MetadataConsistencyHeatmapSummary = {
  phase: 'Phase 12D';
  status: 'metadata_consistency_heatmap_ui_only';
  batchCount: number;
  fieldCount: number;
  stableCellCount: number;
  watchCellCount: number;
  inconsistentCellCount: number;
  missingCellCount: number;
  consistencyScore: number;
  metadataOnlyHeatmap: true;
  uiOnlyVisualization: true;
  deterministicClusteringOnly: true;
  usesExistingDashboardPayloadOnly: true;
  apiRouteAdded: false;
  databaseMutationAllowed: false;
  modelExecutionAllowed: false;
  runtimeInvocationAllowed: false;
  inferenceEndpointExposed: false;
  productionIntegrationAllowed: false;
  decisionAutomationAllowed: false;
  artifactActivationAllowed: false;
  canMutateBusinessRecords: false;
};

export type MetadataConsistencyHeatmapPayload = {
  summary: MetadataConsistencyHeatmapSummary;
  batches: string[];
  fieldLabels: Record<MetadataConsistencyFieldKey, string>;
  cells: MetadataConsistencyBatchCell[];
  clusters: MetadataConsistencyFieldCluster[];
  rows: Array<ImportResultRow | MetadataToShadowReadinessBridgeRow>;
};
