import { validateMlWorkbenchCandidateEvaluationMetadataImport } from './candidateEvaluationMetadataImportValidator';
import type { MlWorkbenchCandidateEvaluationMetadataImportSmokeResult } from './candidateEvaluationMetadataImportTypes';

export const runMlWorkbenchCandidateEvaluationMetadataImportSmoke = (
  payload: unknown,
  source: MlWorkbenchCandidateEvaluationMetadataImportSmokeResult['source'] = 'runtime_payload',
): MlWorkbenchCandidateEvaluationMetadataImportSmokeResult => ({
  ...validateMlWorkbenchCandidateEvaluationMetadataImport(payload),
  source,
  routeAdded: false,
  modelExecutionAllowed: false,
  inferenceEndpointExposed: false,
  artifactActivationAllowed: false,
  canChangeInventoryOrAccounting: false,
  canMutateBusinessRecords: false,
});
