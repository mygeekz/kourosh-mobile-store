export type MlMetadataToShadowReadinessStatus =
  | 'metadata_to_shadow_readiness_empty'
  | 'metadata_to_shadow_readiness_ready'
  | 'metadata_to_shadow_readiness_watch'
  | 'metadata_to_shadow_readiness_blocked';

export type MlMetadataToShadowCandidateReadiness =
  | 'ready_for_shadow_observation_metadata_only'
  | 'needs_metadata_review_before_shadow_observation'
  | 'blocked_from_shadow_observation_metadata_only';

export type MlMetadataToShadowReadinessBridgeRow = {
  candidatePackageId: string | null;
  modelKey: string | null;
  modelVersion: string | null;
  predictionType: string | null;
  validationStatus: string | null;
  validationScore: number | null;
  warningCount: number;
  errorCount: number;
  forbiddenFieldCount: number;
  metadataOnly: boolean;
  modelBinaryPresent: boolean;
  rawCsvPresent: boolean;
  activationDirectivePresent: boolean;
  inferenceDirectivePresent: boolean;
  businessMutationDirectivePresent: boolean;
  trainingPackageReference: string | null;
  candidateManifestHash: string | null;
  createdAt: string | null;
  shadowCandidateReadiness: MlMetadataToShadowCandidateReadiness;
  readinessSignals: string[];
  blockingReasons: string[];
  metadataToShadowBridgeOnly: true;
  readOnlyBridge: true;
  createsShadowRuntimeRecord: false;
  createsShadowObservation: false;
  modelExecutionAllowed: false;
  runtimeInvocationAllowed: false;
  inferenceEndpointExposed: false;
  artifactActivationAllowed: false;
  canMutateBusinessRecords: false;
};

export type MlMetadataToShadowReadinessBridgeSummary = {
  generatedAt: string;
  phase: 'Phase 12A';
  status: MlMetadataToShadowReadinessStatus;
  candidateCount: number;
  readyCandidateCount: number;
  watchCandidateCount: number;
  blockedCandidateCount: number;
  latestCandidatePackageId: string | null;
  recommendedNextAction: string;
  metadataOnlyBridge: true;
  readOnlyBridge: true;
  readinessOnly: true;
  createsShadowRuntimeRecord: false;
  createsShadowObservation: false;
  createsGovernanceWorkflow: false;
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
  rawTrainingCsvLoadingAllowed: false;
};

export type MlMetadataToShadowReadinessBridgeContract = {
  contractKey: 'ml_metadata_to_shadow_readiness_bridge_v1';
  contractVersion: 'v1';
  generatedAt: string;
  phase: 'Phase 12A';
  purpose: string;
  bridgeScope: 'metadata_to_shadow_candidate_readiness_only';
  sourceContract: 'ml_workbench_import_result_dashboard_v1';
  allowedRoute: '/api/brain/ml-workbench-import/metadata-results/shadow-readiness-bridge';
  forbiddenRoutes: string[];
  forbiddenBehavior: string[];
  operationalPolicy: {
    metadataOnlyBridge: true;
    readOnlyBridge: true;
    readinessOnly: true;
    createsShadowRuntimeRecord: false;
    createsShadowObservation: false;
    createsGovernanceWorkflow: false;
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
    rawTrainingCsvLoadingAllowed: false;
  };
};

export type MlMetadataToShadowReadinessBridgeResponse = {
  success: true;
  contract: MlMetadataToShadowReadinessBridgeContract;
  summary: MlMetadataToShadowReadinessBridgeSummary;
  rows: MlMetadataToShadowReadinessBridgeRow[];
  safetyPolicy: MlMetadataToShadowReadinessBridgeContract['operationalPolicy'];
};
