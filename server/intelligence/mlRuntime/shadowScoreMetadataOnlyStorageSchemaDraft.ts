export type ShadowScoreMetadataOnlyStorageDraftStatus = 'pass' | 'warning' | 'fail';

export type ShadowScoreMetadataOnlyStorageDraftIssue = {
  code: string;
  message: string;
  path: string;
};

export type ShadowScoreMetadataOnlyStorageColumnDraft = {
  name: string;
  logicalType: 'string' | 'number' | 'boolean' | 'json' | 'timestamp' | 'nullable_number';
  required: boolean;
  description: string;
  indexed: boolean;
  unique: boolean;
  pii: false;
  businessMutable: false;
};

export type ShadowScoreMetadataOnlyStorageRowDraft = {
  storageRecordId: string;
  importRecordId: string;
  shadowScoreId: string;
  entityType: string;
  entityId: string;
  predictionType: string;
  horizonDays: number | null;
  candidateScore: number | null;
  candidateLabel: string;
  candidateConfidence: number | null;
  scoreQuality: string;
  modelKey: string;
  modelVersion: string;
  candidatePackageId: string;
  sourceImportFixtureId: string;
  sourceShadowExportId: string;
  sourceExportRecordHash: string;
  scoreGeneratedAt: string;
  exportGeneratedAt: string;
  importFixtureGeneratedAt: string;
  metadataFingerprint: string;
  idempotencyKey: string;
  storageClass: 'metadata_only_shadow_score_storage_schema_draft';
  storageMode: 'schema_draft_no_write';
  evidenceOnly: true;
  metadataOnly: true;
  schemaDraftOnly: true;
  repositoryWriteMethodAvailable: false;
  databaseWriteAllowed: false;
  routeExposed: false;
  modelExecutionAllowed: false;
  inferenceEndpointExposed: false;
  artifactActivationAllowed: false;
  businessMutationAllowed: false;
};

export type ShadowScoreMetadataOnlyStorageRowDraftValidation = {
  status: ShadowScoreMetadataOnlyStorageDraftStatus;
  warningCount: number;
  errorCount: number;
  warnings: ShadowScoreMetadataOnlyStorageDraftIssue[];
  errors: ShadowScoreMetadataOnlyStorageDraftIssue[];
};

export type ShadowScoreMetadataOnlyStoragePreviewInput = {
  records: ShadowScoreMetadataOnlyStorageRowDraft[];
};

export type ShadowScoreMetadataOnlyStorageSchemaDraftReport = {
  phase: 'Phase 13F';
  draftKind: 'metadata_only_shadow_score_storage_schema_draft';
  status: ShadowScoreMetadataOnlyStorageDraftStatus;
  tableDraftName: 'shadow_score_metadata_only_store_draft';
  repositoryInterfaceName: 'ShadowScoreMetadataOnlyStorageRepositoryDraft';
  recordCount: number;
  validRecordCount: number;
  warningCount: number;
  errorCount: number;
  warnings: ShadowScoreMetadataOnlyStorageDraftIssue[];
  errors: ShadowScoreMetadataOnlyStorageDraftIssue[];
  columns: ShadowScoreMetadataOnlyStorageColumnDraft[];
  indexes: string[];
  uniqueness: string[];
  repositoryBoundary: typeof SHADOW_SCORE_METADATA_ONLY_STORAGE_REPOSITORY_BOUNDARY_DRAFT;
  safetyPolicy: typeof SHADOW_SCORE_METADATA_ONLY_STORAGE_SCHEMA_DRAFT_POLICY;
  generatedAt: string;
};

export interface ShadowScoreMetadataOnlyStorageRepositoryDraft {
  readonly repositoryKind: 'metadata_only_shadow_score_storage_repository_interface_draft';
  readonly storageMode: 'schema_draft_no_write';
  readonly writeMethodsAvailable: false;
  previewStorageRows(input: ShadowScoreMetadataOnlyStoragePreviewInput): ShadowScoreMetadataOnlyStorageSchemaDraftReport;
  validateStorageRowDraft(row: ShadowScoreMetadataOnlyStorageRowDraft): ShadowScoreMetadataOnlyStorageRowDraftValidation;
}

