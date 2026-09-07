// Phase 7K-Cleanup modular type surface. Behavior/type names preserved.
export type SafeInferenceBoundarySkeletonStatus = "skeleton_ready" | "needs_governance_signoff" | "needs_feature_flag" | "blocked" | "not_started";

export type SafeInferenceBoundaryRecommendation =
  | "prepare_disabled_boundary_for_phase3b"
  | "complete_governance_signoff"
  | "define_feature_flag"
  | "keep_boundary_blocked";

export type InventoryStockoutSafeInferenceBoundaryContract = {
  contractKey: "inventory_stockout_safe_inference_boundary_skeleton_v1";
  contractVersion: "v1";
  generatedAt: string;
  purpose: string;
  acceptedGovernanceKey: "inventory_stockout_final_governance_signoff_implementation_entry_decision_v1";
  boundaryScope: "phase3a_disabled_safe_inference_boundary_skeleton_only";
  featureFlagKey: "ml.inventoryStockout.safeInferenceBoundary.enabled";
  featureFlagDefault: false;
  boundaryRules: string[];
  forbiddenBehavior: string[];
  operationalPolicy: {
    productionIntegrationAllowed: false;
    inferenceRuntimeEnabled: false;
    decisionAutomationAllowed: false;
    canChangeInventoryOrAccounting: false;
  };
};

export type InventoryStockoutSafeInferenceBoundaryGate = {
  key: string;
  label: string;
  status: "pass" | "warning" | "block";
  value?: unknown;
  message: string;
};

export type InventoryStockoutSafeInferenceBoundarySummary = {
  skeletonKey: "inventory_stockout_safe_inference_boundary_skeleton_v1";
  generatedAt: string;
  importId: number | null;
  governanceSignoffId: number | null;
  modelKey: string | null;
  modelVersion: string | null;
  governanceStatus: string | null;
  implementationEntryDecision: string | null;
  boundaryStatus: SafeInferenceBoundarySkeletonStatus;
  recommendation: SafeInferenceBoundaryRecommendation;
  readinessScorePct: number;
  featureFlagKey: "ml.inventoryStockout.safeInferenceBoundary.enabled";
  featureFlagDefault: false;
  runtimeEnabled: false;
  inferenceEndpointExposed: false;
  productionIntegrationAllowed: false;
  decisionAutomationAllowed: false;
  canChangeInventoryOrAccounting: false;
  shadowOnlyCapable: false;
  fallbackStrategy: "rule_statistical_baseline_v1_only";
  blockerCount: number;
  warningCount: number;
  passCount: number;
  totalGateCount: number;
  boundaryGates: InventoryStockoutSafeInferenceBoundaryGate[];
  blockers: string[];
  warnings: string[];
  recommendedNextAction: string;
};

export type InventoryStockoutSafeInferenceBoundaryResponse = {
  generatedAt: string;
  contract: InventoryStockoutSafeInferenceBoundaryContract;
  summary: InventoryStockoutSafeInferenceBoundarySummary;
  latestGovernanceSignoff: Record<string, unknown> | null;
  boundaryContract: Record<string, unknown>;
  disabledRuntimeManifest: Record<string, unknown>;
  safetyControls: Record<string, unknown>;
  featureFlagPolicy: Record<string, unknown>;
  fallbackPolicy: Record<string, unknown>;
  auditExport: Record<string, unknown>;
  previousBoundarySkeletons: Array<Record<string, unknown>>;
  operationalPolicy: {
    safeInferenceBoundarySkeletonOnly: true;
    productionIntegrationAllowed: false;
    inferenceRuntimeEnabled: false;
    decisionAutomationAllowed: false;
    message: string;
  };
  boundaryRecord?: Record<string, unknown> | null;
};

export type MlSafeInferenceBoundaryCatalogSummary = {
  generatedAt: string;
  contract: InventoryStockoutSafeInferenceBoundaryContract;
  currentBoundary: InventoryStockoutSafeInferenceBoundarySummary;
  lastBoundaries: Array<Record<string, unknown>>;
  recommendedNextAction: string;
};

