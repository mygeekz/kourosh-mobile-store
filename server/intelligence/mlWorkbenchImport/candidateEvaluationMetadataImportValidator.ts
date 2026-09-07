import { validateInventoryStockoutCandidateEvaluationMetadataImport } from '../datasets/inventoryStockoutCandidateEvaluationMetadataImport.service';
import type { MlWorkbenchCandidateEvaluationMetadataImportValidation, MlWorkbenchMetadataImportGate } from './candidateEvaluationMetadataImportTypes';
import {
  asMlWorkbenchImportRecord,
  readCandidatePackagePayload,
  readMetadataRecord,
  readString,
  recursiveKeyFindings,
} from './candidateEvaluationMetadataImportMapper';

const PHASE = 'Phase 11A' as const;

const forbiddenArtifactKeys = [
  'modelBinary',
  'modelBytes',
  'artifactBytes',
  'artifactPayload',
  'binaryPayload',
  'serializedModel',
  'base64Model',
  'picklePayload',
  'executableArtifact',
  'executableArtifactBytes',
] as const;

const forbiddenRawDataKeys = [
  'rawTrainingCsv',
  'rawTrainingCsvBytes',
  'rawTestCsv',
  'rawTestCsvBytes',
  'trainingCsvPayload',
  'testCsvPayload',
] as const;

const forbiddenDirectiveKeys = [
  'activationDirective',
  'activateArtifact',
  'productionDecisionDirective',
  'productionAction',
  'businessMutationInstruction',
  'inventoryMutation',
  'accountingMutation',
  'ledgerMutation',
  'pricingMutation',
  'reportMutation',
  'set_stock',
  'change_price',
  'mutate_ledger',
  'create_invoice',
  'auto_order',
  'auto_decision',
  'deploy_model',
] as const;

const requiredFalseSafetyFlags = [
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
  'backendModelExecutionAllowed',
  'backendInferenceEndpointExposed',
] as const;

const gate = (
  key: string,
  label: string,
  status: MlWorkbenchMetadataImportGate['status'],
  message: string,
  value?: unknown,
): MlWorkbenchMetadataImportGate => ({ key, label, status, message, value });

const hasReferenceOrHash = (value: Record<string, unknown>, ...keys: string[]) =>
  keys.some((key) => readString(value[key]));

const mergeSafetyPolicy = (
  candidateManifest: Record<string, unknown>,
  modelCard: Record<string, unknown>,
): Record<string, unknown> => ({
  ...(readMetadataRecord(candidateManifest, 'safetyPolicy') || {}),
  ...(readMetadataRecord(modelCard, 'safetyRestrictions') || {}),
});