const issue = (code: string, message: string, path: string): ShadowScoreMetadataOnlyStorageDraftIssue => ({
  code,
  message,
  path,
});

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const REQUIRED_FALSE_FLAGS = [
  'repositoryWriteMethodAvailable',
  'databaseWriteAllowed',
  'routeExposed',
  'modelExecutionAllowed',
  'inferenceEndpointExposed',
  'artifactActivationAllowed',
  'businessMutationAllowed',
] as const;

const REQUIRED_TRUE_FLAGS = ['evidenceOnly', 'metadataOnly', 'schemaDraftOnly'] as const;

export const SHADOW_SCORE_METADATA_ONLY_STORAGE_SCHEMA_DRAFT_COLUMNS: ShadowScoreMetadataOnlyStorageColumnDraft[] = [
  {
    name: 'storageRecordId',
    logicalType: 'string',
    required: true,
    description: 'Deterministic metadata storage record identifier for a future table boundary.',
    indexed: true,
    unique: true,
    pii: false,
    businessMutable: false,
  },
  {
    name: 'importRecordId',
    logicalType: 'string',
    required: true,
    description: 'Identifier from the metadata-only shadow score import fixture.',
    indexed: true,
    unique: false,
    pii: false,
    businessMutable: false,
  },
  {
    name: 'shadowScoreId',
    logicalType: 'string',
    required: true,
    description: 'Stable offline shadow score identifier.',
    indexed: true,
    unique: false,
    pii: false,
    businessMutable: false,
  },
  {
    name: 'entityType',
    logicalType: 'string',
    required: true,
    description: 'Business entity class described by metadata without mutating the entity.',
    indexed: true,
    unique: false,
    pii: false,
    businessMutable: false,
  },
  {
    name: 'entityId',
    logicalType: 'string',
    required: true,
    description: 'Business entity identifier copied as metadata only.',
    indexed: true,
    unique: false,
    pii: false,
    businessMutable: false,
  },
  {
    name: 'predictionType',
    logicalType: 'string',
    required: true,
    description: 'Offline prediction family represented as evidence only.',
    indexed: true,
    unique: false,
    pii: false,
    businessMutable: false,
  },
  {
    name: 'candidateScore',
    logicalType: 'nullable_number',
    required: false,
    description: 'Offline candidate score value or null when unavailable.',
    indexed: false,
    unique: false,
    pii: false,
    businessMutable: false,
  },
  {
    name: 'candidateConfidence',
    logicalType: 'nullable_number',
    required: false,
    description: 'Offline confidence value bounded between zero and one when present.',
    indexed: false,
    unique: false,
    pii: false,
    businessMutable: false,
  },
  {
    name: 'modelKey',
    logicalType: 'string',
    required: true,
    description: 'Offline candidate model key stored as metadata only.',
    indexed: true,
    unique: false,
    pii: false,
    businessMutable: false,
  },
  {
    name: 'modelVersion',
    logicalType: 'string',
    required: true,
    description: 'Offline candidate model version stored as metadata only.',
    indexed: true,
    unique: false,
    pii: false,
    businessMutable: false,
  },
  {
    name: 'candidatePackageId',
    logicalType: 'string',
    required: true,
    description: 'Candidate package evidence identifier.',
    indexed: true,
    unique: false,
    pii: false,
    businessMutable: false,
  },
  {
    name: 'metadataFingerprint',
    logicalType: 'string',
    required: true,
    description: 'Deterministic fingerprint for idempotent future metadata-only storage.',
    indexed: true,
    unique: true,
    pii: false,
    businessMutable: false,
  },
  {
    name: 'idempotencyKey',
    logicalType: 'string',
    required: true,
    description: 'Idempotency key for a future metadata-only repository boundary.',
    indexed: true,
    unique: true,
    pii: false,
    businessMutable: false,
  },
  {
    name: 'evidenceOnly',
    logicalType: 'boolean',
    required: true,
    description: 'Must remain true to prevent operational use.',
    indexed: true,
    unique: false,
    pii: false,
    businessMutable: false,
  },
  {
    name: 'metadataOnly',
    logicalType: 'boolean',
    required: true,
    description: 'Must remain true to prevent model/runtime execution semantics.',
    indexed: true,
    unique: false,
    pii: false,
    businessMutable: false,
  },
];