export type ModelArtifactMetadataRegistryStatus = "metadata_ready" | "needs_safe_boundary" | "needs_artifact_metadata" | "blocked" | "not_started";

export type ModelArtifactMetadataRecommendation =
  | "prepare_shadow_adapter_contract"
  | "complete_safe_boundary_skeleton"
  | "complete_artifact_metadata"
  | "keep_artifact_blocked";

export type InventoryStockoutModelArtifactMetadataContract = {
  contractKey: "inventory_stockout_model_artifact_metadata_registry_v1";
  contractVersion: "v1";
  generatedAt: string;
  purpose: string;
  acceptedBoundaryKey: "inventory_stockout_safe_inference_boundary_skeleton_v1";
  registryScope: "phase3b_metadata_registry_only_no_runtime_load";
  requiredMetadata: string[];
  forbiddenBehavior: string[];
  operationalPolicy: {
    productionIntegrationAllowed: false;
    inferenceRuntimeEnabled: false;
    decisionAutomationAllowed: false;
    canChangeInventoryOrAccounting: false;
  };
};

export type InventoryStockoutModelArtifactMetadataGate = {
  key: string;
  label: string;
  status: "pass" | "warning" | "block";
  value?: unknown;
  message: string;
};

export type InventoryStockoutModelArtifactMetadataSummary = {
  artifactKey: "inventory_stockout_model_artifact_metadata_registry_v1";
  artifactVersion: "v1";
  generatedAt: string;
  importId: number | null;
  safeBoundarySkeletonId: number | null;
  governanceSignoffId: number | null;
  modelKey: string | null;
  modelVersion: string | null;
  artifactStatus: "metadata_only";
  artifactSource: string | null;
  artifactStorageRef: string | null;
  artifactChecksumSha256: string | null;
  checksumAlgorithm: "sha256";
  algorithmFamily: string | null;
  trainingPackageKey: string | null;
  trainingPackageVersion: string | null;
  datasetKey: string | null;
  datasetVersion: string | null;
  ownerName: string | null;
  ownerTeam: string | null;
  approvalTrailStatus: string | null;
  registryStatus: ModelArtifactMetadataRegistryStatus;
  recommendation: ModelArtifactMetadataRecommendation;
  readinessScorePct: number;
  runtimeLoadAllowed: false;
  artifactBinaryStored: false;
  inferenceEnabled: false;
  productionIntegrationAllowed: false;
  decisionAutomationAllowed: false;
  canChangeInventoryOrAccounting: false;
  blockerCount: number;
  warningCount: number;
  passCount: number;
  totalGateCount: number;
  metadataGates: InventoryStockoutModelArtifactMetadataGate[];
  blockers: string[];
  warnings: string[];
  recommendedNextAction: string;
};

export type InventoryStockoutModelArtifactMetadataResponse = {
  generatedAt: string;
  contract: InventoryStockoutModelArtifactMetadataContract;
  summary: InventoryStockoutModelArtifactMetadataSummary;
  latestSafeBoundary: Record<string, unknown> | null;
  modelImport: Record<string, unknown> | null;
  metadataContract: Record<string, unknown>;
  artifactManifest: Record<string, unknown>;
  lineage: Record<string, unknown>;
  approvalTrail: Record<string, unknown>;
  safetyPolicy: Record<string, unknown>;
  auditExport: Record<string, unknown>;
  previousArtifactMetadata: Array<Record<string, unknown>>;
  operationalPolicy: {
    modelArtifactMetadataOnly: true;
    productionIntegrationAllowed: false;
    inferenceRuntimeEnabled: false;
    decisionAutomationAllowed: false;
    message: string;
  };
  artifactRecord?: Record<string, unknown> | null;
};

