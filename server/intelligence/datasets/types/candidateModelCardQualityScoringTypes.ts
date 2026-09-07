export type OfflineCandidateModelCardQualityScoringStatus =
  | "model_card_quality_ready"
  | "model_card_quality_warning"
  | "model_card_quality_blocked"
  | "candidate_not_found";

export type OfflineCandidateModelCardQualityScoringRecommendation =
  | "review_model_card_quality_metadata_only"
  | "complete_missing_model_card_metadata"
  | "resolve_model_card_safety_blocks"
  | "import_candidate_evaluation_metadata_first";

export type InventoryStockoutCandidateModelCardQualityScoringContract = {
  contractKey: string;
  contractVersion: string;
  generatedAt: string;
  phase: string;
  purpose: string;
  scoringScope: string;
  dataSource: string;
  checklistKeys: string[];
  forbiddenBehavior: string[];
  operationalPolicy: {
    metadataReadOnlyModelCardQualityScoring: boolean;
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

export type InventoryStockoutCandidateModelCardQualityCheckStatus = "pass" | "warning" | "fail";

export type InventoryStockoutCandidateModelCardQualityCheck = {
  key: string;
  label: string;
  status: InventoryStockoutCandidateModelCardQualityCheckStatus;
  weight: number;
  earned: number;
  source: string;
  message: string;
};

export type InventoryStockoutCandidateModelCardQualityScoringSummary = {
  generatedAt: string;
  phase: string;
  status: OfflineCandidateModelCardQualityScoringStatus;
  recommendation: OfflineCandidateModelCardQualityScoringRecommendation;
  id: number | null;
  candidatePackageId: string | null;
  modelKey: string | null;
  modelVersion: string | null;
  modelFamily: string | null;
  predictionType: string | null;
  targetColumn: string | null;
  horizonDays: number | null;
  qualityScorePct: number;
  totalWeight: number;
  earnedWeight: number;
  passCount: number;
  warningCount: number;
  failCount: number;
  requiredMetadataCount: number;
  availableMetadataCount: number;
  safetyLocked: boolean;
  metadataReadOnlyModelCardQualityScoring: true;
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

export type InventoryStockoutCandidateModelCardQualityScoringResponse = {
  success: true;
  contract: InventoryStockoutCandidateModelCardQualityScoringContract;
  summary: InventoryStockoutCandidateModelCardQualityScoringSummary;
  checks: InventoryStockoutCandidateModelCardQualityCheck[];
  missingRequiredSections: string[];
  warningSections: string[];
  modelCardPreview: Record<string, unknown>;
  safetyPolicy: Record<string, unknown>;
};

export type MlCandidateModelCardQualityScoringCatalogSummary = {
  generatedAt: string;
  contract: InventoryStockoutCandidateModelCardQualityScoringContract;
  currentCandidateModelCardQualityScoring: InventoryStockoutCandidateModelCardQualityScoringSummary | null;
  recentCandidateMetadataImports: Array<Record<string, unknown>>;
  recommendedNextAction: string;
};
