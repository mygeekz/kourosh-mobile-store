import type { ShadowScoreComparisonStatus } from '../shadowScoreComparisonTypes';
import type {
  ShadowScoreComparisonExportContractEnvelope,
  ShadowScoreComparisonExportContractValidationResult,
  ShadowScoreComparisonExportContractVersion,
  ShadowScoreComparisonExportKind,
} from '../export/shadowScoreComparisonExportContractTypes';

export type ShadowScoreComparisonImportDryRunStatus = 'accepted' | 'rejected';

export interface ShadowScoreComparisonImportDryRunRequest {
  payload: unknown;
  sourceName?: string | null;
  requestedByUserId?: string | null;
  receivedAt?: string;
}

export interface ShadowScoreComparisonImportDryRunSafetyPolicy {
  metadataOnly: true;
  dryRunOnly: true;
  evidenceOnly: true;
  wouldPersist: false;
  wouldCreateMigration: false;
  wouldCreateTable: false;
  wouldExposeRoute: false;
  modelExecutionAllowed: false;
  runtimeInvocationAllowed: false;
  inferenceEndpointExposed: false;
  productionIntegrationAllowed: false;
  decisionAutomationAllowed: false;
  businessMutationAllowed: false;
  canChangeInventoryOrAccounting: false;
  canChangePricing: false;
  canChangeReports: false;
  canChangeLedger: false;
  canMutateBusinessRecords: false;
  artifactExecutionAllowed: false;
  artifactActivationAllowed: false;
  artifactBytesLoadingAllowed: false;
  rawTrainingCsvLoadingAllowed: false;
  automaticDeletionAllowed: false;
  purgeJobAllowed: false;
}

export interface ShadowScoreComparisonImportDryRunIntegrityCheck {
  hashAlgorithm: 'stable-json-fnv1a64' | 'missing' | 'unsupported';
  canonicalPayloadHashMatches: boolean | null;
  comparisonResultHashMatches: boolean | null;
  declaredCanonicalPayloadHash: string | null;
  recomputedCanonicalPayloadHash: string | null;
  declaredComparisonResultHash: string | null;
  recomputedComparisonResultHash: string | null;
}

export interface ShadowScoreComparisonImportDryRunResult {
  dryRunOnly: true;
  metadataOnly: true;
  evidenceOnly: true;
  wouldPersist: false;
  wouldMutateBusinessRecords: false;
  modelExecutionAllowed: false;
  inferenceEndpointExposed: false;
  artifactActivationAllowed: false;
  importStatus: ShadowScoreComparisonImportDryRunStatus;
  validationStatus: ShadowScoreComparisonExportContractValidationResult['validationStatus'];
  exportKind: ShadowScoreComparisonExportKind | null;
  contractVersion: ShadowScoreComparisonExportContractVersion | null;
  candidatePackageId: string | null;
  comparisonStatus: ShadowScoreComparisonStatus | null;
  baselineAvailable: boolean | null;
  integrityCheck: ShadowScoreComparisonImportDryRunIntegrityCheck;
  safetyPolicy: ShadowScoreComparisonImportDryRunSafetyPolicy;
  acceptedEnvelope: ShadowScoreComparisonExportContractEnvelope | null;
  warnings: string[];
  errors: string[];
  generatedAt: string;
  receivedAt: string;
  sourceName: string | null;
}
