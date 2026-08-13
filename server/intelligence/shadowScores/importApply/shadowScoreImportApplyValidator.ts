import {
  validateShadowScoreImportMetadataOnlyPayload,
  type ShadowScoreImportMetadataOnlyPayload,
} from '../../mlRuntime/shadowScoreImportMetadataOnlyValidator';
import { validateShadowScoreMetadataStoragePayload } from '../shadowScoreMetadataStorageValidator';
import type { ShadowScoreMetadataFixturePayload, ShadowScoreMetadataStorageIssue } from '../shadowScoreMetadataStorageTypes';
import { validateBaselineScoreMetadataPayload } from '../baseline/baselineScoreMetadataValidator';
import type { BaselineScoreMetadataPayload } from '../baseline/baselineScoreMetadataTypes';
import type { MetadataOnlyShadowScoreImportApplyValidationReport } from './shadowScoreImportApplyTypes';

const PHASE_18A_FORBIDDEN_FIELDS = new Set([
  'set_stock',
  'change_price',
  'approve_purchase',
  'create_invoice',
  'mutate_ledger',
  'auto_order',
  'delete_record',
  'production_action',
  'auto_decision',
  'activate_artifact',
  'deploy_model',
  'write_inventory',
  'write_accounting',
  'write_ledger',
  'write_report',
  'execute_model',
  'run_inference',
]);