export type MlModelArtifactMetadataCatalogSummary = {
  generatedAt: string;
  contract: InventoryStockoutModelArtifactMetadataContract;
  currentArtifactMetadata: InventoryStockoutModelArtifactMetadataSummary;
  lastArtifactMetadata: Array<Record<string, unknown>>;
  recommendedNextAction: string;
};

export type ShadowInferenceAdapterContractStatus = "adapter_contract_ready" | "needs_artifact_metadata" | "needs_safe_boundary" | "blocked" | "not_started";

export type ShadowInferenceAdapterRecommendation =
  | "prepare_disabled_shadow_adapter_implementation"
  | "complete_artifact_metadata_registry"
  | "complete_safe_boundary_skeleton"
  | "keep_shadow_adapter_blocked";

export type InventoryStockoutShadowInferenceAdapterContract = {
  contractKey: "inventory_stockout_shadow_inference_adapter_contract_v1";
  contractVersion: "v1";
  generatedAt: string;
  purpose: string;
  acceptedArtifactRegistryKey: "inventory_stockout_model_artifact_metadata_registry_v1";
  acceptedBoundaryKey: "inventory_stockout_safe_inference_boundary_skeleton_v1";
  adapterScope: "phase3c_shadow_adapter_contract_only_no_model_execution";
  requiredReferences: string[];
  forbiddenBehavior: string[];
  operationalPolicy: {
    productionIntegrationAllowed: false;
    inferenceRuntimeEnabled: false;
    decisionAutomationAllowed: false;
    canChangeInventoryOrAccounting: false;
  };
};

export type InventoryStockoutShadowInferenceAdapterGate = {
  key: string;
  label: string;
  status: "pass" | "warning" | "block";
  value?: unknown;
  message: string;
};

export type InventoryStockoutShadowInferenceAdapterSummary = {
  adapterKey: "inventory_stockout_shadow_inference_adapter_contract_v1";
  adapterVersion: "v1";
  generatedAt: string;
  importId: number | null;
  artifactMetadataId: number | null;
  safeBoundarySkeletonId: number | null;
  modelKey: string | null;
  modelVersion: string | null;
  registryStatus: string | null;
  boundaryStatus: string | null;
  adapterStatus: ShadowInferenceAdapterContractStatus;
  recommendation: ShadowInferenceAdapterRecommendation;
  readinessScorePct: number;
  featureFlagKey: "ml.inventoryStockout.shadowAdapter.enabled";
  featureFlagDefault: false;
  runtimeInvocationAllowed: false;
  modelExecutionAllowed: false;
  inferenceEndpointExposed: false;
  productionIntegrationAllowed: false;
  decisionAutomationAllowed: false;
  canChangeInventoryOrAccounting: false;
  shadowModeOnly: true;
  fallbackStrategy: "rule_statistical_baseline_v1_only";
  blockerCount: number;
  warningCount: number;
  passCount: number;
  totalGateCount: number;
  adapterGates: InventoryStockoutShadowInferenceAdapterGate[];
  blockers: string[];
  warnings: string[];
  recommendedNextAction: string;
};

export type InventoryStockoutShadowInferenceAdapterResponse = {
  generatedAt: string;
  contract: InventoryStockoutShadowInferenceAdapterContract;
  summary: InventoryStockoutShadowInferenceAdapterSummary;
  latestArtifactMetadata: Record<string, unknown> | null;
  latestSafeBoundary: Record<string, unknown> | null;
  modelImport: Record<string, unknown> | null;
  adapterContract: Record<string, unknown>;
  ioContract: Record<string, unknown>;
  guardrailPolicy: Record<string, unknown>;
  fallbackPolicy: Record<string, unknown>;
  auditExport: Record<string, unknown>;
  previousAdapterContracts: Array<Record<string, unknown>>;
  operationalPolicy: {
    shadowInferenceAdapterContractOnly: true;
    productionIntegrationAllowed: false;
    inferenceRuntimeEnabled: false;
    decisionAutomationAllowed: false;
    message: string;
  };
  adapterRecord?: Record<string, unknown> | null;
};

