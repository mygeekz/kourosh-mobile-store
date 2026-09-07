// Phase 8C — Offline Candidate Package Human Review / Signoff Gate type surface.

export type CandidatePackageHumanReviewSignoffStatus =
  | "signoff_gate_ready"
  | "needs_phase8b_binder_ready"
  | "needs_persisted_intake_binder"
  | "needs_human_review_evidence"
  | "safety_blocked";

export type CandidatePackageHumanReviewSignoffRecommendation =
  | "record_metadata_only_human_review_signoff"
  | "complete_phase8b_binder_first"
  | "record_phase8b_intake_binder_first"
  | "collect_human_review_evidence_first"
  | "resolve_safety_blocks_first";

export type InventoryStockoutCandidatePackageHumanReviewSignoffGate = {
  key: string;
  label: string;
  status: "pass" | "warning" | "block";
  value: unknown;
  message: string;
};

export type InventoryStockoutCandidatePackageHumanReviewSignoffContract = {
  contractKey: "inventory_stockout_candidate_package_human_review_signoff_gate_v1";
  contractVersion: "v1";
  generatedAt: string;
  phase: "Phase 8C";
  purpose: string;
  signoffScope: "offline_candidate_package_human_review_metadata_only";
  requiredUpstreamBinderKey: "inventory_stockout_candidate_package_intake_quarantine_binder_v1";
  requiredUpstreamBinderVersion: "v1";
  requiredUpstreamEvidence: string[];
  requiredHumanReviewEvidence: string[];
  includedSignoffSections: string[];
  forbiddenBehavior: string[];
  operationalPolicy: {
    humanReviewRequired: true;
    signoffIsProductionApproval: false;
    signoffCanLoadPackageBytes: false;
    signoffCanPersistArtifactBytes: false;
    signoffCanExecuteModel: false;
    signoffCanInvokeRuntime: false;
    signoffCanExposeInferenceEndpoint: false;
    signoffCanActivateArtifact: false;
    signoffCanDeployArtifact: false;
    signoffCanProductionScore: false;
    modelExecutionAllowed: false;
    runtimeInvocationAllowed: false;
    inferenceEndpointExposed: false;
    artifactActivationAllowed: false;
    artifactBytesLoadingAllowed: false;
    productionIntegrationAllowed: false;
    decisionAutomationAllowed: false;
    canChangeInventoryOrAccounting: false;
    canChangePricing: false;
    canChangeReports: false;
    canChangeLedger: false;
  };
};

export type InventoryStockoutCandidatePackageHumanReviewSignoffSummary = {
  signoffKey: "inventory_stockout_candidate_package_human_review_signoff_gate_v1";
  signoffVersion: "v1";
  generatedAt: string;
  phase: "Phase 8C";
  status: CandidatePackageHumanReviewSignoffStatus;
  recommendation: CandidatePackageHumanReviewSignoffRecommendation;
  readinessScorePct: number;
  binderId: number | null;
  binderKey: "inventory_stockout_candidate_package_intake_quarantine_binder_v1";
  binderVersion: "v1";
  binderStatus: string | null;
  packageId: number | null;
  packageKey: "inventory_stockout_offline_candidate_model_package_v1";
  packageVersion: "v1";
  importId: number | null;
  artifactMetadataId: number | null;
  approvalReviewId: number | null;
  modelKey: string | null;
  modelVersion: string | null;
  artifactChecksumSha256: string | null;
  reviewMode: "metadata_only_human_review_signoff_gate";
  humanReviewRequired: true;
  humanReviewEvidenceProvided: boolean;
  signoffIsProductionApproval: false;
  signoffCanLoadPackageBytes: false;
  signoffCanPersistArtifactBytes: false;
  signoffCanExecuteModel: false;
  signoffCanInvokeRuntime: false;
  signoffCanExposeInferenceEndpoint: false;
  signoffCanActivateArtifact: false;
  signoffCanDeployArtifact: false;
  signoffCanProductionScore: false;
  modelExecutionAllowed: false;
  runtimeInvocationAllowed: false;
  inferenceEndpointExposed: false;
  artifactActivationAllowed: false;
  artifactBytesLoadingAllowed: false;
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
  signedReviewHash: string | null;
  recommendedNextAction: string;
};

export type InventoryStockoutCandidatePackageHumanReviewSignoffResponse = {
  success: true;
  contract: InventoryStockoutCandidatePackageHumanReviewSignoffContract;
  summary: InventoryStockoutCandidatePackageHumanReviewSignoffSummary;
  gates: InventoryStockoutCandidatePackageHumanReviewSignoffGate[];
  reviewPacket: Record<string, unknown>;
  signoffPayload: Record<string, unknown>;
  safetyPolicy: Record<string, unknown>;
  signoffRecord?: Record<string, unknown> | null;
};

export type MlCandidatePackageHumanReviewSignoffCatalogSummary = {
  generatedAt: string;
  contract: InventoryStockoutCandidatePackageHumanReviewSignoffContract;
  currentCandidatePackageHumanReviewSignoff: InventoryStockoutCandidatePackageHumanReviewSignoffSummary;
  lastCandidatePackageHumanReviewSignoffs: Array<Record<string, unknown>>;
  recommendedNextAction: string;
};

export type MlCandidatePackageHumanReviewSignoffSummaryPayload = {
  generatedAt?: string;
  currentCandidatePackageHumanReviewSignoff?: {
    status?: string;
    recommendation?: string;
    readinessScorePct?: number | null;
    binderId?: number | null;
    packageId?: number | null;
    modelKey?: string | null;
    modelVersion?: string | null;
    artifactChecksumSha256?: string | null;
    humanReviewRequired?: boolean;
    humanReviewEvidenceProvided?: boolean;
    signoffIsProductionApproval?: boolean;
    signoffCanLoadPackageBytes?: boolean;
    signoffCanExecuteModel?: boolean;
    signoffCanExposeInferenceEndpoint?: boolean;
    signoffCanActivateArtifact?: boolean;
    signoffCanDeployArtifact?: boolean;
    signoffCanProductionScore?: boolean;
    modelExecutionAllowed?: boolean;
    runtimeInvocationAllowed?: boolean;
    inferenceEndpointExposed?: boolean;
    artifactActivationAllowed?: boolean;
    artifactBytesLoadingAllowed?: boolean;
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
  lastCandidatePackageHumanReviewSignoffs?: Array<Record<string, unknown>>;
  recommendedNextAction?: string;
  [key: string]: unknown;
};
