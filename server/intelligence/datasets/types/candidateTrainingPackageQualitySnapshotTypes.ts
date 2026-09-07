export type OfflineCandidateTrainingPackageQualitySnapshotStatus =
  | "training_package_quality_ready"
  | "training_package_quality_warning"
  | "training_package_quality_blocked"
  | "candidate_not_found";

export type OfflineCandidateTrainingPackageQualitySnapshotRecommendation =
  | "review_training_package_quality_metadata_only"
  | "review_training_package_quality_warnings"
  | "fix_training_package_validation_errors"
  | "import_candidate_evaluation_metadata_first";

export type InventoryStockoutCandidateTrainingPackageQualitySnapshotContract = {
  contractKey: string;
  contractVersion: string;
  generatedAt: string;
  phase: string;
  purpose: string;
  snapshotScope: string;
  dataSource: string;
  qualityCheckKeys: string[];
  forbiddenBehavior: string[];
  operationalPolicy: {
    metadataReadOnlyTrainingPackageQualitySnapshot: boolean;
    backendModelExecutionAllowed: boolean;
    runtimeInvocationAllowed: boolean;
    backendInferenceEndpointExposed: boolean;
    inferenceEndpointExposed: boolean;
    productionIntegrationAllowed: boolean;
    decisionAutomationAllowed: boolean;
    canChangeInventoryOrAccounting: boolean;
    canChangePricing: boolean;
    canChangeReports: boolean;
    canChangeLedger: boolean;
    canMutateBusinessRecords: boolean;
    artifactExecutionAllowed: boolean;
    artifactActivationAllowed: boolean;
    artifactBytesLoadingAllowedInBackend: boolean;
    rawTrainingCsvLoadingAllowedInBackend: boolean;
  };
};

export type InventoryStockoutCandidateTrainingPackageQualityCheckStatus = "pass" | "warning" | "fail";

export type InventoryStockoutCandidateTrainingPackageQualityCheck = {
  key: string;
  label: string;
  status: InventoryStockoutCandidateTrainingPackageQualityCheckStatus;
  weight: number;
  earned: number;
  source: string;
  value: unknown;
  message: string;
};

export type InventoryStockoutCandidateTrainingPackageQualitySnapshotSummary = {
  generatedAt: string;
  phase: string;
  status: OfflineCandidateTrainingPackageQualitySnapshotStatus;
  recommendation: OfflineCandidateTrainingPackageQualitySnapshotRecommendation;
  id: number | null;
  candidatePackageId: string | null;
  modelKey: string | null;
  modelVersion: string | null;
  predictionType: string | null;
  targetColumn: string | null;
  horizonDays: number | null;
  validationStatus: string | null;
  trainingManifestHash: string | null;
  qualityScorePct: number;
  totalWeight: number;
  earnedWeight: number;
  passCount: number;
  warningCount: number;
  failCount: number;
  rowCountTrain: number | null;
  rowCountTest: number | null;
  totalRows: number | null;
  featureCount: number | null;
  missingColumnCount: number;
  warningMessageCount: number;
  errorMessageCount: number;
  splitInfoAvailable: boolean;
  featureContractAvailable: boolean;
  targetDefinitionAvailable: boolean;
  safetyLocked: boolean;
  metadataReadOnlyTrainingPackageQualitySnapshot: true;
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
  rawTrainingCsvLoadingAllowedInBackend: false;
  recommendedNextAction: string;
};

export type InventoryStockoutCandidateTrainingPackageQualitySnapshotResponse = {
  success: true;
  contract: InventoryStockoutCandidateTrainingPackageQualitySnapshotContract;
  summary: InventoryStockoutCandidateTrainingPackageQualitySnapshotSummary;
  checks: InventoryStockoutCandidateTrainingPackageQualityCheck[];
  validationReportPreview: Record<string, unknown>;
  rowCountSnapshot: Record<string, unknown>;
  featureContractSnapshot: Record<string, unknown>;
  targetSnapshot: Record<string, unknown>;
  splitSnapshot: Record<string, unknown>;
  warnings: string[];
  errors: string[];
  safetyPolicy: Record<string, unknown>;
};

export type MlCandidateTrainingPackageQualitySnapshotCatalogSummary = {
  generatedAt: string;
  contract: InventoryStockoutCandidateTrainingPackageQualitySnapshotContract;
  currentCandidateTrainingPackageQualitySnapshot: InventoryStockoutCandidateTrainingPackageQualitySnapshotSummary | null;
  recentCandidateMetadataImports: Array<Record<string, unknown>>;
  recommendedNextAction: string;
};
