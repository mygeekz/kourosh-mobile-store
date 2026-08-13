import type { ImportResultPayload, MetadataToShadowReadinessBridgePayload } from './metadataImportDashboardTypes';
import type {
  MetadataConsistencyBatchCell,
  MetadataConsistencyFieldCluster,
  MetadataConsistencyFieldKey,
  MetadataConsistencyHeatmapPayload,
  MetadataConsistencySeverity,
} from './metadataImportConsistencyHeatmapTypes';

const FIELD_LABELS: Record<MetadataConsistencyFieldKey, string> = {
  candidatePackageId: 'شناسه کاندید',
  modelKey: 'کلید مدل',
  modelVersion: 'نسخه مدل',
  predictionType: 'نوع پیش‌بینی',
  validationStatus: 'اعتبارسنجی',
  safetyPolicyStatus: 'سیاست ایمنی',
  candidateManifestHash: 'چک‌سام',
  trainingPackageReference: 'مرجع آموزش',
  metadataOnly: 'فقط متادیتا',
  warningCount: 'هشدارها',
  errorCount: 'خطاها',
  forbiddenFieldCount: 'فیلدهای ممنوع',
  createdAt: 'زمان ایجاد',
};

const FIELD_ORDER: MetadataConsistencyFieldKey[] = [
  'candidatePackageId',
  'modelKey',
  'modelVersion',
  'predictionType',
  'validationStatus',
  'safetyPolicyStatus',
  'candidateManifestHash',
  'trainingPackageReference',
  'metadataOnly',
  'warningCount',
  'errorCount',
  'forbiddenFieldCount',
  'createdAt',
];

const CLUSTER_DEFINITIONS: Array<Pick<MetadataConsistencyFieldCluster, 'id' | 'label' | 'description' | 'fieldKeys'>> = [
  {
    id: 'identity_fields',
    label: 'فیلدهای هویتی',
    description: 'شناسه‌های کاندید، مدل و نوع پیش‌بینی در بین بچ‌های واردشده.',
    fieldKeys: ['candidatePackageId', 'modelKey', 'modelVersion', 'predictionType'],
  },
  {
    id: 'contract_fields',
    label: 'فیلدهای قراردادی',
    description: 'فیلدهای اعتبارسنجی و چک‌سام برای مقایسه بسته‌های متادیتا.',
    fieldKeys: ['validationStatus', 'candidateManifestHash'],
  },
  {
    id: 'safety_fields',
    label: 'فیلدهای ایمنی',
    description: 'مدرک فقط‌متادیتا، سیاست ایمنی و شمارنده‌های هشدار/خطا.',
    fieldKeys: ['safetyPolicyStatus', 'metadataOnly', 'warningCount', 'errorCount', 'forbiddenFieldCount'],
  },
  {
    id: 'lineage_fields',
    label: 'فیلدهای ردیابی',
    description: 'فیلدهای ارجاع به بسته آموزش برای ردیابی.',
    fieldKeys: ['trainingPackageReference'],
  },
  {
    id: 'timeline_fields',
    label: 'فیلدهای زمانی',
    description: 'فیلدهای زمانی برای مرتب‌سازی بچ‌های واردشده.',
    fieldKeys: ['createdAt'],
  },
];

const normalizeValue = (value: unknown): string => {
  if (value === true) return 'true';
  if (value === false) return 'false';
  if (value === null || typeof value === 'undefined') return '';
  return String(value).trim();
};

const getFieldValue = (row: Record<string, unknown>, fieldKey: MetadataConsistencyFieldKey): string => normalizeValue(row[fieldKey]);

const toSeverity = (present: boolean, stableWithPrevious: boolean | null): MetadataConsistencySeverity => {
  if (!present) return 'missing';
  if (stableWithPrevious === false) return 'inconsistent';
  if (stableWithPrevious === null) return 'watch';
  return 'stable';
};

const severityFromRatios = (presentRatio: number, stabilityRatio: number): MetadataConsistencySeverity => {
  if (presentRatio < 0.7) return 'missing';
  if (stabilityRatio < 0.65) return 'inconsistent';
  if (presentRatio < 1 || stabilityRatio < 0.9) return 'watch';
  return 'stable';
};

const stableCellScore = (cell: MetadataConsistencyBatchCell): number => {
  if (!cell.present) return 0;
  if (cell.stableWithPrevious === false) return 0.45;
  if (cell.stableWithPrevious === null) return 0.75;
  return 1;
};

