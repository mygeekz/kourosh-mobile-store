export type MlWorkbenchMetadataImportGateStatus = 'pass' | 'warning' | 'block';

export type MlWorkbenchMetadataImportGate = {
  key: string;
  label: string;
  status: MlWorkbenchMetadataImportGateStatus;
  message: string;
  value?: unknown;
};

export type MlWorkbenchCandidateEvaluationMetadataImportValidation = {
  phase: 'Phase 11A';
  metadataOnly: true;
  generatedAt: string;
  status: 'metadata_import_ready' | 'metadata_import_warning' | 'metadata_import_rejected';
  candidatePackageId?: string;
  modelKey?: string;
  modelVersion?: string;
  predictionType?: string;
  gates: MlWorkbenchMetadataImportGate[];
  phase9bValidation: Record<string, unknown>;
  safetyPolicy: Record<string, unknown>;
  summary: Record<string, unknown>;
};

export type MlWorkbenchCandidateEvaluationMetadataImportSmokeResult = MlWorkbenchCandidateEvaluationMetadataImportValidation & {
  source: 'fixture' | 'runtime_payload';
  routeAdded: false;
  modelExecutionAllowed: false;
  inferenceEndpointExposed: false;
  artifactActivationAllowed: false;
  canChangeInventoryOrAccounting: false;
  canMutateBusinessRecords: false;
};
