import type {
  ShadowScoreMetadataStorageIssue,
  ShadowScoreMetadataStorageRecordInput,
  ShadowScoreMetadataStorageStatus,
  StoredShadowScoreMetadataRecord,
} from '../shadowScoreMetadataStorageTypes';
import type { ShadowScoreImportMetadataOnlyValidationReport } from '../../mlRuntime/shadowScoreImportMetadataOnlyValidator';
import type { ShadowScoreMetadataStorageValidationReport } from '../shadowScoreMetadataStorageTypes';
import type { BaselineScoreMetadataValidationReport } from '../baseline/baselineScoreMetadataTypes';

export type MetadataOnlyShadowScoreImportApplySource = 'test_fixture' | 'internal_admin' | 'offline_workbench_export';

export type MetadataOnlyShadowScoreImportApplyOptions = {
  requestedByUserId?: string | number | null;
  source: MetadataOnlyShadowScoreImportApplySource;
  dryRun?: boolean;
  traceId?: string | null;
};

export type MetadataOnlyShadowScoreImportApplyStatus = 'applied' | 'dry_run' | 'rejected' | 'partial';

export type MetadataOnlyShadowScoreImportApplyValidationReport = {
  phase: 'Phase 18A';
  validationKind: 'metadata_only_shadow_score_import_apply_validation';
  status: ShadowScoreMetadataStorageStatus;
  metadataOnly: boolean;
  importPayloadHash: string | null;
  candidatePackageId: string | null;
  recordCount: number;
  candidateRecordCount: number;
  baselineRecordCount: number;
  warningCount: number;
  errorCount: number;
  forbiddenFieldCount: number;
  warnings: ShadowScoreMetadataStorageIssue[];
  errors: ShadowScoreMetadataStorageIssue[];
  importValidation: ShadowScoreImportMetadataOnlyValidationReport;
  storageValidation: ShadowScoreMetadataStorageValidationReport;
  baselineValidation: BaselineScoreMetadataValidationReport | null;
  modelExecutionAllowed: false;
  runtimeInvocationAllowed: false;
  inferenceEndpointExposed: false;
  artifactActivationAllowed: false;
  businessMutationAllowed: false;
};

export type MetadataOnlyShadowScoreImportApplyMappedRecords = {
  candidateRecords: ShadowScoreMetadataStorageRecordInput[];
  baselineRecords: ShadowScoreMetadataStorageRecordInput[];
  allRecords: ShadowScoreMetadataStorageRecordInput[];
};

export type MetadataOnlyShadowScoreImportApplyReceiptMetadata = {
  receiptId: string;
  recorded: true;
  metadataOnly: true;
  createdAt: string;
};

export type MetadataOnlyShadowScoreImportApplyResult = {
  phase: 'Phase 18A';
  serviceKind: 'metadata_only_shadow_score_import_apply_service';
  status: MetadataOnlyShadowScoreImportApplyStatus;
  metadataOnly: true;
  modelExecutionAllowed: false;
  runtimeInvocationAllowed: false;
  inferenceEndpointExposed: false;
  productionIntegrationAllowed: false;
  decisionAutomationAllowed: false;
  artifactActivationAllowed: false;
  businessMutationAllowed: false;
  canChangeInventoryOrAccounting: false;
  canChangePricing: false;
  canChangeReports: false;
  canChangeLedger: false;
  canMutateBusinessRecords: false;
  importPayloadHash: string | null;
  candidatePackageId: string | null;
  recordsReceived: number;
  recordsInserted: number;
  recordsSkippedDuplicate: number;
  recordsRejected: number;
  warningCount: number;
  errorCount: number;
  warnings: string[];
  errors: string[];
  validation: MetadataOnlyShadowScoreImportApplyValidationReport;
  records: StoredShadowScoreMetadataRecord[];
  receipt?: MetadataOnlyShadowScoreImportApplyReceiptMetadata | null;
  generatedAt: string;
};