export type MlShadowInferenceAdapterCatalogSummary = {
  generatedAt: string;
  contract: InventoryStockoutShadowInferenceAdapterContract;
  currentShadowAdapter: InventoryStockoutShadowInferenceAdapterSummary;
  lastShadowAdapters: Array<Record<string, unknown>>;
  recommendedNextAction: string;
};

export type DisabledShadowAdapterShellStatus = "shell_ready" | "needs_adapter_contract" | "needs_artifact_metadata" | "needs_safe_boundary" | "blocked" | "not_started";

export type DisabledShadowAdapterShellRecommendation =
  | "prepare_shadow_runtime_contract_tests"
  | "complete_shadow_adapter_contract"
  | "complete_artifact_metadata_registry"
  | "complete_safe_boundary_skeleton"
  | "keep_shell_disabled";

export type InventoryStockoutDisabledShadowAdapterShellContract = {
  contractKey: "inventory_stockout_disabled_shadow_adapter_shell_v1";
  contractVersion: "v1";
  generatedAt: string;
  purpose: string;
  acceptedAdapterContractKey: "inventory_stockout_shadow_inference_adapter_contract_v1";
  shellScope: "phase3d_disabled_shadow_adapter_shell_no_model_execution";
  requiredReferences: string[];
  forbiddenBehavior: string[];
  operationalPolicy: {
    productionIntegrationAllowed: false;
    inferenceRuntimeEnabled: false;
    decisionAutomationAllowed: false;
    canChangeInventoryOrAccounting: false;
  };
};

export type InventoryStockoutDisabledShadowAdapterShellGate = {
  key: string;
  label: string;
  status: "pass" | "warning" | "block";
  value?: unknown;
  message: string;
};

export type InventoryStockoutDisabledShadowAdapterShellSummary = {
  shellKey: "inventory_stockout_disabled_shadow_adapter_shell_v1";
  shellVersion: "v1";
  generatedAt: string;
  importId: number | null;
  adapterContractId: number | null;
  artifactMetadataId: number | null;
  safeBoundarySkeletonId: number | null;
  modelKey: string | null;
  modelVersion: string | null;
  adapterStatus: string | null;
  registryStatus: string | null;
  boundaryStatus: string | null;
  shellStatus: DisabledShadowAdapterShellStatus;
  recommendation: DisabledShadowAdapterShellRecommendation;
  readinessScorePct: number;
  featureFlagKey: "ml.inventoryStockout.disabledShadowAdapterShell.enabled";
  featureFlagDefault: false;
  upstreamFeatureFlagKey: "ml.inventoryStockout.shadowAdapter.enabled";
  shellEnabled: false;
  runtimeInvocationAllowed: false;
  modelExecutionAllowed: false;
  inferenceEndpointExposed: false;
  productionIntegrationAllowed: false;
  decisionAutomationAllowed: false;
  canChangeInventoryOrAccounting: false;
  noOpAdapterOnly: true;
  auditHookEnabled: true;
  shadowModeOnly: true;
  fallbackStrategy: "rule_statistical_baseline_v1_only";
  blockerCount: number;
  warningCount: number;
  passCount: number;
  totalGateCount: number;
  shellGates: InventoryStockoutDisabledShadowAdapterShellGate[];
  blockers: string[];
  warnings: string[];
  recommendedNextAction: string;
};

export type InventoryStockoutDisabledShadowAdapterShellResponse = {
  generatedAt: string;
  contract: InventoryStockoutDisabledShadowAdapterShellContract;
  summary: InventoryStockoutDisabledShadowAdapterShellSummary;
  latestAdapterContract: Record<string, unknown> | null;
  latestArtifactMetadata: Record<string, unknown> | null;
  latestSafeBoundary: Record<string, unknown> | null;
  modelImport: Record<string, unknown> | null;
  shellInterface: Record<string, unknown>;
  noOpAdapterManifest: Record<string, unknown>;
  auditHookPolicy: Record<string, unknown>;
  fallbackPolicy: Record<string, unknown>;
  auditExport: Record<string, unknown>;
  previousShells: Array<Record<string, unknown>>;
  operationalPolicy: {
    disabledShadowAdapterShellOnly: true;
    productionIntegrationAllowed: false;
    inferenceRuntimeEnabled: false;
    decisionAutomationAllowed: false;
    message: string;
  };
  shellRecord?: Record<string, unknown> | null;
};