export function deriveMetadataConsistencyHeatmapPayload(
  importPayload: ImportResultPayload | null,
  readinessPayload: MetadataToShadowReadinessBridgePayload | null,
): MetadataConsistencyHeatmapPayload {
  const importRows = importPayload?.rows || [];
  const readinessRows = readinessPayload?.rows || [];
  const rowByCandidateId = new Map<string, Record<string, unknown>>();

  for (const row of importRows) {
    const key = normalizeValue(row.candidatePackageId) || normalizeValue(row.modelVersion) || `import-${rowByCandidateId.size + 1}`;
    rowByCandidateId.set(key, { ...row });
  }

  for (const row of readinessRows) {
    const key = normalizeValue(row.candidatePackageId) || normalizeValue(row.modelVersion) || `readiness-${rowByCandidateId.size + 1}`;
    rowByCandidateId.set(key, { ...(rowByCandidateId.get(key) || {}), ...row });
  }

  const rows = Array.from(rowByCandidateId.entries()).map(([candidatePackageId, row]) => ({ candidatePackageId, ...row }));
  const limitedRows = rows.slice(0, 8);
  const cells: MetadataConsistencyBatchCell[] = [];

  for (const [rowIndex, row] of limitedRows.entries()) {
    for (const fieldKey of FIELD_ORDER) {
      const value = getFieldValue(row, fieldKey);
      const previousValue = rowIndex > 0 ? getFieldValue(limitedRows[rowIndex - 1], fieldKey) : '';
      const present = value.length > 0;
      const stableWithPrevious = rowIndex === 0 ? null : present && previousValue.length > 0 && value === previousValue;
      cells.push({
        candidatePackageId: normalizeValue(row.candidatePackageId) || `Batch ${rowIndex + 1}`,
        fieldKey,
        fieldLabel: FIELD_LABELS[fieldKey],
        present,
        stableWithPrevious,
        normalizedValue: value || '—',
        severity: toSeverity(present, stableWithPrevious),
        metadataOnlyCell: true,
      });
    }
  }

  const clusters = CLUSTER_DEFINITIONS.map((definition): MetadataConsistencyFieldCluster => {
    const clusterCells = cells.filter((cell) => definition.fieldKeys.includes(cell.fieldKey));
    const presentRatio = clusterCells.length ? clusterCells.filter((cell) => cell.present).length / clusterCells.length : 0;
    const comparableCells = clusterCells.filter((cell) => cell.stableWithPrevious !== null);
    const stabilityRatio = comparableCells.length ? comparableCells.filter((cell) => cell.stableWithPrevious === true).length / comparableCells.length : 1;
    return {
      ...definition,
      presentRatio,
      stabilityRatio,
      severity: severityFromRatios(presentRatio, stabilityRatio),
      simpleDeterministicCluster: true,
    };
  });

  const stableCellCount = cells.filter((cell) => cell.severity === 'stable').length;
  const watchCellCount = cells.filter((cell) => cell.severity === 'watch').length;
  const inconsistentCellCount = cells.filter((cell) => cell.severity === 'inconsistent').length;
  const missingCellCount = cells.filter((cell) => cell.severity === 'missing').length;
  const consistencyScore = cells.length ? ((cells.reduce((sum, cell) => sum + stableCellScore(cell), 0) / cells.length) * 100) : 0;

  return {
    summary: {
      phase: 'Phase 12D',
      status: 'metadata_consistency_heatmap_ui_only',
      batchCount: limitedRows.length,
      fieldCount: FIELD_ORDER.length,
      stableCellCount,
      watchCellCount,
      inconsistentCellCount,
      missingCellCount,
      consistencyScore,
      metadataOnlyHeatmap: true,
      uiOnlyVisualization: true,
      deterministicClusteringOnly: true,
      usesExistingDashboardPayloadOnly: true,
      apiRouteAdded: false,
      databaseMutationAllowed: false,
      modelExecutionAllowed: false,
      runtimeInvocationAllowed: false,
      inferenceEndpointExposed: false,
      productionIntegrationAllowed: false,
      decisionAutomationAllowed: false,
      artifactActivationAllowed: false,
      canMutateBusinessRecords: false,
    },
    batches: limitedRows.map((row, index) => normalizeValue(row.candidatePackageId) || `Batch ${index + 1}`),
    fieldLabels: FIELD_LABELS,
    cells,
    clusters,
    rows: limitedRows,
  };
}

export function getMetadataConsistencySeverityLabel(severity: MetadataConsistencySeverity): string {
  if (severity === 'stable') return 'پایدار';
  if (severity === 'watch') return 'نیازمند توجه';
  if (severity === 'inconsistent') return 'ناسازگار';
  return 'ناموجود';
}

export function getMetadataConsistencyCellClass(severity: MetadataConsistencySeverity): string {
  if (severity === 'stable') return 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-100';
  if (severity === 'watch') return 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/70 dark:bg-sky-950/30 dark:text-sky-100';
  if (severity === 'inconsistent') return 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-100';
  return 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-100';
}