export const SHADOW_SCORE_METADATA_ONLY_STORAGE_REPOSITORY_BOUNDARY_DRAFT = {
  phase: 'Phase 13F',
  repositoryInterfaceOnly: true,
  repositoryImplementationAdded: false,
  repositoryWriteMethodsAvailable: false,
  schemaDraftOnly: true,
  migrationAdded: false,
  tableCreated: false,
  connectsToDatabase: false,
  persistsToDatabase: false,
  readsWorkbenchOutputFiles: false,
  exposesRoute: false,
  acceptsPayloadObjectOnly: true,
  requiresPhase13DValidatorBeforeFutureStorage: true,
  requiresPhase13EDryRunBeforeFutureStorage: true,
} as const;

export const SHADOW_SCORE_METADATA_ONLY_STORAGE_SCHEMA_DRAFT_POLICY = {
  phase: 'Phase 13F',
  metadataOnly: true,
  schemaDraftOnly: true,
  repositoryInterfaceOnly: true,
  repositoryImplementationAdded: false,
  migrationAdded: false,
  tableCreated: false,
  storesValidatedMetadata: false,
  persistsToDatabase: false,
  connectsToDatabase: false,
  exposesRoute: false,
  readsWorkbenchOutputFiles: false,
  loadsModelArtifact: false,
  importsJoblibOrSklearn: false,
  modelExecutionAllowed: false,
  runtimeInvocationAllowed: false,
  inferenceEndpointExposed: false,
  productionIntegrationAllowed: false,
  decisionAutomationAllowed: false,
  canChangeInventoryOrAccounting: false,
  canChangePricing: false,
  canChangeReports: false,
  canChangeLedger: false,
  canMutateBusinessRecords: false,
  artifactExecutionAllowed: false,
  artifactActivationAllowed: false,
  artifactBytesLoadingAllowed: false,
  rawTrainingCsvLoadingAllowed: false,
  automaticDeletionAllowed: false,
  purgeJobAllowed: false,
} as const;

const requireString = (
  row: Record<string, unknown>,
  key: keyof ShadowScoreMetadataOnlyStorageRowDraft,
  errors: ShadowScoreMetadataOnlyStorageDraftIssue[],
): void => {
  if (typeof row[key] !== 'string' || String(row[key]).trim().length === 0) {
    errors.push(issue('missing_string', `${String(key)} must be a non-empty string.`, String(key)));
  }
};

export const validateShadowScoreMetadataOnlyStorageRowDraft = (
  row: ShadowScoreMetadataOnlyStorageRowDraft,
): ShadowScoreMetadataOnlyStorageRowDraftValidation => {
  const warnings: ShadowScoreMetadataOnlyStorageDraftIssue[] = [];
  const errors: ShadowScoreMetadataOnlyStorageDraftIssue[] = [];

  if (!isRecord(row)) {
    return {
      status: 'fail',
      warningCount: 0,
      errorCount: 1,
      warnings,
      errors: [issue('invalid_row', 'Storage row draft must be an object.', '$')],
    };
  }

  for (const key of [
    'storageRecordId',
    'importRecordId',
    'shadowScoreId',
    'entityType',
    'entityId',
    'predictionType',
    'candidateLabel',
    'scoreQuality',
    'modelKey',
    'modelVersion',
    'candidatePackageId',
    'sourceImportFixtureId',
    'sourceShadowExportId',
    'sourceExportRecordHash',
    'scoreGeneratedAt',
    'exportGeneratedAt',
    'importFixtureGeneratedAt',
    'metadataFingerprint',
    'idempotencyKey',
  ] as const) {
    requireString(row, key, errors);
  }

  if (row.storageClass !== 'metadata_only_shadow_score_storage_schema_draft') {
    errors.push(issue('invalid_storage_class', 'storageClass must be metadata_only_shadow_score_storage_schema_draft.', 'storageClass'));
  }
  if (row.storageMode !== 'schema_draft_no_write') {
    errors.push(issue('invalid_storage_mode', 'storageMode must be schema_draft_no_write.', 'storageMode'));
  }

  for (const key of REQUIRED_TRUE_FLAGS) {
    if (row[key] !== true) {
      errors.push(issue('required_true_flag', `${key} must be true.`, key));
    }
  }
  for (const key of REQUIRED_FALSE_FLAGS) {
    if (row[key] !== false) {
      errors.push(issue('required_false_flag', `${key} must be false.`, key));
    }
  }

  if (row.horizonDays !== null && (!Number.isInteger(row.horizonDays) || row.horizonDays < 1)) {
    errors.push(issue('invalid_horizon', 'horizonDays must be a positive integer or null.', 'horizonDays'));
  }
  if (row.candidateScore !== null && (typeof row.candidateScore !== 'number' || !Number.isFinite(row.candidateScore))) {
    errors.push(issue('invalid_score', 'candidateScore must be a finite number or null.', 'candidateScore'));
  }
  if (
    row.candidateConfidence !== null &&
    (typeof row.candidateConfidence !== 'number' || row.candidateConfidence < 0 || row.candidateConfidence > 1)
  ) {
    errors.push(issue('invalid_confidence', 'candidateConfidence must be between 0 and 1 or null.', 'candidateConfidence'));
  }

  return {
    status: errors.length > 0 ? 'fail' : warnings.length > 0 ? 'warning' : 'pass',
    warningCount: warnings.length,
    errorCount: errors.length,
    warnings,
    errors,
  };
};