export type MlDisabledShadowAdapterShellCatalogSummary = {
  generatedAt: string;
  contract: InventoryStockoutDisabledShadowAdapterShellContract;
  currentDisabledShadowAdapterShell: InventoryStockoutDisabledShadowAdapterShellSummary;
  lastDisabledShadowAdapterShells: Array<Record<string, unknown>>;
  recommendedNextAction: string;
};

export type ShadowRuntimeContractTestFixtureStatus = "fixtures_ready" | "needs_disabled_shell" | "blocked" | "not_started";

export type ShadowRuntimeContractTestFixtureRecommendation =
  | "prepare_no_op_shadow_runtime_harness"
  | "complete_disabled_shadow_adapter_shell"
  | "keep_shadow_runtime_tests_disabled";

export type InventoryStockoutShadowRuntimeContractTestFixturesContract = {
  contractKey: "inventory_stockout_shadow_runtime_contract_test_fixtures_v1";
  contractVersion: "v1";
  generatedAt: string;
  purpose: string;
  acceptedShellKey: "inventory_stockout_disabled_shadow_adapter_shell_v1";
  fixtureScope: "phase3e_shadow_runtime_contract_tests_no_op_audit_fixtures";
  requiredAssertions: string[];
  forbiddenBehavior: string[];
  operationalPolicy: {
    productionIntegrationAllowed: false;
    inferenceRuntimeEnabled: false;
    decisionAutomationAllowed: false;
    canChangeInventoryOrAccounting: false;
  };
};

export type InventoryStockoutShadowRuntimeContractTestFixtureGate = {
  key: string;
  label: string;
  status: "pass" | "warning" | "block";
  value?: unknown;
  message: string;
};

export type InventoryStockoutShadowRuntimeContractTestFixturesSummary = {
  fixtureKey: "inventory_stockout_shadow_runtime_contract_test_fixtures_v1";
  fixtureVersion: "v1";
  generatedAt: string;
  importId: number | null;
  disabledShellId: number | null;
  adapterContractId: number | null;
  artifactMetadataId: number | null;
  safeBoundarySkeletonId: number | null;
  modelKey: string | null;
  modelVersion: string | null;
  shellStatus: string | null;
  fixtureStatus: ShadowRuntimeContractTestFixtureStatus;
  recommendation: ShadowRuntimeContractTestFixtureRecommendation;
  readinessScorePct: number;
  featureFlagKey: "ml.inventoryStockout.shadowRuntimeContractTests.enabled";
  featureFlagDefault: false;
  runtimeInvocationAllowed: false;
  modelExecutionAllowed: false;
  inferenceEndpointExposed: false;
  productionIntegrationAllowed: false;
  decisionAutomationAllowed: false;
  canChangeInventoryOrAccounting: false;
  noOpFixturesOnly: true;
  baselineOnlySourceOfTruth: true;
  fixtureCount: number;
  contractTestCount: number;
  mutationAssertionCount: number;
  blockerCount: number;
  warningCount: number;
  passCount: number;
  totalGateCount: number;
  fixtureGates: InventoryStockoutShadowRuntimeContractTestFixtureGate[];
  blockers: string[];
  warnings: string[];
  recommendedNextAction: string;
};

