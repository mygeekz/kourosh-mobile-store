// Phase 8I — Offline Candidate Package Final Audit Snapshot Governance Signoff Gate type surface.

export type CandidatePackageFinalAuditSnapshotGovernanceSignoffStatus =
  | "final_audit_snapshot_governance_signoff_ready"
  | "needs_phase8h_final_audit_snapshot"
  | "needs_signed_final_audit_snapshot_hash"
  | "needs_final_audit_snapshot_governance_signoff_evidence"
  | "safety_blocked";

export type CandidatePackageFinalAuditSnapshotGovernanceSignoffRecommendation =
  | "record_metadata_only_final_audit_snapshot_governance_signoff"
  | "record_phase8h_final_audit_snapshot_first"
  | "restore_signed_final_audit_snapshot_hash_traceability"
  | "collect_final_audit_snapshot_governance_signoff_evidence_first"
  | "resolve_safety_blocks_first";

export type InventoryStockoutCandidatePackageFinalAuditSnapshotGovernanceSignoffGate = {
  key: string;
  label: string;
  status: "pass" | "warning" | "block";
  value: unknown;
  message: string;
};

export type InventoryStockoutCandidatePackageFinalAuditSnapshotGovernanceSignoffContract = {
  contractKey: "inventory_stockout_candidate_package_final_audit_snapshot_governance_signoff_gate_v1";
  contractVersion: "v1";
  generatedAt: string;
  phase: "Phase 8I";
  purpose: string;
  signoffScope: "offline_candidate_package_final_audit_snapshot_governance_signoff_metadata_only";
  requiredUpstreamRetentionArchiveFinalAuditSnapshotKey: "inventory_stockout_candidate_package_retention_archive_final_audit_snapshot_v1";
  requiredUpstreamRetentionArchiveFinalAuditSnapshotVersion: "v1";
  requiredUpstreamEvidence: string[];
  requiredGovernanceSignoffEvidence: string[];
  includedSignoffSections: string[];
  forbiddenBehavior: string[];
  operationalPolicy: {
    finalAuditSnapshotGovernanceHumanSignoffRequired: true;
    finalAuditSnapshotGovernanceSignoffIsProductionApproval: false;
    finalAuditSnapshotGovernanceSignoffCanLoadSnapshotBytes: false;
    finalAuditSnapshotGovernanceSignoffCanLoadArchiveBytes: false;
    finalAuditSnapshotGovernanceSignoffCanLoadPackageBytes: false;
    finalAuditSnapshotGovernanceSignoffCanPersistArtifactBytes: false;
    finalAuditSnapshotGovernanceSignoffCanExecuteModel: false;
    finalAuditSnapshotGovernanceSignoffCanInvokeRuntime: false;
    finalAuditSnapshotGovernanceSignoffCanExposeInferenceEndpoint: false;
    finalAuditSnapshotGovernanceSignoffCanActivateArtifact: false;
    finalAuditSnapshotGovernanceSignoffCanDeployArtifact: false;
    finalAuditSnapshotGovernanceSignoffCanProductionScore: false;
    finalAuditSnapshotGovernanceSignoffCanScheduleRetentionJobs: false;
    finalAuditSnapshotGovernanceSignoffCanDeleteOrPurge: false;
    finalAuditSnapshotGovernanceSignoffMetadataOnly: true;
    retentionPolicyLocked: true;
    finalAuditSnapshotImmutable: true;
    governanceSignoffIsFinalAuditClosure: true;
    retentionExecutionAllowed: false;
    automaticDeletionAllowed: false;
    purgeJobAllowed: false;
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

export type InventoryStockoutCandidatePackageFinalAuditSnapshotGovernanceSignoffSummary = {
  finalAuditSnapshotGovernanceSignoffKey: "inventory_stockout_candidate_package_final_audit_snapshot_governance_signoff_gate_v1";
  finalAuditSnapshotGovernanceSignoffVersion: "v1";
  generatedAt: string;
  phase: "Phase 8I";
  status: CandidatePackageFinalAuditSnapshotGovernanceSignoffStatus;
  recommendation: CandidatePackageFinalAuditSnapshotGovernanceSignoffRecommendation;
  readinessScorePct: number;
  retentionArchiveFinalAuditSnapshotId: number | null;
  retentionArchiveFinalAuditSnapshotKey: "inventory_stockout_candidate_package_retention_archive_final_audit_snapshot_v1";
  retentionArchiveFinalAuditSnapshotVersion: "v1";
  retentionArchiveFinalAuditSnapshotStatus: string | null;
  signedRetentionArchiveFinalAuditSnapshotHash: string | null;
  retentionSignoffArchivePackId: number | null;
  signedRetentionSignoffArchiveHash: string | null;
  packageId: number | null;
  packageKey: "inventory_stockout_offline_candidate_model_package_v1";
  packageVersion: "v1";
  finalAuditSnapshotGovernanceSignoffMode: "metadata_only_final_audit_snapshot_governance_signoff_gate";
  finalAuditSnapshotGovernanceSignoffEvidenceProvided: boolean;
  finalAuditSnapshotGovernanceHumanSignoffRequired: true;
  finalAuditSnapshotGovernanceSignoffIsProductionApproval: false;
  finalAuditSnapshotGovernanceSignoffCanLoadSnapshotBytes: false;
  finalAuditSnapshotGovernanceSignoffCanLoadArchiveBytes: false;
  finalAuditSnapshotGovernanceSignoffCanLoadPackageBytes: false;
  finalAuditSnapshotGovernanceSignoffCanPersistArtifactBytes: false;
  finalAuditSnapshotGovernanceSignoffCanExecuteModel: false;
  finalAuditSnapshotGovernanceSignoffCanInvokeRuntime: false;
  finalAuditSnapshotGovernanceSignoffCanExposeInferenceEndpoint: false;
  finalAuditSnapshotGovernanceSignoffCanActivateArtifact: false;
  finalAuditSnapshotGovernanceSignoffCanDeployArtifact: false;
  finalAuditSnapshotGovernanceSignoffCanProductionScore: false;
  finalAuditSnapshotGovernanceSignoffCanScheduleRetentionJobs: false;
  finalAuditSnapshotGovernanceSignoffCanDeleteOrPurge: false;
  finalAuditSnapshotGovernanceSignoffMetadataOnly: true;
  retentionPolicyLocked: true;
  finalAuditSnapshotImmutable: true;
  governanceSignoffIsFinalAuditClosure: true;
  retentionExecutionAllowed: false;
  automaticDeletionAllowed: false;
  purgeJobAllowed: false;
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
  signedFinalAuditSnapshotGovernanceSignoffHash: string | null;
  recommendedNextAction: string;
};

export type InventoryStockoutCandidatePackageFinalAuditSnapshotGovernanceSignoffResponse = {
  success: true;
  contract: InventoryStockoutCandidatePackageFinalAuditSnapshotGovernanceSignoffContract;
  summary: InventoryStockoutCandidatePackageFinalAuditSnapshotGovernanceSignoffSummary;
  gates: InventoryStockoutCandidatePackageFinalAuditSnapshotGovernanceSignoffGate[];
  signoffPacket: Record<string, unknown>;
  signoffPolicy: Record<string, unknown>;
  safetyPolicy: Record<string, unknown>;
  signoffRecord?: Record<string, unknown> | null;
};

export type MlCandidatePackageFinalAuditSnapshotGovernanceSignoffCatalogSummary = {
  generatedAt: string;
  contract: InventoryStockoutCandidatePackageFinalAuditSnapshotGovernanceSignoffContract;
  currentCandidatePackageFinalAuditSnapshotGovernanceSignoff: InventoryStockoutCandidatePackageFinalAuditSnapshotGovernanceSignoffSummary;
  lastCandidatePackageFinalAuditSnapshotGovernanceSignoffs: Array<Record<string, unknown>>;
  recommendedNextAction: string;
};

export type MlCandidatePackageFinalAuditSnapshotGovernanceSignoffSummaryPayload = {
  generatedAt?: string;
  currentCandidatePackageFinalAuditSnapshotGovernanceSignoff?: {
    status?: string;
    recommendation?: string;
    readinessScorePct?: number | null;
    retentionArchiveFinalAuditSnapshotId?: number | null;
    signedRetentionArchiveFinalAuditSnapshotHash?: string | null;
    finalAuditSnapshotGovernanceSignoffEvidenceProvided?: boolean;
    finalAuditSnapshotGovernanceSignoffIsProductionApproval?: boolean;
    finalAuditSnapshotGovernanceSignoffCanLoadSnapshotBytes?: boolean;
    finalAuditSnapshotGovernanceSignoffCanLoadArchiveBytes?: boolean;
    finalAuditSnapshotGovernanceSignoffCanLoadPackageBytes?: boolean;
    finalAuditSnapshotGovernanceSignoffCanPersistArtifactBytes?: boolean;
    finalAuditSnapshotGovernanceSignoffCanExecuteModel?: boolean;
    finalAuditSnapshotGovernanceSignoffCanExposeInferenceEndpoint?: boolean;
    finalAuditSnapshotGovernanceSignoffCanActivateArtifact?: boolean;
    finalAuditSnapshotGovernanceSignoffCanDeployArtifact?: boolean;
    finalAuditSnapshotGovernanceSignoffCanProductionScore?: boolean;
    finalAuditSnapshotGovernanceSignoffCanScheduleRetentionJobs?: boolean;
    finalAuditSnapshotGovernanceSignoffCanDeleteOrPurge?: boolean;
    finalAuditSnapshotGovernanceSignoffMetadataOnly?: boolean;
    retentionPolicyLocked?: boolean;
    finalAuditSnapshotImmutable?: boolean;
    governanceSignoffIsFinalAuditClosure?: boolean;
    retentionExecutionAllowed?: boolean;
    automaticDeletionAllowed?: boolean;
    purgeJobAllowed?: boolean;
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
  lastCandidatePackageFinalAuditSnapshotGovernanceSignoffs?: Array<Record<string, unknown>>;
  recommendedNextAction?: string;
  [key: string]: unknown;
};