export const buildShadowScoreMetadataOnlyStorageSchemaDraftReport = (
  input: ShadowScoreMetadataOnlyStoragePreviewInput,
): ShadowScoreMetadataOnlyStorageSchemaDraftReport => {
  const warnings: ShadowScoreMetadataOnlyStorageDraftIssue[] = [];
  const errors: ShadowScoreMetadataOnlyStorageDraftIssue[] = [];
  const seenStorageRecordIds = new Set<string>();
  const seenFingerprints = new Set<string>();
  const seenIdempotencyKeys = new Set<string>();
  let validRecordCount = 0;

  for (const [index, row] of input.records.entries()) {
    const validation = validateShadowScoreMetadataOnlyStorageRowDraft(row);
    warnings.push(...validation.warnings.map((item) => ({ ...item, path: `records[${index}].${item.path}` })));
    errors.push(...validation.errors.map((item) => ({ ...item, path: `records[${index}].${item.path}` })));
    if (validation.status !== 'fail') validRecordCount += 1;

    for (const [key, value, seen] of [
      ['storageRecordId', row.storageRecordId, seenStorageRecordIds],
      ['metadataFingerprint', row.metadataFingerprint, seenFingerprints],
      ['idempotencyKey', row.idempotencyKey, seenIdempotencyKeys],
    ] as const) {
      if (seen.has(value)) {
        errors.push(issue('duplicate_unique_value', `${key} must be unique in the storage draft preview.`, `records[${index}].${key}`));
      }
      seen.add(value);
    }
  }

  return {
    phase: 'Phase 13F',
    draftKind: 'metadata_only_shadow_score_storage_schema_draft',
    status: errors.length > 0 ? 'fail' : warnings.length > 0 ? 'warning' : 'pass',
    tableDraftName: 'shadow_score_metadata_only_store_draft',
    repositoryInterfaceName: 'ShadowScoreMetadataOnlyStorageRepositoryDraft',
    recordCount: input.records.length,
    validRecordCount,
    warningCount: warnings.length,
    errorCount: errors.length,
    warnings,
    errors,
    columns: SHADOW_SCORE_METADATA_ONLY_STORAGE_SCHEMA_DRAFT_COLUMNS,
    indexes: ['entityType+entityId', 'predictionType', 'modelKey+modelVersion', 'candidatePackageId', 'metadataFingerprint'],
    uniqueness: ['storageRecordId', 'metadataFingerprint', 'idempotencyKey'],
    repositoryBoundary: SHADOW_SCORE_METADATA_ONLY_STORAGE_REPOSITORY_BOUNDARY_DRAFT,
    safetyPolicy: SHADOW_SCORE_METADATA_ONLY_STORAGE_SCHEMA_DRAFT_POLICY,
    generatedAt: new Date().toISOString(),
  };
};