export type InventoryStockoutShadowRuntimeContractTestFixturesResponse = {
  generatedAt: string;
  contract: InventoryStockoutShadowRuntimeContractTestFixturesContract;
  summary: InventoryStockoutShadowRuntimeContractTestFixturesSummary;
  latestDisabledShell: Record<string, unknown> | null;
  modelImport: Record<string, unknown> | null;
  contractTestSuite: Record<string, unknown>;
  noOpAuditFixtures: Array<Record<string, unknown>>;
  noMutationAssertions: Array<Record<string, unknown>>;
  fallbackPolicy: Record<string, unknown>;
  auditExport: Record<string, unknown>;
  previousFixtureRuns: Array<Record<string, unknown>>;
  operationalPolicy: {
    shadowRuntimeContractTestsOnly: true;
    productionIntegrationAllowed: false;
    inferenceRuntimeEnabled: false;
    decisionAutomationAllowed: false;
    message: string;
  };
  fixtureRecord?: Record<string, unknown> | null;
};

export type MlShadowRuntimeContractTestFixturesCatalogSummary = {
  generatedAt: string;
  contract: InventoryStockoutShadowRuntimeContractTestFixturesContract;
  currentShadowRuntimeContractTestFixtures: InventoryStockoutShadowRuntimeContractTestFixturesSummary;
  lastShadowRuntimeContractTestFixtures: Array<Record<string, unknown>>;
  recommendedNextAction: string;
};

export type DisabledShadowRuntimeHarnessStatus = "harness_ready" | "needs_runtime_contract_fixtures" | "blocked" | "not_started";

export type DisabledShadowRuntimeHarnessRecommendation =
  | "prepare_shadow_adapter_observation_log"
  | "complete_runtime_contract_fixtures"
  | "keep_disabled_harness_off";

export type InventoryStockoutDisabledShadowRuntimeHarnessContract = {
  contractKey: "inventory_stockout_disabled_shadow_runtime_harness_v1";
  contractVersion: "v1";
  generatedAt: string;
  purpose: string;
  requiredFixtureKey: "inventory_stockout_shadow_runtime_contract_test_fixtures_v1";
  harnessScope: "phase3f_disabled_shadow_runtime_harness_no_op_validation_only";
  requiredAssertions: string[];
  forbiddenBehavior: string[];
  operationalPolicy: {
    productionIntegrationAllowed: false;
    inferenceRuntimeEnabled: false;
    decisionAutomationAllowed: false;
    canChangeInventoryOrAccounting: false;
  };
};

export type InventoryStockoutDisabledShadowRuntimeHarnessGate = {
  key: string;
  label: string;
  status: "pass" | "warning" | "block";
  value?: unknown;
  message: string;
};

export type InventoryStockoutDisabledShadowRuntimeHarnessSummary = {
  harnessKey: "inventory_stockout_disabled_shadow_runtime_harness_v1";
  harnessVersion: "v1";
  generatedAt: string;
  importId: number | null;
  fixtureRunId: number | null;
  disabledShellId: number | null;
  adapterContractId: number | null;
  artifactMetadataId: number | null;
  safeBoundarySkeletonId: number | null;
  modelKey: string | null;
  modelVersion: string | null;
  fixtureStatus: string | null;
  harnessStatus: DisabledShadowRuntimeHarnessStatus;
  recommendation: DisabledShadowRuntimeHarnessRecommendation;
  readinessScorePct: number;
  featureFlagKey: "ml.inventoryStockout.disabledShadowRuntimeHarness.enabled";
  featureFlagDefault: false;
  harnessEnabled: false;
  runtimeInvocationAllowed: false;
  modelExecutionAllowed: false;
  inferenceEndpointExposed: false;
  productionIntegrationAllowed: false;
  decisionAutomationAllowed: false;
  canChangeInventoryOrAccounting: false;
  noOpHarnessOnly: true;
  baselineOnlySourceOfTruth: true;
  auditHookEnabled: true;
  harnessCheckCount: number;
  mutationGuardCount: number;
  blockerCount: number;
  warningCount: number;
  passCount: number;
  totalGateCount: number;
  harnessGates: InventoryStockoutDisabledShadowRuntimeHarnessGate[];
  blockers: string[];
  warnings: string[];
  recommendedNextAction: string;
};