export const validateMlWorkbenchCandidateEvaluationMetadataImport = (
  payload: unknown,
): MlWorkbenchCandidateEvaluationMetadataImportValidation => {
  const input = asMlWorkbenchImportRecord(payload);
  const packagePayload = readCandidatePackagePayload(input);
  const candidateManifest = readMetadataRecord(packagePayload, 'candidateManifest', 'candidate_manifest', 'candidateManifestJson');
  const modelCard = readMetadataRecord(packagePayload, 'modelCard', 'model_card', 'modelCardJson');
  const metrics = readMetadataRecord(packagePayload, 'metrics', 'metrics_json', 'metricsJson');
  const evaluationReport = readMetadataRecord(packagePayload, 'evaluationReport', 'evaluation_report', 'evaluationReportJson');
  const checksums = readMetadataRecord(packagePayload, 'checksums', 'checksums_json', 'checksumsJson');
  const trainingPackageValidationReport = readMetadataRecord(
    packagePayload,
    'trainingPackageValidationReport',
    'training_package_validation_report',
    'trainingPackageValidationReportJson',
  );
  const safetyPolicy = mergeSafetyPolicy(candidateManifest, modelCard);
  const phase9bValidation = validateInventoryStockoutCandidateEvaluationMetadataImport(input) as unknown as Record<string, unknown>;
  const phase9bSummary = readMetadataRecord(phase9bValidation, 'summary');

  const candidatePackageId = readString(candidateManifest.candidatePackageId ?? phase9bSummary.candidatePackageId);
  const modelKey = readString(candidateManifest.modelKey ?? phase9bSummary.modelKey);
  const modelVersion = readString(candidateManifest.modelVersion ?? phase9bSummary.modelVersion);
  const predictionType = readString(candidateManifest.predictionType ?? phase9bSummary.predictionType);
  const trainingPackageReference = readMetadataRecord(candidateManifest, 'trainingPackageReference', 'training_package_reference');
  const candidateManifestReference = readMetadataRecord(candidateManifest, 'candidateManifestReference', 'candidate_manifest_reference');
  const modelCardReference = readMetadataRecord(modelCard, 'modelCardReference', 'model_card_reference');
  const evaluationReportReference = readMetadataRecord(evaluationReport, 'evaluationReportReference', 'evaluation_report_reference');
  const artifactFindings = recursiveKeyFindings(input, forbiddenArtifactKeys);
  const rawDataFindings = recursiveKeyFindings(input, forbiddenRawDataKeys);
  const directiveFindings = recursiveKeyFindings(input, forbiddenDirectiveKeys);
  const unsafeSafetyFlags = requiredFalseSafetyFlags.filter((flagName) => safetyPolicy[flagName] !== false && safetyPolicy[flagName] !== undefined);

  const gates: MlWorkbenchMetadataImportGate[] = [
    gate('payload_schema', 'Payload schema', Object.keys(packagePayload).length ? 'pass' : 'block', Object.keys(packagePayload).length ? 'Payload is an object with metadata sections.' : 'Payload must be an object containing metadata sections.'),
    gate('candidate_identity', 'Candidate identity', candidatePackageId && modelKey && modelVersion && predictionType ? 'pass' : 'block', candidatePackageId && modelKey && modelVersion && predictionType ? 'Candidate package id, model key, model version, and prediction type are present.' : 'candidatePackageId, modelKey, modelVersion, and predictionType are required.', { candidatePackageId, modelKey, modelVersion, predictionType }),
    gate('training_package_reference', 'Training package reference', Object.keys(trainingPackageReference).length ? 'pass' : 'block', Object.keys(trainingPackageReference).length ? 'Training package reference metadata is present.' : 'trainingPackageReference metadata is required.', trainingPackageReference),
    gate('candidate_manifest_reference', 'Candidate manifest reference', Object.keys(candidateManifestReference).length || hasReferenceOrHash(candidateManifest, 'candidateManifestHash', 'candidateManifestSha256', 'trainingManifestHash') ? 'pass' : 'block', 'Candidate manifest hash/reference must be present.', { candidateManifestReference, candidateManifestHash: candidateManifest.candidateManifestHash, candidateManifestSha256: candidateManifest.candidateManifestSha256, trainingManifestHash: candidateManifest.trainingManifestHash }),
    gate('metrics_summary', 'Metrics summary', Object.keys(metrics).length ? 'pass' : 'block', Object.keys(metrics).length ? 'Metrics summary metadata is present.' : 'Metrics summary metadata is required.', metrics),
    gate('evaluation_report_reference', 'Evaluation report reference', Object.keys(evaluationReport).length && (Object.keys(evaluationReportReference).length || hasReferenceOrHash(evaluationReport, 'evaluationReportPath', 'evaluationReportSha256')) ? 'pass' : 'block', 'Evaluation report metadata and reference/hash must be present.', { evaluationReportReference, evaluationReportPath: evaluationReport.evaluationReportPath, evaluationReportSha256: evaluationReport.evaluationReportSha256 }),
    gate('model_card_reference', 'Model card reference', Object.keys(modelCard).length && (Object.keys(modelCardReference).length || hasReferenceOrHash(modelCard, 'modelCardPath', 'modelCardSha256')) ? 'pass' : 'block', 'Model card metadata and reference/hash must be present.', { modelCardReference, modelCardPath: modelCard.modelCardPath, modelCardSha256: modelCard.modelCardSha256 }),
    gate('checksums', 'Checksum summary', Object.keys(checksums).length ? 'pass' : 'block', Object.keys(checksums).length ? 'Checksum summary is present.' : 'Checksum summary is required.', checksums),
    gate('safety_policy', 'Safety policy', unsafeSafetyFlags.length ? 'block' : 'pass', unsafeSafetyFlags.length ? `Safety flag(s) must not be enabled: ${unsafeSafetyFlags.join(', ')}.` : 'Safety policy does not enable execution, inference, activation, artifact byte loading, raw CSV loading, or business mutation.', safetyPolicy),
    gate('no_model_binary_or_artifact_bytes', 'No model binary or artifact bytes', artifactFindings.length ? 'block' : 'pass', artifactFindings.length ? `Forbidden artifact byte key(s) found: ${artifactFindings.join(', ')}.` : 'No model binary, serialized model, executable artifact, or artifact byte payload key is present.'),
    gate('no_raw_training_or_test_csv', 'No raw training/test CSV', rawDataFindings.length ? 'block' : 'pass', rawDataFindings.length ? `Forbidden raw CSV key(s) found: ${rawDataFindings.join(', ')}.` : 'No raw training CSV or raw test CSV payload is present.'),
    gate('no_activation_or_production_directive', 'No activation or production directive', directiveFindings.length ? 'block' : 'pass', directiveFindings.length ? `Forbidden directive/mutation key(s) found: ${directiveFindings.join(', ')}.` : 'No activation, deployment, production decision, inference, or business mutation directive is present.'),
    gate('phase9b_contract_validation', 'Phase 9B contract validation', phase9bSummary.status === 'metadata_import_rejected' ? 'block' : phase9bSummary.status === 'metadata_import_warning' ? 'warning' : 'pass', `Phase 9B metadata import validator returned ${String(phase9bSummary.status || 'unknown')}.`, phase9bSummary),
  ];

  const hasBlockers = gates.some((item) => item.status === 'block');
  const hasWarnings = gates.some((item) => item.status === 'warning');
  const status = hasBlockers ? 'metadata_import_rejected' : hasWarnings ? 'metadata_import_warning' : 'metadata_import_ready';

  return {
    phase: PHASE,
    metadataOnly: true,
    generatedAt: new Date().toISOString(),
    status,
    candidatePackageId,
    modelKey,
    modelVersion,
    predictionType,
    gates,
    phase9bValidation,
    safetyPolicy,
    summary: {
      phase: PHASE,
      status,
      candidatePackageId,
      modelKey,
      modelVersion,
      predictionType,
      trainingPackageReference,
      candidateManifestReference,
      metricsSummary: metrics,
      evaluationReportReference,
      modelCardReference,
      checksumSummary: checksums,
      trainingPackageValidationStatus: trainingPackageValidationReport.status,
      metadataOnly: true,
      routeAdded: false,
      modelExecutionAllowed: false,
      inferenceEndpointExposed: false,
      artifactActivationAllowed: false,
      canChangeInventoryOrAccounting: false,
      canMutateBusinessRecords: false,
    },
  };
};