const PHASE_18A_FORBIDDEN_TRUE_FLAGS = new Set([
  'modelExecutionAllowed',
  'runtimeInvocationAllowed',
  'inferenceEndpointExposed',
  'productionIntegrationAllowed',
  'decisionAutomationAllowed',
  'canChangeInventoryOrAccounting',
  'canChangePricing',
  'canChangeReports',
  'canChangeLedger',
  'canMutateBusinessRecords',
  'artifactExecutionAllowed',
  'artifactActivationAllowed',
  'artifactBytesLoadingAllowed',
  'rawTrainingCsvLoadingAllowed',
  'automaticDeletionAllowed',
  'purgeJobAllowed',
  'businessMutationAllowed',
  'inventoryMutationAllowed',
  'accountingMutationAllowed',
  'pricingMutationAllowed',
  'ledgerMutationAllowed',
  'reportMutationAllowed',
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const issue = (code: string, message: string, path: string): ShadowScoreMetadataStorageIssue => ({ code, message, path });

const collectPhase18AUnsafeFields = (value: unknown, path = '$'): ShadowScoreMetadataStorageIssue[] => {
  if (Array.isArray(value)) return value.flatMap((entry, index) => collectPhase18AUnsafeFields(entry, `${path}[${index}]`));
  if (!isRecord(value)) return [];

  const issues: ShadowScoreMetadataStorageIssue[] = [];
  for (const [key, nestedValue] of Object.entries(value)) {
    const nestedPath = `${path}.${key}`;
    if (PHASE_18A_FORBIDDEN_FIELDS.has(key)) {
      issues.push(issue('phase18a_forbidden_field_present', `${key} is not allowed in metadata-only import apply payloads.`, nestedPath));
    }
    if (PHASE_18A_FORBIDDEN_TRUE_FLAGS.has(key) && nestedValue === true) {
      issues.push(issue('phase18a_unsafe_true_flag', `${key} must remain false for metadata-only import apply.`, nestedPath));
    }
    issues.push(...collectPhase18AUnsafeFields(nestedValue, nestedPath));
  }
  return issues;
};

const getBaselineApplyPayload = (payload: unknown): BaselineScoreMetadataPayload | null => {
  if (!isRecord(payload)) return null;
  const possible = payload.baselineMetadata ?? payload.baselineMetadataPayload ?? payload.baselineScoreMetadata;
  if (isRecord(possible)) return possible as BaselineScoreMetadataPayload;
  if (Array.isArray(payload.baselineRecords)) {
    return {
      fixtureKind: 'metadata_only_baseline_score_fixture',
      metadataOnly: true,
      evidenceOnly: true,
      baselineSource: typeof payload.baselineSource === 'string' ? payload.baselineSource : 'metadata_only_import_apply_baseline',
      baselineKey: typeof payload.baselineKey === 'string' ? payload.baselineKey : `${String(payload.candidatePackageId ?? 'unknown-package')}:baseline`,
      baselineVersion: typeof payload.baselineVersion === 'string' ? payload.baselineVersion : 'metadata-only',
      baselineGeneratedAt: typeof payload.generatedAt === 'string' ? payload.generatedAt : undefined,
      candidatePackageId: typeof payload.candidatePackageId === 'string' ? payload.candidatePackageId : undefined,
      modelKey: typeof payload.modelKey === 'string' ? payload.modelKey : undefined,
      modelVersion: typeof payload.modelVersion === 'string' ? payload.modelVersion : undefined,
      predictionType: typeof payload.predictionType === 'string' ? payload.predictionType : undefined,
      horizonDays: typeof payload.horizonDays === 'number' ? payload.horizonDays : null,
      generatedAt: typeof payload.generatedAt === 'string' ? payload.generatedAt : undefined,
      safetyPolicy: isRecord(payload.safetyPolicy) ? payload.safetyPolicy : undefined,
      records: payload.baselineRecords as BaselineScoreMetadataPayload['records'],
    };
  }
  return null;
};

const toMessageList = (entries: ShadowScoreMetadataStorageIssue[]): string[] =>
  entries.map((entry) => `${entry.code}: ${entry.message} (${entry.path})`);

export const getMetadataOnlyShadowScoreImportApplyBaselinePayload = getBaselineApplyPayload;

export const validateMetadataOnlyShadowScoreImportApplyPayload = (
  payload: ShadowScoreImportMetadataOnlyPayload | ShadowScoreMetadataFixturePayload | unknown,
): MetadataOnlyShadowScoreImportApplyValidationReport => {
  const importValidation = validateShadowScoreImportMetadataOnlyPayload(payload);
  const storageValidation = validateShadowScoreMetadataStoragePayload(payload);
  const baselinePayload = getBaselineApplyPayload(payload);
  const baselineValidation = baselinePayload ? validateBaselineScoreMetadataPayload(baselinePayload) : null;
  const phase18aUnsafeIssues = collectPhase18AUnsafeFields(payload);

  const warnings: ShadowScoreMetadataStorageIssue[] = [
    ...importValidation.warnings,
    ...storageValidation.warnings,
    ...(baselineValidation?.warnings ?? []),
  ];
  const errors: ShadowScoreMetadataStorageIssue[] = [
    ...importValidation.errors,
    ...storageValidation.errors,
    ...(baselineValidation?.errors ?? []),
    ...phase18aUnsafeIssues,
  ];

  const candidateRecordCount = Array.isArray((payload as { records?: unknown }).records)
    ? ((payload as { records: unknown[] }).records.length)
    : 0;
  const baselineRecordCount = baselinePayload && Array.isArray(baselinePayload.records) ? baselinePayload.records.length : 0;
  const status = errors.length > 0 ? 'fail' : warnings.length > 0 ? 'warning' : 'pass';

  return {
    phase: 'Phase 18A',
    validationKind: 'metadata_only_shadow_score_import_apply_validation',
    status,
    metadataOnly: status !== 'fail',
    importPayloadHash: storageValidation.importPayloadHash || importValidation.generatedAt ? storageValidation.importPayloadHash : null,
    candidatePackageId: typeof (payload as { candidatePackageId?: unknown }).candidatePackageId === 'string'
      ? String((payload as { candidatePackageId: string }).candidatePackageId)
      : null,
    recordCount: candidateRecordCount + baselineRecordCount,
    candidateRecordCount,
    baselineRecordCount,
    warningCount: warnings.length,
    errorCount: errors.length,
    forbiddenFieldCount:
      importValidation.forbiddenFieldCount + storageValidation.forbiddenFieldCount + (baselineValidation?.forbiddenFieldCount ?? 0) + phase18aUnsafeIssues.length,
    warnings,
    errors,
    importValidation,
    storageValidation,
    baselineValidation,
    modelExecutionAllowed: false,
    runtimeInvocationAllowed: false,
    inferenceEndpointExposed: false,
    artifactActivationAllowed: false,
    businessMutationAllowed: false,
  };
};

export const metadataOnlyShadowScoreImportApplyMessages = toMessageList;
