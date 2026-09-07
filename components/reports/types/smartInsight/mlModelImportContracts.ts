// Extracted from ../smartInsightContracts.ts; type-only compatibility surface preserved.
export type MlModelImportSummaryPayload = {
  generatedAt?: string;
  currentValidation?: {
    contractKey?: string;
    modelKey?: string | null;
    modelVersion?: string | null;
    expectedTestRows?: number;
    importedRows?: number;
    matchedTestRows?: number;
    missingTestRows?: number;
    unexpectedRows?: number;
    duplicateRows?: number;
    threshold?: number;
    status?: string;
    metrics?: {
      accuracyPct?: number | null;
      precisionPct?: number | null;
      recallPct?: number | null;
      f1Pct?: number | null;
      balancedAccuracyPct?: number | null;
      [key: string]: unknown;
    };
    baseline?: {
      bestCandidateKey?: string | null;
      bestCandidateLabel?: string | null;
      f1Pct?: number | null;
      balancedAccuracyPct?: number | null;
      [key: string]: unknown;
    };
    comparison?: {
      deltaF1Pct?: number | null;
      deltaBalancedAccuracyPct?: number | null;
      beatsBaselineOnF1?: boolean | null;
      beatsBaselineOnBalancedAccuracy?: boolean | null;
      [key: string]: unknown;
    };
    issues?: Array<{ key?: string; severity?: string; message?: string; [key: string]: unknown }>;
    recommendedNextAction?: string;
    [key: string]: unknown;
  };
  lastModelResultImports?: Array<Record<string, unknown>>;
  [key: string]: unknown;
};
export type MlModelApprovalSummaryPayload = {
  generatedAt?: string;
  currentGate?: {
    status?: string;
    canApprove?: boolean;
    requiresMetricOverride?: boolean;
    modelKey?: string | null;
    modelVersion?: string | null;
    blockers?: string[];
    warnings?: string[];
    recommendedDecision?: string;
    recommendedNextAction?: string;
    [key: string]: unknown;
  };
  lastApprovedCandidate?: Record<string, unknown> | null;
  pendingReviewCount?: number;
  lastApprovalReviews?: Array<Record<string, unknown>>;
  recommendedNextAction?: string;
  [key: string]: unknown;
};
export type MlSafeInferenceBoundarySummaryPayload = {
  generatedAt?: string;
  currentBoundary?: {
    boundaryStatus?: string;
    recommendation?: string;
    readinessScorePct?: number | null;
    featureFlagKey?: string;
    featureFlagDefault?: boolean;
    runtimeEnabled?: boolean;
    inferenceEndpointExposed?: boolean;
    productionIntegrationAllowed?: boolean;
    blockerCount?: number;
    warningCount?: number;
    blockers?: string[];
    warnings?: string[];
    recommendedNextAction?: string;
    [key: string]: unknown;
  };
  lastBoundaries?: Array<Record<string, unknown>>;
  recommendedNextAction?: string;
  [key: string]: unknown;
};
export type MlModelArtifactMetadataSummaryPayload = {
  generatedAt?: string;
  currentArtifactMetadata?: {
    registryStatus?: string;
    recommendation?: string;
    readinessScorePct?: number | null;
    artifactChecksumSha256?: string | null;
    artifactSource?: string | null;
    artifactStorageRef?: string | null;
    ownerName?: string | null;
    ownerTeam?: string | null;
    runtimeLoadAllowed?: boolean;
    inferenceEnabled?: boolean;
    productionIntegrationAllowed?: boolean;
    blockerCount?: number;
    warningCount?: number;
    blockers?: string[];
    warnings?: string[];
    recommendedNextAction?: string;
    [key: string]: unknown;
  };
  lastArtifactMetadata?: Array<Record<string, unknown>>;
  recommendedNextAction?: string;
  [key: string]: unknown;
};
