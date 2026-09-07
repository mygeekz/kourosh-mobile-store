// Phase 8B — Offline Candidate Package Intake / Quarantine Readiness Binder type surface.

export type CandidatePackageIntakeBinderStatus =
  | "binder_ready"
  | "needs_phase8a_package_ready"
  | "needs_exported_candidate_package"
  | "needs_quarantine_review_plan"
  | "safety_blocked";

export type CandidatePackageIntakeBinderRecommendation =
  | "prepare_metadata_only_intake_binder"
  | "complete_phase8a_package_first"
  | "record_candidate_package_export_first"
  | "document_quarantine_review_plan_first"
  | "resolve_safety_blocks_first";

export type InventoryStockoutCandidatePackageIntakeBinderGate = {
  key: string;
  label: string;
  status: "pass" | "warning" | "block";
  value: unknown;
  message: string;
};

export type InventoryStockoutCandidatePackageIntakeBinderContract = {
  contractKey: "inventory_stockout_candidate_package_intake_quarantine_binder_v1";
  contractVersion: "v1";
  generatedAt: string;
  phase: "Phase 8B";
  purpose: string;
  binderScope: "offline_candidate_package_intake_quarantine_metadata_only";
  requiredUpstreamPackageKey: "inventory_stockout_offline_candidate_model_package_v1";
  requiredUpstreamPackageVersion: "v1";
  requiredUpstreamEvidence: string[];
  includedBinderSections: string[];
  excludedArtifactClasses: string[];
  forbiddenBehavior: string[];
  operationalPolicy: {
    modelExecutionAllowed: false;
    runtimeInvocationAllowed: false;
    inferenceEndpointExposed: false;
    artifactActivationAllowed: false;
    artifactBytesLoadingAllowed: false;
    artifactIntakeCanLoadBytes: false;
    artifactIntakeCanPersistBytes: false;
    quarantineCanExecuteArtifact: false;
    quarantineCanActivateArtifact: false;
    productionIntegrationAllowed: false;
    decisionAutomationAllowed: false;
    canChangeInventoryOrAccounting: false;
    canChangePricing: false;
    canChangeReports: false;
    canChangeLedger: false;
  };
};

export type InventoryStockoutCandidatePackageIntakeBinderSummary = {
  binderKey: "inventory_stockout_candidate_package_intake_quarantine_binder_v1";
  binderVersion: "v1";
  generatedAt: string;
  phase: "Phase 8B";
  status: CandidatePackageIntakeBinderStatus;
  recommendation: CandidatePackageIntakeBinderRecommendation;
  readinessScorePct: number;
  packageId: number | null;
  packageKey: "inventory_stockout_offline_candidate_model_package_v1";
  packageVersion: "v1";
  packageStatus: string | null;
  importId: number | null;
  artifactMetadataId: number | null;
  approvalReviewId: number | null;
  modelKey: string | null;
  modelVersion: string | null;
  artifactChecksumSha256: string | null;
  intakeMode: "metadata_only_intake_readiness";
  quarantineMode: "metadata_only_quarantine_review_readiness";
  binderContainsExecutableBytes: false;
  packageBytesLoaded: false;
  packageBytesPersisted: false;
  modelExecutionAllowed: false;
  runtimeInvocationAllowed: false;
  inferenceEndpointExposed: false;
  artifactActivationAllowed: false;
  artifactBytesLoadingAllowed: false;
  artifactIntakeCanLoadBytes: false;
  artifactIntakeCanPersistBytes: false;
  quarantineCanExecuteArtifact: false;
  quarantineCanActivateArtifact: false;
  productionIntegrationAllowed: false;
  decisionAutomationAllowed: false;
  canChangeInventoryOrAccounting: false;
  canChangePricing: false;
  canChangeReports: false;
  canChangeLedger: false;
  blockerCount: number;
  warningCount: number;
  passCount: number;
  totalGateCount: number;
  blockers: string[];
  warnings: string[];
  signedBinderHash: string | null;
  recommendedNextAction: string;
};

export type InventoryStockoutCandidatePackageIntakeBinderResponse = {
  success: true;
  contract: InventoryStockoutCandidatePackageIntakeBinderContract;
  summary: InventoryStockoutCandidatePackageIntakeBinderSummary;
  gates: InventoryStockoutCandidatePackageIntakeBinderGate[];
  intakeManifest: Record<string, unknown>;
  quarantineReadinessPlan: Record<string, unknown>;
  binderPayload: Record<string, unknown>;
  safetyPolicy: Record<string, unknown>;
  binderRecord?: Record<string, unknown> | null;
};

export type MlCandidatePackageIntakeBinderCatalogSummary = {
  generatedAt: string;
  contract: InventoryStockoutCandidatePackageIntakeBinderContract;
  currentCandidatePackageIntakeBinder: InventoryStockoutCandidatePackageIntakeBinderSummary;
  lastCandidatePackageIntakeBinders: Array<Record<string, unknown>>;
  recommendedNextAction: string;
};

export type MlCandidatePackageIntakeBinderSummaryPayload = {
  generatedAt?: string;
  currentCandidatePackageIntakeBinder?: {
    status?: string;
    recommendation?: string;
    readinessScorePct?: number | null;
    packageId?: number | null;
    importId?: number | null;
    modelKey?: string | null;
    modelVersion?: string | null;
    artifactChecksumSha256?: string | null;
    modelExecutionAllowed?: boolean;
    runtimeInvocationAllowed?: boolean;
    inferenceEndpointExposed?: boolean;
    artifactActivationAllowed?: boolean;
    artifactBytesLoadingAllowed?: boolean;
    artifactIntakeCanLoadBytes?: boolean;
    artifactIntakeCanPersistBytes?: boolean;
    quarantineCanExecuteArtifact?: boolean;
    quarantineCanActivateArtifact?: boolean;
    productionIntegrationAllowed?: boolean;
    decisionAutomationAllowed?: boolean;
    canChangeInventoryOrAccounting?: boolean;
    blockerCount?: number;
    warningCount?: number;
    blockers?: string[];
    warnings?: string[];
    recommendedNextAction?: string;
    [key: string]: unknown;
  };
  lastCandidatePackageIntakeBinders?: Array<Record<string, unknown>>;
  recommendedNextAction?: string;
  [key: string]: unknown;
};
