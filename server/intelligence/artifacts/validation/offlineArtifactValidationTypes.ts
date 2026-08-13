export type OfflineArtifactValidationStatus =
  | "pass"
  | "warning"
  | "fail"
  | "quarantined"
  | "insufficient_metadata";

export type OfflineArtifactValidationFindingSeverity = "info" | "warning" | "high" | "critical";
export type OfflineArtifactValidationFindingStatus = "pass" | "warning" | "fail";
export type OfflineArtifactTrustLabel =
  | "trusted_candidate"
  | "review_required"
  | "quarantine_recommended"
  | "reject_recommended";
export type OfflineArtifactDriftRisk = "low" | "medium" | "high" | "critical";

export interface OfflineArtifactValidationFinding {
  key: string;
  severity: OfflineArtifactValidationFindingSeverity;
  status: OfflineArtifactValidationFindingStatus;
  message: string;
  evidence: Record<string, unknown>;
  recommendedAction: string;
}

export interface OfflineArtifactCompatibilityDimension {
  status: "compatible" | "warning" | "incompatible" | "missing";
  expected: Record<string, unknown>;
  observed: Record<string, unknown>;
  missing?: string[];
  unsupported?: string[];
  notes: string[];
}

export interface OfflineArtifactCompatibilitySummary {
  envelopeSchema: OfflineArtifactCompatibilityDimension;
  modelFamily: OfflineArtifactCompatibilityDimension;
  featureContract: OfflineArtifactCompatibilityDimension;
  outputContract: OfflineArtifactCompatibilityDimension;
  trainingPackageReference: OfflineArtifactCompatibilityDimension;
  benchmarkReference: OfflineArtifactCompatibilityDimension;
  modelImportReference: OfflineArtifactCompatibilityDimension;
  hashSignature: OfflineArtifactCompatibilityDimension;
  metadataCompleteness: OfflineArtifactCompatibilityDimension;
  quarantineReasonQuality: OfflineArtifactCompatibilityDimension;
  contractDriftRisk: OfflineArtifactDriftRisk;
}

export interface OfflineArtifactFinalReviewSnapshot {
  finalReviewerDecision:
    | "not_reviewed"
    | "accepted_for_future_shadow_only"
    | "needs_exception_closure"
    | "quarantine_recommended"
    | "reject_recommended";
  archiveCompletenessStatus: "complete" | "partial" | "missing";
  exceptionClosureStatus: "closed" | "open" | "not_applicable";
  evidenceConfidenceAccepted: boolean;
  signedAuditGovernanceFinalReviewHash: string | null;
  notes: string[];
}

export interface OfflineArtifactValidationSafetyGate {
  modelExecutionAllowed: false;
  runtimeInvocationAllowed: false;
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
  artifactBytesLoadingAllowed: false;
  automaticDeletionAllowed: false;
  purgeJobAllowed: false;
}

export interface OfflineArtifactValidationResult {
  artifactId: string | number;
  artifactHash: string | null;
  artifactKind: string | null;
  schemaVersion: string | null;
  modelFamily: string | null;
  validationStatus: OfflineArtifactValidationStatus;
  trustScore: number;
  trustLabel: OfflineArtifactTrustLabel;
  driftRisk: OfflineArtifactDriftRisk;
  generatedAt: string;
  executionAllowed: false;
  activationAllowed: false;
  inferenceAllowed: false;
  businessMutationAllowed: false;
  findings: OfflineArtifactValidationFinding[];
  compatibility: OfflineArtifactCompatibilitySummary;
  finalReviewSnapshot: OfflineArtifactFinalReviewSnapshot;
  safety: OfflineArtifactValidationSafetyGate;
}

export interface OfflineArtifactValidationRecord extends OfflineArtifactValidationResult {
  id: number;
  createdAt: string;
  createdByUserId: string | number | null;
}

export interface OfflineArtifactValidationSummary {
  totalValidationResults: number;
  passResults: number;
  warningResults: number;
  failResults: number;
  quarantinedResults: number;
  insufficientMetadataResults: number;
  trustedCandidateResults: number;
  reviewRequiredResults: number;
  quarantineRecommendedResults: number;
  rejectRecommendedResults: number;
  criticalFindingResults: number;
  highFindingResults: number;
  missingEvidenceResults: number;
  averageTrustScore: number;
  latestValidation: OfflineArtifactValidationRecord | null;
  safety: OfflineArtifactValidationSafetyGate;
}

export interface OfflineArtifactMetadataEnvelope {
  artifactId: string | number;
  artifactHash: string | null;
  artifactKind: string | null;
  schemaVersion: string | null;
  modelFamily: string | null;
  declaredModelKey: string | null;
  declaredModelVersion: string | null;
  declaredPredictionType: string | null;
  declaredHorizon: string | number | null;
  runtimeFamily: string | null;
  createdAt: string | null;
  receivedAt: string | null;
  metadata: Record<string, unknown>;
  sourceRecord: Record<string, unknown>;
}
