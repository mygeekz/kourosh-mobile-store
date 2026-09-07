export type OfflineCandidateFeatureContractDriftMetadataStatus =
  | "feature_contract_drift_ready"
  | "feature_contract_drift_warning"
  | "feature_contract_drift_missing"
  | "candidate_not_found";

export type OfflineCandidateFeatureContractDriftMetadataRecommendation =
  | "review_feature_contract_drift_metadata"
  | "add_offline_feature_contract_drift_metadata_to_candidate_package"
  | "import_candidate_evaluation_metadata_first";

export type InventoryStockoutCandidateFeatureContractDriftMetadataCheckStatus = "pass" | "warning" | "fail";

export type InventoryStockoutCandidateFeatureContractDriftMetadataCheck = {
  key: string;
  label: string;
  status: InventoryStockoutCandidateFeatureContractDriftMetadataCheckStatus;
  weight: number;
  earned: number;
  source: string;
  value: unknown;
  message: string;
};

export type InventoryStockoutCandidateFeatureContractDriftSignal = {
  key: string;
  family:
    | "baseline_contract"
    | "candidate_contract"
    | "added_features"
    | "removed_features"
    | "changed_features"
    | "type_drift"
    | "nullable_drift"
    | "target_contract"
    | "metadata";
  label: string;
  status: "available" | "missing";
  source: string;
  value: unknown;
  count: number;
  message: string;
};

export type InventoryStockoutCandidateFeatureContractDriftMetadataContract = {
  contractKey: string;
  contractVersion: string;
  phase: string;
  generatedAt: string;
  purpose: string;
  metadataSource: string;
  readOnly: boolean;
  allowedMetadataFamilies: string[];
  forbiddenBehavior: string[];
  safetyPolicy: {
    metadataReadOnlyFeatureContractDrift: true;
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
    baselineTrainingDataLoadingAllowedInBackend: false;
    backendFeatureContractMutationAllowed: false;
  };
};

export type InventoryStockoutCandidateFeatureContractDriftMetadataSummary = {
  generatedAt: string;
  metadataImportId: number | null;
  candidatePackageId: string;
  modelKey: string;
  modelVersion: string;
  predictionType: string;
  targetColumn: string;
  status: OfflineCandidateFeatureContractDriftMetadataStatus;
  recommendation: OfflineCandidateFeatureContractDriftMetadataRecommendation;
  featureContractDriftScorePct: number;
  passCount: number;
  warningCount: number;
  failCount: number;
  totalCheckCount: number;
  featureContractDriftSignalCount: number;
  availableSignalCount: number;
  missingSignalCount: number;
  baselineFeatureContractAvailable: boolean;
  candidateFeatureContractAvailable: boolean;
  targetContractDriftAvailable: boolean;
  baselineFeatureCount: number;
  candidateFeatureCount: number;
  addedFeatureCount: number;
  removedFeatureCount: number;
  changedFeatureCount: number;
  typeDriftCount: number;
  nullableDriftCount: number;
  warnings: string[];
  backendModelExecutionAllowed: false;
  backendInferenceEndpointExposed: false;
  productionIntegrationAllowed: false;
  decisionAutomationAllowed: false;
  canChangeInventoryOrAccounting: false;
  artifactActivationAllowed: false;
  rawTrainingCsvLoadingAllowedInBackend: false;
  baselineTrainingDataLoadingAllowedInBackend: false;
  backendFeatureContractMutationAllowed: false;
  recommendedNextAction: string;
};

export type InventoryStockoutCandidateFeatureContractDriftMetadataResponse = {
  success: true;
  contract: InventoryStockoutCandidateFeatureContractDriftMetadataContract;
  summary: InventoryStockoutCandidateFeatureContractDriftMetadataSummary;
  checks: InventoryStockoutCandidateFeatureContractDriftMetadataCheck[];
  featureContractDriftSignals: InventoryStockoutCandidateFeatureContractDriftSignal[];
  featureContractDriftMetadataPreview: Record<string, unknown>;
  baselineFeatureContractPreview: Record<string, unknown>;
  candidateFeatureContractPreview: Record<string, unknown>;
  addedFeatures: string[];
  removedFeatures: string[];
  changedFeatures: string[];
  typeDriftPreview: unknown;
  nullableDriftPreview: unknown;
  targetContractDriftPreview: Record<string, unknown>;
  safetyPolicy: Record<string, unknown>;
};

export type MlCandidateFeatureContractDriftMetadataCatalogSummary = {
  generatedAt: string;
  contract: InventoryStockoutCandidateFeatureContractDriftMetadataContract;
  currentCandidateFeatureContractDriftMetadata: {
    generatedAt: string;
    status: OfflineCandidateFeatureContractDriftMetadataStatus;
    recommendation: OfflineCandidateFeatureContractDriftMetadataRecommendation;
    candidateCount: number;
    metadataSource: string;
    metadataReadOnlyFeatureContractDrift: true;
    backendModelExecutionAllowed: false;
    backendInferenceEndpointExposed: false;
    productionIntegrationAllowed: false;
    decisionAutomationAllowed: false;
    canChangeInventoryOrAccounting: false;
    artifactActivationAllowed: false;
    rawTrainingCsvLoadingAllowedInBackend: false;
    baselineTrainingDataLoadingAllowedInBackend: false;
    backendFeatureContractMutationAllowed: false;
  };
  recentCandidateImports: Array<Record<string, unknown>>;
  recommendedNextAction: string;
};