export type InventoryStockoutDisabledShadowRuntimeHarnessResponse = {
  generatedAt: string;
  contract: InventoryStockoutDisabledShadowRuntimeHarnessContract;
  summary: InventoryStockoutDisabledShadowRuntimeHarnessSummary;
  latestFixtureRun: Record<string, unknown> | null;
  modelImport: Record<string, unknown> | null;
  harnessManifest: Record<string, unknown>;
  validationRun: Record<string, unknown>;
  noOpAssertions: Array<Record<string, unknown>>;
  mutationGuardResults: Array<Record<string, unknown>>;
  fallbackPolicy: Record<string, unknown>;
  auditExport: Record<string, unknown>;
  previousHarnessRuns: Array<Record<string, unknown>>;
  operationalPolicy: {
    disabledHarnessOnly: true;
    productionIntegrationAllowed: false;
    inferenceRuntimeEnabled: false;
    decisionAutomationAllowed: false;
    message: string;
  };
  harnessRecord?: Record<string, unknown> | null;
};

export type MlDisabledShadowRuntimeHarnessCatalogSummary = {
  generatedAt: string;
  contract: InventoryStockoutDisabledShadowRuntimeHarnessContract;
  currentDisabledShadowRuntimeHarness: InventoryStockoutDisabledShadowRuntimeHarnessSummary;
  lastDisabledShadowRuntimeHarnesses: Array<Record<string, unknown>>;
  recommendedNextAction: string;
};

export type ShadowAdapterObservationLogContractStatus = "observation_contract_ready" | "needs_disabled_runtime_harness" | "blocked" | "not_started";

export type ShadowAdapterObservationLogContractRecommendation =
  | "record_observation_contract_only"
  | "complete_disabled_runtime_harness_first"
  | "keep_shadow_observation_logging_disabled";

export type InventoryStockoutShadowAdapterObservationLogContract = {
  contractKey: string;
  contractVersion: string;
  generatedAt: string;
  purpose: string;
  requiredHarnessKey: string;
  observationScope: string;
  requiredAssertions: string[];
  forbiddenBehavior: string[];
  operationalPolicy: {
    productionIntegrationAllowed: boolean;
    inferenceRuntimeEnabled: boolean;
    decisionAutomationAllowed: boolean;
    canChangeInventoryOrAccounting: boolean;
  };
};

export type InventoryStockoutShadowAdapterObservationLogGate = {
  key: string;
  label: string;
  status: "pass" | "warning" | "block";
  value: unknown;
  message: string;
};

export type InventoryStockoutShadowAdapterObservationLogSummary = {
  generatedAt: string;
  importId: number | null;
  modelKey: string | null;
  modelVersion: string | null;
  observationContractStatus: ShadowAdapterObservationLogContractStatus;
  recommendation: ShadowAdapterObservationLogContractRecommendation;
  readinessScorePct: number;
  featureFlagKey: string;
  featureFlagDefault: boolean;
  observationLoggingEnabled: boolean;
  runtimeInvocationAllowed: boolean;
  modelExecutionAllowed: boolean;
  inferenceEndpointExposed: boolean;
  productionIntegrationAllowed: boolean;
  noOpObservationOnly: boolean;
  baselineOnlySourceOfTruth: boolean;
  observationSchemaVersion: string;
  blockerCount: number;
  warningCount: number;
  blockers: string[];
  warnings: string[];
  recommendedNextAction: string;
};

export type InventoryStockoutShadowAdapterObservationLogResponse = {
  success: true;
  contract: InventoryStockoutShadowAdapterObservationLogContract;
  summary: InventoryStockoutShadowAdapterObservationLogSummary;
  gates: InventoryStockoutShadowAdapterObservationLogGate[];
  observationEventSchema: Record<string, unknown>;
  noOpObservationFixture: Record<string, unknown>;
  mutationGuardPolicy: Record<string, unknown>;
  retentionPolicy: Record<string, unknown>;
  auditExport: Record<string, unknown>;
  recentObservationContracts: Array<Record<string, unknown>>;
};

