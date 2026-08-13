// Phase 9B — Offline Candidate Model Evaluation Report Import type surface.

export type CandidateEvaluationMetadataImportStatus =
  | "metadata_import_ready"
  | "metadata_import_warning"
  | "metadata_import_rejected";

export type CandidateEvaluationMetadataImportRecommendation =
  | "store_evaluation_metadata_only"
  | "review_metadata_warnings"
  | "reject_unsafe_or_incomplete_metadata";

export type InventoryStockoutCandidateEvaluationMetadataImportGate = {
  key: string;
  label: string;
  status: "pass" | "warning" | "block";
  value: unknown;
  message: string;
};

export type InventoryStockoutCandidateEvaluationMetadataImportContract = {
  contractKey: "inventory_stockout_candidate_evaluation_metadata_import_v1";
  contractVersion: "v1";
  generatedAt: string;
  phase: "Phase 9B";
  purpose: string;
  importScope: "offline_candidate_evaluation_metadata_only";
  acceptedSections: string[];
  rejectedArtifactClasses: string[];
  forbiddenBehavior: string[];
  allowedOutputFields: string[];
  forbiddenOutputFields: string[];
  operationalPolicy: {
    metadataImportOnly: true;
    backendModelExecutionAllowed: false;
    runtimeInvocationAllowed: false;
    backendInferenceEndpointExposed: false;
    inferenceEndpointExposed: false;
    productionIntegrationAllowed: false;
    decisionAutomationAllowed: false;
    canChangeInventoryOrAccounting: false;
    canChangePricing: false;
    canChangeReports: false;
    canChangeLedger: false;
    canMutateBusinessRecords: false;
    artifactExecutionAllowed: false;
    artifactActivationAllowed: false;
    artifactBytesLoadingAllowedInBackend: false;
  };
};

export type InventoryStockoutCandidateEvaluationMetadataImportSummary = {
  importKey: "inventory_stockout_candidate_evaluation_metadata_import_v1";
  importVersion: "v1";
  generatedAt: string;
  phase: "Phase 9B";
  status: CandidateEvaluationMetadataImportStatus;
  recommendation: CandidateEvaluationMetadataImportRecommendation;
  candidatePackageId: string | null;
  modelKey: string | null;
  modelVersion: string | null;
  modelFamily: string | null;
  predictionType: string | null;
  targetColumn: string | null;
  horizonDays: number | null;
  trainingManifestHash: string | null;
  validationStatus: string;
  metricsStatus: string;
  outputContractStatus: string;
  safetyPolicyStatus: string;
  metadataImportOnly: true;
  backendModelExecutionAllowed: false;
  runtimeInvocationAllowed: false;
  backendInferenceEndpointExposed: false;
  inferenceEndpointExposed: false;
  productionIntegrationAllowed: false;
  decisionAutomationAllowed: false;
  canChangeInventoryOrAccounting: false;
  canChangePricing: false;
  canChangeReports: false;
  canChangeLedger: false;
  canMutateBusinessRecords: false;
  artifactExecutionAllowed: false;
  artifactActivationAllowed: false;
  artifactBytesLoadingAllowedInBackend: false;
  blockerCount: number;
  warningCount: number;
  passCount: number;
  totalGateCount: number;
  blockers: string[];
  warnings: string[];
  recommendedNextAction: string;
};

export type InventoryStockoutCandidateEvaluationMetadataImportResponse = {
  success: true;
  contract: InventoryStockoutCandidateEvaluationMetadataImportContract;
  summary: InventoryStockoutCandidateEvaluationMetadataImportSummary;
  gates: InventoryStockoutCandidateEvaluationMetadataImportGate[];
  normalizedMetadata: Record<string, unknown>;
  safetyPolicy: Record<string, unknown>;
  importRecord?: Record<string, unknown> | null;
};

export type MlCandidateEvaluationMetadataImportCatalogSummary = {
  generatedAt: string;
  contract: InventoryStockoutCandidateEvaluationMetadataImportContract;
  lastCandidateEvaluationMetadataImports: Array<Record<string, unknown>>;
  recommendedNextAction: string;
};
