import type {
  ShadowScoreMetadataSafetyPolicy,
  ShadowScoreMetadataStorageIssue,
  ShadowScoreMetadataStorageStatus,
  StoredShadowScoreMetadataRecord,
} from '../shadowScoreMetadataStorageTypes';

export type BaselineScoreMetadataRecord = {
  baselineRecordId?: string;
  entityType?: string;
  entityId?: string;
  predictionType?: string;
  horizonDays?: number | null;
  score?: number | null;
  baselineScore?: number | null;
  label?: string | null;
  baselineLabel?: string | null;
  confidence?: number | null;
  baselineConfidence?: number | null;
  modelKey?: string;
  modelVersion?: string;
  baselineSource?: string;
  baselineKey?: string;
  baselineVersion?: string;
  baselineGeneratedAt?: string;
  sourceRowIndex?: number;
  sourceBaselineRecordHash?: string;
  scoreGeneratedAt?: string;
  metadataOnly?: boolean;
  evidenceOnly?: boolean;
  modelExecutionAllowed?: boolean;
  inferenceEndpointExposed?: boolean;
  artifactActivationAllowed?: boolean;
  businessMutationAllowed?: boolean;
  [key: string]: unknown;
};

export type BaselineScoreMetadataPayload = {
  contractVersion?: string;
  fixtureKind?: string;
  fixtureId?: string;
  metadataOnly?: boolean;
  evidenceOnly?: boolean;
  baselineSource?: string;
  baselineKey?: string;
  baselineVersion?: string;
  baselineGeneratedAt?: string;
  baselinePayloadHash?: string;
  baselineValidationStatus?: string;
  candidatePackageId?: string;
  modelKey?: string;
  modelVersion?: string;
  predictionType?: string;
  horizonDays?: number | null;
  generatedAt?: string;
  safetyPolicy?: Partial<ShadowScoreMetadataSafetyPolicy>;
  records?: BaselineScoreMetadataRecord[];
  [key: string]: unknown;
};

export type BaselineScoreMetadataValidationReport = {
  phase: 'Phase 15A';
  validationKind: 'metadata_only_baseline_score_metadata_validation';
  status: ShadowScoreMetadataStorageStatus;
  metadataOnly: boolean;
  recordCount: number;
  validatedRecordCount: number;
  forbiddenFieldCount: number;
  warningCount: number;
  errorCount: number;
  warnings: ShadowScoreMetadataStorageIssue[];
  errors: ShadowScoreMetadataStorageIssue[];
  importPayloadHash: string;
  baselineSource: string | null;
  baselineKey: string | null;
  baselineVersion: string | null;
  baselineGeneratedAt: string | null;
  safetyPolicy: ShadowScoreMetadataSafetyPolicy | null;
  safetyFlags: {
    modelExecutionAllowed: false;
    runtimeInvocationAllowed: false;
    inferenceEndpointExposed: false;
    artifactActivationAllowed: false;
    canMutateBusinessRecords: false;
  };
};

export type BaselineScoreMetadataStorageServiceResult = {
  phase: 'Phase 15A';
  storageKind: 'metadata_only_stored_baseline_score_source';
  status: ShadowScoreMetadataStorageStatus;
  validation: BaselineScoreMetadataValidationReport;
  requestedRecordCount: number;
  normalizedRecordCount: number;
  insertedCount: number;
  duplicateCount: number;
  rejectedCount: number;
  records: StoredShadowScoreMetadataRecord[];
  safetyPolicy: ShadowScoreMetadataSafetyPolicy | null;
  modelExecutionAllowed: false;
  runtimeInvocationAllowed: false;
  inferenceEndpointExposed: false;
  artifactActivationAllowed: false;
  canMutateBusinessRecords: false;
};