export type MlShadowAdapterObservationLogCatalogSummary = {
  contract: InventoryStockoutShadowAdapterObservationLogContract;
  currentShadowAdapterObservationLogContract: InventoryStockoutShadowAdapterObservationLogSummary;
  lastShadowAdapterObservationLogContracts: Array<Record<string, unknown>>;
  recommendedNextAction: string;
};

export type ShadowObservationEventStoreStatus = "event_store_ready" | "needs_observation_contract" | "blocked" | "not_started";

export type ShadowObservationEventStoreRecommendation =
  | "record_audit_only_observation_event"
  | "complete_observation_contract_first"
  | "keep_shadow_observation_event_store_runtime_disabled";

export type InventoryStockoutShadowObservationEventStoreContract = {
  contractKey: string;
  contractVersion: string;
  generatedAt: string;
  purpose: string;
  requiredObservationContractKey: string;
  eventStoreScope: string;
  requiredAssertions: string[];
  forbiddenBehavior: string[];
  operationalPolicy: {
    productionIntegrationAllowed: boolean;
    inferenceRuntimeEnabled: boolean;
    decisionAutomationAllowed: boolean;
    canChangeInventoryOrAccounting: boolean;
  };
};

export type InventoryStockoutShadowObservationEventStoreGate = {
  key: string;
  label: string;
  status: "pass" | "warning" | "block";
  value: unknown;
  message: string;
};

export type InventoryStockoutShadowObservationEventStoreSummary = {
  generatedAt: string;
  importId: number | null;
  observationContractId: number | null;
  modelKey: string | null;
  modelVersion: string | null;
  eventStoreStatus: ShadowObservationEventStoreStatus;
  recommendation: ShadowObservationEventStoreRecommendation;
  readinessScorePct: number;
  featureFlagKey: string;
  featureFlagDefault: boolean;
  eventStoreEnabled: boolean;
  runtimeInvocationAllowed: boolean;
  modelExecutionAllowed: boolean;
  inferenceEndpointExposed: boolean;
  productionIntegrationAllowed: boolean;
  decisionAutomationAllowed: boolean;
  canChangeInventoryOrAccounting: boolean;
  auditOnly: boolean;
  mutationAllowed: boolean;
  baselineOnlySourceOfTruth: boolean;
  observationEventSchemaVersion: string;
  eventCount: number;
  forbiddenFieldAttemptCount: number;
  blockerCount: number;
  warningCount: number;
  passCount: number;
  totalGateCount: number;
  blockers: string[];
  warnings: string[];
  recommendedNextAction: string;
};

export type InventoryStockoutShadowObservationEventStoreResponse = {
  success: true;
  contract: InventoryStockoutShadowObservationEventStoreContract;
  summary: InventoryStockoutShadowObservationEventStoreSummary;
  gates: InventoryStockoutShadowObservationEventStoreGate[];
  observationEventSchema: Record<string, unknown>;
  noOpObservationEventFixture: Record<string, unknown>;
  observationPayload: Record<string, unknown>;
  mutationGuardPolicy: Record<string, unknown>;
  retentionPolicy: Record<string, unknown>;
  auditExport: Record<string, unknown>;
  latestObservationContract: Record<string, unknown> | null;
  recentObservationEvents: Array<Record<string, unknown>>;
  eventRecord?: Record<string, unknown> | null;
};

export type MlShadowObservationEventStoreCatalogSummary = {
  generatedAt: string;
  contract: InventoryStockoutShadowObservationEventStoreContract;
  currentShadowObservationEventStore: InventoryStockoutShadowObservationEventStoreSummary;
  lastShadowObservationEvents: Array<Record<string, unknown>>;
  lastShadowAdapterObservationLogContracts: Array<Record<string, unknown>>;
  recommendedNextAction: string;
};
