import { useCallback, useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { apiFetch } from '../../../utils/apiFetch';
import type { NotificationMessage } from '../../../types';
import type { PredictiveEnginePayload, SmartInsightPayload } from '../types/smartInsightContracts';

type UseSmartInsightDataLoaderArgs = {
  fromDate: Date | null;
  toDate: Date | null;
  lastResetAt: string | null;
  toJ: (value?: Date | null) => string;
  setNotification: Dispatch<SetStateAction<NotificationMessage | null>>;
};

const readErrorMessage = (error: unknown) => error instanceof Error ? error.message : 'خطا در دریافت اطلاعات';

export default function useSmartInsightDataLoader({
  fromDate,
  toDate,
  lastResetAt,
  toJ,
  setNotification,
}: UseSmartInsightDataLoaderArgs) {
  const [payload, setPayload] = useState<SmartInsightPayload>({ insights: [] });
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (toJ(fromDate)) qs.set('fromDate', toJ(fromDate));
      if (toJ(toDate)) qs.set('toDate', toJ(toDate));
      if (lastResetAt) qs.set('resetAt', lastResetAt);

      const [res, predictiveRes, accuracyRes, readinessRes, dataQualityRes, datasetRes, benchmarkRes, trainingPackageRes, modelImportRes, modelApprovalRes, shadowEvaluationRes, shadowStabilityRes, offlinePilotRes, offlinePilotDecisionRes, offlinePilotReviewPackRes, offlinePilotKpiRes, offlinePilotCloseoutRes, productionReadinessDesignRes, productionReadinessBacklogRes, productionReleaseGateSimulationRes, productionImplementationCharterRes, productionWorkOrderRes, productionDryRunPlanRes, productionDryRunExecutionRes, productionDryRunCloseoutMemoRes, productionGovernanceSignoffRes, safeInferenceBoundaryRes, modelArtifactMetadataRes, candidateModelPackageRes, candidatePackageIntakeBinderRes, candidatePackageHumanReviewSignoffRes, shadowInferenceAdapterRes, disabledShadowAdapterShellRes, shadowRuntimeContractFixturesRes, disabledShadowRuntimeHarnessRes, shadowAdapterObservationLogRes, shadowObservationEventStoreRes, shadowObservationReviewDashboardRes, shadowObservationReviewDecisionLogRes, shadowObservationDecisionReviewExportBinderRes, shadowObservationBinderReviewSignoffGateRes, shadowObservationSignoffArchivePackRes, shadowObservationArchivePackRetentionPolicyRes, readOnlyShadowScoringRuntimeRes, shadowScoreReviewQueueRes, shadowScoreReviewSignoffWorkflowRes, shadowScoreSignoffEvidencePackRes, shadowScoreEvidenceRetentionReviewRes, shadowScoreRetentionReviewSignoffRes, shadowScoreSignoffArchiveBinderRes, shadowRuntimeAdapterRes, shadowRuntimeReplayRes, shadowRuntimeReplayReviewDashboardRes, shadowRuntimeReplayDeltaTrendEvidencePackRes, shadowRuntimeCandidateOutputFixturePackRes, shadowRuntimeCandidateOutputComparisonMatrixRes, shadowRuntimeCandidateContractDriftReviewPackRes, shadowRuntimeCandidateArtifactMetadataIntakeReadinessPackRes, shadowRuntimeArtifactMetadataCompatibilityMatrixRes, shadowRuntimeArtifactEnvelopeStorageReadinessDesignRes, shadowRuntimeArtifactEnvelopeRetentionPolicyReadinessPackRes, shadowRuntimeArtifactEnvelopeRetentionEvidenceExportReadinessPackRes, shadowRuntimeArtifactEnvelopeRetentionEvidenceExportReviewBinderDesignRes, shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityMatrixRes, shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageReviewPackRes, shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPackRes, shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationMatrixRes, shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationReviewRoutingReadinessPackRes, shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalancePackRes, shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceReviewNotesPackRes, shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceNotesTriageMatrixRes, shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceNotesTriageReviewRoutingSummaryPackRes, offlineArtifactIntakeRes] = await Promise.all([
        apiFetch(`/api/reports/smart-insights?${qs.toString()}`),
        apiFetch(`/api/brain/predictive?${qs.toString()}`).catch(() => null),
        apiFetch('/api/brain/predictive/accuracy').catch(() => null),
        apiFetch('/api/brain/model-readiness').catch(() => null),
        apiFetch('/api/brain/data-quality').catch(() => null),
        apiFetch('/api/brain/ml-datasets/summary').catch(() => null),
        apiFetch('/api/brain/ml-benchmarks/summary').catch(() => null),
        apiFetch('/api/brain/ml-training-packages/summary').catch(() => null),
        apiFetch('/api/brain/ml-model-imports/summary').catch(() => null),
        apiFetch('/api/brain/ml-model-approvals/summary').catch(() => null),
        apiFetch('/api/brain/ml-shadow-evaluations/summary').catch(() => null),
        apiFetch('/api/brain/ml-shadow-stability/summary').catch(() => null),
        apiFetch('/api/brain/ml-offline-pilots/summary').catch(() => null),
        apiFetch('/api/brain/ml-offline-pilot-decisions/summary').catch(() => null),
        apiFetch('/api/brain/ml-offline-pilot-review-packs/summary').catch(() => null),
        apiFetch('/api/brain/ml-offline-pilot-kpis/summary').catch(() => null),
        apiFetch('/api/brain/ml-offline-pilot-closeouts/summary').catch(() => null),
        apiFetch('/api/brain/ml-production-readiness-designs/summary').catch(() => null),
        apiFetch('/api/brain/ml-production-readiness-backlogs/summary').catch(() => null),
        apiFetch('/api/brain/ml-production-release-gate-simulations/summary').catch(() => null),
        apiFetch('/api/brain/ml-production-implementation-charters/summary').catch(() => null),
        apiFetch('/api/brain/ml-production-work-orders/summary').catch(() => null),
        apiFetch('/api/brain/ml-production-dry-run-plans/summary').catch(() => null),
        apiFetch('/api/brain/ml-production-dry-run-executions/summary').catch(() => null),
        apiFetch('/api/brain/ml-production-dry-run-closeout-memos/summary').catch(() => null),
        apiFetch('/api/brain/ml-production-governance-signoffs/summary').catch(() => null),
        apiFetch('/api/brain/ml-safe-inference-boundaries/summary').catch(() => null),
        apiFetch('/api/brain/ml-model-artifacts/summary').catch(() => null),
        apiFetch('/api/brain/ml-candidate-model-packages/summary').catch(() => null),
        apiFetch('/api/brain/ml-candidate-package-intake-binders/summary').catch(() => null),
        apiFetch('/api/brain/ml-candidate-package-human-review-signoffs/summary').catch(() => null),
        apiFetch('/api/brain/ml-shadow-inference-adapters/summary').catch(() => null),
        apiFetch('/api/brain/ml-disabled-shadow-adapter-shells/summary').catch(() => null),
        apiFetch('/api/brain/ml-shadow-runtime-contract-test-fixtures/summary').catch(() => null),
        apiFetch('/api/brain/ml-disabled-shadow-runtime-harnesses/summary').catch(() => null),
        apiFetch('/api/brain/ml-shadow-adapter-observation-log-contracts/summary').catch(() => null),
        apiFetch('/api/brain/ml-shadow-observation-events/summary').catch(() => null),
        apiFetch('/api/brain/ml-shadow-observation-review-dashboard/summary').catch(() => null),
        apiFetch('/api/brain/ml-shadow-observation-review-decisions/summary').catch(() => null),
        apiFetch('/api/brain/ml-shadow-observation-decision-review-export-binder/summary').catch(() => null),
        apiFetch('/api/brain/ml-shadow-observation-binder-review-signoffs/summary').catch(() => null),
        apiFetch('/api/brain/ml-shadow-observation-signoff-archive-packs/summary').catch(() => null),
        apiFetch('/api/brain/ml-shadow-observation-archive-pack-retention-policies/summary').catch(() => null),
        apiFetch('/api/brain/ml-read-only-shadow-scoring-runtimes/summary').catch(() => null),
        apiFetch('/api/brain/ml-shadow-score-review-queues/summary').catch(() => null),
        apiFetch('/api/brain/ml-shadow-score-review-signoff-workflows/summary').catch(() => null),
        apiFetch('/api/brain/ml-shadow-score-signoff-evidence-packs/summary').catch(() => null),
        apiFetch('/api/brain/ml-shadow-score-evidence-retention-reviews/summary').catch(() => null),
        apiFetch('/api/brain/ml-shadow-score-retention-review-signoffs/summary').catch(() => null),
        apiFetch('/api/brain/ml-shadow-score-signoff-archive-binders/summary').catch(() => null),
        apiFetch('/api/brain/ml-shadow-runtime/summary').catch(() => null),
        apiFetch('/api/brain/ml-shadow-runtime/replays/summary').catch(() => null),
        apiFetch('/api/brain/ml-shadow-runtime/replay-review-dashboard/summary').catch(() => null),
        apiFetch('/api/brain/ml-shadow-runtime/replay-delta-trend-evidence-pack/summary').catch(() => null),
        apiFetch('/api/brain/ml-shadow-runtime/candidate-output-fixture-pack/summary').catch(() => null),
        apiFetch('/api/brain/ml-shadow-runtime/candidate-output-comparison-matrix/summary').catch(() => null),
        apiFetch('/api/brain/ml-shadow-runtime/candidate-contract-drift-review-pack/summary').catch(() => null),
        apiFetch('/api/brain/ml-shadow-runtime/candidate-artifact-metadata-intake-readiness-pack/summary').catch(() => null),
        apiFetch('/api/brain/ml-shadow-runtime/artifact-metadata-compatibility-matrix/summary').catch(() => null),
        apiFetch('/api/brain/ml-shadow-runtime/artifact-envelope-storage-readiness-design/summary').catch(() => null),
        apiFetch('/api/brain/ml-shadow-runtime/artifact-envelope-retention-policy-readiness-pack/summary').catch(() => null),
        apiFetch('/api/brain/ml-shadow-runtime/artifact-envelope-retention-evidence-export-readiness-pack/summary').catch(() => null),
        apiFetch('/api/brain/ml-shadow-runtime/artifact-envelope-retention-evidence-export-review-binder-design/summary').catch(() => null),
        apiFetch('/api/brain/ml-shadow-runtime/artifact-envelope-review-binder-traceability-matrix/summary').catch(() => null),
        apiFetch('/api/brain/ml-shadow-runtime/artifact-envelope-review-binder-traceability-coverage-review-pack/summary').catch(() => null),
        apiFetch('/api/brain/ml-shadow-runtime/artifact-envelope-review-binder-traceability-coverage-gap-review-notes-pack/summary').catch(() => null),
        apiFetch('/api/brain/ml-shadow-runtime/artifact-envelope-review-binder-traceability-coverage-gap-review-notes-prioritization-matrix/summary').catch(() => null),
        apiFetch('/api/brain/ml-shadow-runtime/artifact-envelope-review-binder-traceability-coverage-gap-review-notes-prioritization-review-routing-readiness-pack/summary').catch(() => null),
        apiFetch('/api/brain/ml-shadow-runtime/artifact-envelope-review-binder-traceability-coverage-gap-review-notes-prioritization-review-routing-coverage-balance-pack/summary').catch(() => null),
        apiFetch('/api/brain/ml-shadow-runtime/artifact-envelope-review-binder-traceability-coverage-gap-review-notes-prioritization-review-routing-coverage-balance-review-notes-pack/summary').catch(() => null),
        apiFetch('/api/brain/ml-shadow-runtime/artifact-envelope-review-binder-traceability-coverage-gap-review-notes-prioritization-review-routing-coverage-balance-review-notes-triage-matrix/summary').catch(() => null),
        apiFetch('/api/brain/ml-shadow-runtime/artifact-envelope-review-binder-traceability-coverage-gap-review-notes-prioritization-review-routing-coverage-balance-review-notes-triage-review-routing-summary-pack/summary').catch(() => null),
        apiFetch('/api/brain/ml-artifacts/offline-intake/summary').catch(() => null),
      ]);

      const responseJson = await res.json();
      if (!res.ok || responseJson?.success === false) {
        throw new Error(responseJson?.message || 'خطا در دریافت دستیار هوشمند مدیریت');
      }

      let predictiveEngine: PredictiveEnginePayload | undefined;
      if (predictiveRes && predictiveRes.ok) {
        const predictiveJson = await predictiveRes.json().catch(() => null);
        predictiveEngine = predictiveJson?.data;
      }

      const accuracyJson = accuracyRes && accuracyRes.ok ? await accuracyRes.json().catch(() => null) : null;
      const readinessJson = readinessRes && readinessRes.ok ? await readinessRes.json().catch(() => null) : null;
      const dataQualityJson = dataQualityRes && dataQualityRes.ok ? await dataQualityRes.json().catch(() => null) : null;
      const datasetJson = datasetRes && datasetRes.ok ? await datasetRes.json().catch(() => null) : null;
      const benchmarkJson = benchmarkRes && benchmarkRes.ok ? await benchmarkRes.json().catch(() => null) : null;
      const trainingPackageJson = trainingPackageRes && trainingPackageRes.ok ? await trainingPackageRes.json().catch(() => null) : null;
      const modelImportJson = modelImportRes && modelImportRes.ok ? await modelImportRes.json().catch(() => null) : null;
      const modelApprovalJson = modelApprovalRes && modelApprovalRes.ok ? await modelApprovalRes.json().catch(() => null) : null;
      const shadowEvaluationJson = shadowEvaluationRes && shadowEvaluationRes.ok ? await shadowEvaluationRes.json().catch(() => null) : null;
      const shadowStabilityJson = shadowStabilityRes && shadowStabilityRes.ok ? await shadowStabilityRes.json().catch(() => null) : null;
      const offlinePilotJson = offlinePilotRes && offlinePilotRes.ok ? await offlinePilotRes.json().catch(() => null) : null;
      const offlinePilotDecisionJson = offlinePilotDecisionRes && offlinePilotDecisionRes.ok ? await offlinePilotDecisionRes.json().catch(() => null) : null;
      const offlinePilotReviewPackJson = offlinePilotReviewPackRes && offlinePilotReviewPackRes.ok ? await offlinePilotReviewPackRes.json().catch(() => null) : null;
      const offlinePilotKpiJson = offlinePilotKpiRes && offlinePilotKpiRes.ok ? await offlinePilotKpiRes.json().catch(() => null) : null;
      const offlinePilotCloseoutJson = offlinePilotCloseoutRes && offlinePilotCloseoutRes.ok ? await offlinePilotCloseoutRes.json().catch(() => null) : null;
      const productionReadinessDesignJson = productionReadinessDesignRes && productionReadinessDesignRes.ok ? await productionReadinessDesignRes.json().catch(() => null) : null;
      const productionReadinessBacklogJson = productionReadinessBacklogRes && productionReadinessBacklogRes.ok ? await productionReadinessBacklogRes.json().catch(() => null) : null;
      const productionReleaseGateSimulationJson = productionReleaseGateSimulationRes && productionReleaseGateSimulationRes.ok ? await productionReleaseGateSimulationRes.json().catch(() => null) : null;
      const productionImplementationCharterJson = productionImplementationCharterRes && productionImplementationCharterRes.ok ? await productionImplementationCharterRes.json().catch(() => null) : null;
      const productionWorkOrderJson = productionWorkOrderRes && productionWorkOrderRes.ok ? await productionWorkOrderRes.json().catch(() => null) : null;
      const productionDryRunPlanJson = productionDryRunPlanRes && productionDryRunPlanRes.ok ? await productionDryRunPlanRes.json().catch(() => null) : null;
      const productionDryRunExecutionJson = productionDryRunExecutionRes && productionDryRunExecutionRes.ok ? await productionDryRunExecutionRes.json().catch(() => null) : null;
      const productionDryRunCloseoutMemoJson = productionDryRunCloseoutMemoRes && productionDryRunCloseoutMemoRes.ok ? await productionDryRunCloseoutMemoRes.json().catch(() => null) : null;
      const productionGovernanceSignoffJson = productionGovernanceSignoffRes && productionGovernanceSignoffRes.ok ? await productionGovernanceSignoffRes.json().catch(() => null) : null;
      const safeInferenceBoundaryJson = safeInferenceBoundaryRes && safeInferenceBoundaryRes.ok ? await safeInferenceBoundaryRes.json().catch(() => null) : null;
      const modelArtifactMetadataJson = modelArtifactMetadataRes && modelArtifactMetadataRes.ok ? await modelArtifactMetadataRes.json().catch(() => null) : null;
      const candidateModelPackageJson = candidateModelPackageRes && candidateModelPackageRes.ok ? await candidateModelPackageRes.json().catch(() => null) : null;
      const candidatePackageIntakeBinderJson = candidatePackageIntakeBinderRes && candidatePackageIntakeBinderRes.ok ? await candidatePackageIntakeBinderRes.json().catch(() => null) : null;
      const candidatePackageHumanReviewSignoffJson = candidatePackageHumanReviewSignoffRes && candidatePackageHumanReviewSignoffRes.ok ? await candidatePackageHumanReviewSignoffRes.json().catch(() => null) : null;
      const candidatePackageHumanSignoffArchivePackRes = await apiFetch('/api/brain/ml-candidate-package-human-signoff-archive-packs/summary').catch(() => null);
      const candidatePackageHumanSignoffArchivePackJson = candidatePackageHumanSignoffArchivePackRes && candidatePackageHumanSignoffArchivePackRes.ok ? await candidatePackageHumanSignoffArchivePackRes.json().catch(() => null) : null;
      const candidatePackageArchiveRetentionReviewBinderRes = await apiFetch('/api/brain/ml-candidate-package-archive-retention-review-binders/summary').catch(() => null);
      const candidatePackageArchiveRetentionReviewBinderJson = candidatePackageArchiveRetentionReviewBinderRes && candidatePackageArchiveRetentionReviewBinderRes.ok ? await candidatePackageArchiveRetentionReviewBinderRes.json().catch(() => null) : null;
      const candidatePackageArchiveRetentionReviewSignoffRes = await apiFetch('/api/brain/ml-candidate-package-archive-retention-review-signoffs/summary').catch(() => null);
      const candidatePackageArchiveRetentionReviewSignoffJson = candidatePackageArchiveRetentionReviewSignoffRes && candidatePackageArchiveRetentionReviewSignoffRes.ok ? await candidatePackageArchiveRetentionReviewSignoffRes.json().catch(() => null) : null;
      const candidatePackageRetentionSignoffArchivePackRes = await apiFetch('/api/brain/ml-candidate-package-retention-signoff-archive-packs/summary').catch(() => null);
      const candidatePackageRetentionSignoffArchivePackJson = candidatePackageRetentionSignoffArchivePackRes && candidatePackageRetentionSignoffArchivePackRes.ok ? await candidatePackageRetentionSignoffArchivePackRes.json().catch(() => null) : null;
      const candidatePackageRetentionArchiveFinalAuditSnapshotRes = await apiFetch('/api/brain/ml-candidate-package-retention-archive-final-audit-snapshots/summary').catch(() => null);
      const candidatePackageRetentionArchiveFinalAuditSnapshotJson = candidatePackageRetentionArchiveFinalAuditSnapshotRes && candidatePackageRetentionArchiveFinalAuditSnapshotRes.ok ? await candidatePackageRetentionArchiveFinalAuditSnapshotRes.json().catch(() => null) : null;
      const candidatePackageFinalAuditSnapshotGovernanceSignoffRes = await apiFetch('/api/brain/ml-candidate-package-final-audit-snapshot-governance-signoffs/summary').catch(() => null);
      const candidatePackageFinalAuditSnapshotGovernanceSignoffJson = candidatePackageFinalAuditSnapshotGovernanceSignoffRes && candidatePackageFinalAuditSnapshotGovernanceSignoffRes.ok ? await candidatePackageFinalAuditSnapshotGovernanceSignoffRes.json().catch(() => null) : null;
      const candidatePackageGovernanceSignoffArchivePackRes = await apiFetch('/api/brain/ml-candidate-package-governance-signoff-archive-packs/summary').catch(() => null);
      const candidatePackageGovernanceSignoffArchivePackJson = candidatePackageGovernanceSignoffArchivePackRes && candidatePackageGovernanceSignoffArchivePackRes.ok ? await candidatePackageGovernanceSignoffArchivePackRes.json().catch(() => null) : null;
      const candidatePackageGovernanceSignoffArchiveFinalizationSummaryPackRes = await apiFetch('/api/brain/ml-candidate-package-governance-signoff-archive-finalization-summary-packs/summary').catch(() => null);
      const candidatePackageGovernanceSignoffArchiveFinalizationSummaryPackJson = candidatePackageGovernanceSignoffArchiveFinalizationSummaryPackRes && candidatePackageGovernanceSignoffArchiveFinalizationSummaryPackRes.ok ? await candidatePackageGovernanceSignoffArchiveFinalizationSummaryPackRes.json().catch(() => null) : null;
      const shadowInferenceAdapterJson = shadowInferenceAdapterRes && shadowInferenceAdapterRes.ok ? await shadowInferenceAdapterRes.json().catch(() => null) : null;
      const disabledShadowAdapterShellJson = disabledShadowAdapterShellRes && disabledShadowAdapterShellRes.ok ? await disabledShadowAdapterShellRes.json().catch(() => null) : null;
      const shadowRuntimeContractFixturesJson = shadowRuntimeContractFixturesRes && shadowRuntimeContractFixturesRes.ok ? await shadowRuntimeContractFixturesRes.json().catch(() => null) : null;
      const disabledShadowRuntimeHarnessJson = disabledShadowRuntimeHarnessRes && disabledShadowRuntimeHarnessRes.ok ? await disabledShadowRuntimeHarnessRes.json().catch(() => null) : null;
      const shadowAdapterObservationLogJson = shadowAdapterObservationLogRes && shadowAdapterObservationLogRes.ok ? await shadowAdapterObservationLogRes.json().catch(() => null) : null;
      const shadowObservationEventStoreJson = shadowObservationEventStoreRes && shadowObservationEventStoreRes.ok ? await shadowObservationEventStoreRes.json().catch(() => null) : null;
      const shadowObservationReviewDashboardJson = shadowObservationReviewDashboardRes && shadowObservationReviewDashboardRes.ok ? await shadowObservationReviewDashboardRes.json().catch(() => null) : null;
      const shadowObservationReviewDecisionLogJson = shadowObservationReviewDecisionLogRes && shadowObservationReviewDecisionLogRes.ok ? await shadowObservationReviewDecisionLogRes.json().catch(() => null) : null;
      const shadowObservationDecisionReviewExportBinderJson = shadowObservationDecisionReviewExportBinderRes && shadowObservationDecisionReviewExportBinderRes.ok ? await shadowObservationDecisionReviewExportBinderRes.json().catch(() => null) : null;
      const shadowObservationBinderReviewSignoffGateJson = shadowObservationBinderReviewSignoffGateRes && shadowObservationBinderReviewSignoffGateRes.ok ? await shadowObservationBinderReviewSignoffGateRes.json().catch(() => null) : null;
      const shadowObservationSignoffArchivePackJson = shadowObservationSignoffArchivePackRes && shadowObservationSignoffArchivePackRes.ok ? await shadowObservationSignoffArchivePackRes.json().catch(() => null) : null;
      const shadowObservationArchivePackRetentionPolicyJson = shadowObservationArchivePackRetentionPolicyRes && shadowObservationArchivePackRetentionPolicyRes.ok ? await shadowObservationArchivePackRetentionPolicyRes.json().catch(() => null) : null;
      const readOnlyShadowScoringRuntimeJson = readOnlyShadowScoringRuntimeRes && readOnlyShadowScoringRuntimeRes.ok ? await readOnlyShadowScoringRuntimeRes.json().catch(() => null) : null;
      const shadowScoreReviewQueueJson = shadowScoreReviewQueueRes && shadowScoreReviewQueueRes.ok ? await shadowScoreReviewQueueRes.json().catch(() => null) : null;
      const shadowScoreReviewSignoffWorkflowJson = shadowScoreReviewSignoffWorkflowRes && shadowScoreReviewSignoffWorkflowRes.ok ? await shadowScoreReviewSignoffWorkflowRes.json().catch(() => null) : null;
      const shadowScoreSignoffEvidencePackJson = shadowScoreSignoffEvidencePackRes && shadowScoreSignoffEvidencePackRes.ok ? await shadowScoreSignoffEvidencePackRes.json().catch(() => null) : null;
      const shadowScoreEvidenceRetentionReviewJson = shadowScoreEvidenceRetentionReviewRes && shadowScoreEvidenceRetentionReviewRes.ok ? await shadowScoreEvidenceRetentionReviewRes.json().catch(() => null) : null;
      const shadowScoreRetentionReviewSignoffJson = shadowScoreRetentionReviewSignoffRes && shadowScoreRetentionReviewSignoffRes.ok ? await shadowScoreRetentionReviewSignoffRes.json().catch(() => null) : null;
      const shadowScoreSignoffArchiveBinderJson = shadowScoreSignoffArchiveBinderRes && shadowScoreSignoffArchiveBinderRes.ok ? await shadowScoreSignoffArchiveBinderRes.json().catch(() => null) : null;
      const shadowRuntimeAdapterJson = shadowRuntimeAdapterRes && shadowRuntimeAdapterRes.ok ? await shadowRuntimeAdapterRes.json().catch(() => null) : null;
      const shadowRuntimeReplayJson = shadowRuntimeReplayRes && shadowRuntimeReplayRes.ok ? await shadowRuntimeReplayRes.json().catch(() => null) : null;
      const shadowRuntimeReplayReviewDashboardJson = shadowRuntimeReplayReviewDashboardRes && shadowRuntimeReplayReviewDashboardRes.ok ? await shadowRuntimeReplayReviewDashboardRes.json().catch(() => null) : null;
      const shadowRuntimeReplayDeltaTrendEvidencePackJson = shadowRuntimeReplayDeltaTrendEvidencePackRes && shadowRuntimeReplayDeltaTrendEvidencePackRes.ok ? await shadowRuntimeReplayDeltaTrendEvidencePackRes.json().catch(() => null) : null;
      const shadowRuntimeCandidateOutputFixturePackJson = shadowRuntimeCandidateOutputFixturePackRes && shadowRuntimeCandidateOutputFixturePackRes.ok ? await shadowRuntimeCandidateOutputFixturePackRes.json().catch(() => null) : null;
      const shadowRuntimeCandidateOutputComparisonMatrixJson = shadowRuntimeCandidateOutputComparisonMatrixRes && shadowRuntimeCandidateOutputComparisonMatrixRes.ok ? await shadowRuntimeCandidateOutputComparisonMatrixRes.json().catch(() => null) : null;
      const shadowRuntimeCandidateContractDriftReviewPackJson = shadowRuntimeCandidateContractDriftReviewPackRes && shadowRuntimeCandidateContractDriftReviewPackRes.ok ? await shadowRuntimeCandidateContractDriftReviewPackRes.json().catch(() => null) : null;
      const shadowRuntimeCandidateArtifactMetadataIntakeReadinessPackJson = shadowRuntimeCandidateArtifactMetadataIntakeReadinessPackRes && shadowRuntimeCandidateArtifactMetadataIntakeReadinessPackRes.ok ? await shadowRuntimeCandidateArtifactMetadataIntakeReadinessPackRes.json().catch(() => null) : null;
      const shadowRuntimeArtifactMetadataCompatibilityMatrixJson = shadowRuntimeArtifactMetadataCompatibilityMatrixRes && shadowRuntimeArtifactMetadataCompatibilityMatrixRes.ok ? await shadowRuntimeArtifactMetadataCompatibilityMatrixRes.json().catch(() => null) : null;
      const shadowRuntimeArtifactEnvelopeStorageReadinessDesignJson = shadowRuntimeArtifactEnvelopeStorageReadinessDesignRes && shadowRuntimeArtifactEnvelopeStorageReadinessDesignRes.ok ? await shadowRuntimeArtifactEnvelopeStorageReadinessDesignRes.json().catch(() => null) : null;
      const shadowRuntimeArtifactEnvelopeRetentionPolicyReadinessPackJson = shadowRuntimeArtifactEnvelopeRetentionPolicyReadinessPackRes && shadowRuntimeArtifactEnvelopeRetentionPolicyReadinessPackRes.ok ? await shadowRuntimeArtifactEnvelopeRetentionPolicyReadinessPackRes.json().catch(() => null) : null;
      const shadowRuntimeArtifactEnvelopeRetentionEvidenceExportReadinessPackJson = shadowRuntimeArtifactEnvelopeRetentionEvidenceExportReadinessPackRes && shadowRuntimeArtifactEnvelopeRetentionEvidenceExportReadinessPackRes.ok ? await shadowRuntimeArtifactEnvelopeRetentionEvidenceExportReadinessPackRes.json().catch(() => null) : null;
      const shadowRuntimeArtifactEnvelopeRetentionEvidenceExportReviewBinderDesignJson = shadowRuntimeArtifactEnvelopeRetentionEvidenceExportReviewBinderDesignRes && shadowRuntimeArtifactEnvelopeRetentionEvidenceExportReviewBinderDesignRes.ok ? await shadowRuntimeArtifactEnvelopeRetentionEvidenceExportReviewBinderDesignRes.json().catch(() => null) : null;
      const shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityMatrixJson = shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityMatrixRes && shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityMatrixRes.ok ? await shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityMatrixRes.json().catch(() => null) : null;
      const shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageReviewPackJson = shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageReviewPackRes && shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageReviewPackRes.ok ? await shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageReviewPackRes.json().catch(() => null) : null;
      const shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPackJson = shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPackRes && shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPackRes.ok ? await shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPackRes.json().catch(() => null) : null;
      const shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationMatrixJson = shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationMatrixRes && shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationMatrixRes.ok ? await shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationMatrixRes.json().catch(() => null) : null;
      const shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationReviewRoutingReadinessPackJson = shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationReviewRoutingReadinessPackRes && shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationReviewRoutingReadinessPackRes.ok ? await shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationReviewRoutingReadinessPackRes.json().catch(() => null) : null;
      const shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalancePackJson = shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalancePackRes && shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalancePackRes.ok ? await shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalancePackRes.json().catch(() => null) : null;
      const shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceReviewNotesPackJson = shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceReviewNotesPackRes && shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceReviewNotesPackRes.ok ? await shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceReviewNotesPackRes.json().catch(() => null) : null;
      const shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceNotesTriageMatrixJson = shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceNotesTriageMatrixRes && shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceNotesTriageMatrixRes.ok ? await shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceNotesTriageMatrixRes.json().catch(() => null) : null;
      const shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceNotesTriageReviewRoutingSummaryPackJson = shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceNotesTriageReviewRoutingSummaryPackRes && shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceNotesTriageReviewRoutingSummaryPackRes.ok ? await shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceNotesTriageReviewRoutingSummaryPackRes.json().catch(() => null) : null;
      const offlineArtifactIntakeJson = offlineArtifactIntakeRes && offlineArtifactIntakeRes.ok ? await offlineArtifactIntakeRes.json().catch(() => null) : null;
      const offlineArtifactValidationSummaryRes = await apiFetch('/api/brain/ml-offline-artifacts/validation/summary').catch(() => null);
      const offlineArtifactValidationSummaryJson = offlineArtifactValidationSummaryRes && offlineArtifactValidationSummaryRes.ok ? await offlineArtifactValidationSummaryRes.json().catch(() => null) : null;
      const offlineArtifactValidationReviewQueueSummaryRes = await apiFetch('/api/brain/ml-offline-artifacts/validation/review-queue/summary').catch(() => null);
      const offlineArtifactValidationReviewQueueSummaryJson = offlineArtifactValidationReviewQueueSummaryRes && offlineArtifactValidationReviewQueueSummaryRes.ok ? await offlineArtifactValidationReviewQueueSummaryRes.json().catch(() => null) : null;
      const offlineArtifactValidationReviewerAssignmentUxRes = await apiFetch('/api/brain/ml-offline-artifacts/validation/review-queue/assignment-ui?status=all&priority=all&assignedReviewerId=all&limit=5').catch(() => null);
      const offlineArtifactValidationReviewerAssignmentUxJson = offlineArtifactValidationReviewerAssignmentUxRes && offlineArtifactValidationReviewerAssignmentUxRes.ok ? await offlineArtifactValidationReviewerAssignmentUxRes.json().catch(() => null) : null;
      const offlineArtifactValidationEvidenceReviewPackSummaryRes = await apiFetch('/api/brain/ml-offline-artifacts/validation/evidence-review-packs/summary').catch(() => null);
      const offlineArtifactValidationEvidenceReviewPackSummaryJson = offlineArtifactValidationEvidenceReviewPackSummaryRes && offlineArtifactValidationEvidenceReviewPackSummaryRes.ok ? await offlineArtifactValidationEvidenceReviewPackSummaryRes.json().catch(() => null) : null;
      const offlineArtifactValidationEvidenceGapClosureMatrixSummaryRes = await apiFetch('/api/brain/ml-offline-artifacts/validation/evidence-gap-closure-matrix/summary').catch(() => null);
      const offlineArtifactValidationEvidenceGapClosureMatrixSummaryJson = offlineArtifactValidationEvidenceGapClosureMatrixSummaryRes && offlineArtifactValidationEvidenceGapClosureMatrixSummaryRes.ok ? await offlineArtifactValidationEvidenceGapClosureMatrixSummaryRes.json().catch(() => null) : null;
      const offlineArtifactValidationEvidenceClosureSignoffPackSummaryRes = await apiFetch('/api/brain/ml-offline-artifacts/validation/evidence-closure-signoff-packs/summary').catch(() => null);
      const offlineArtifactValidationEvidenceClosureSignoffPackSummaryJson = offlineArtifactValidationEvidenceClosureSignoffPackSummaryRes && offlineArtifactValidationEvidenceClosureSignoffPackSummaryRes.ok ? await offlineArtifactValidationEvidenceClosureSignoffPackSummaryRes.json().catch(() => null) : null;
      const offlineArtifactValidationFutureShadowEligibilityGateSummaryRes = await apiFetch('/api/brain/ml-offline-artifacts/validation/future-shadow-eligibility-gates/summary').catch(() => null);
      const offlineArtifactValidationFutureShadowEligibilityGateSummaryJson = offlineArtifactValidationFutureShadowEligibilityGateSummaryRes && offlineArtifactValidationFutureShadowEligibilityGateSummaryRes.ok ? await offlineArtifactValidationFutureShadowEligibilityGateSummaryRes.json().catch(() => null) : null;
      const offlineArtifactValidationFutureShadowEligibilityReviewBinderSummaryRes = await apiFetch('/api/brain/ml-offline-artifacts/validation/future-shadow-eligibility-review-binders/summary').catch(() => null);
      const offlineArtifactValidationFutureShadowEligibilityReviewBinderSummaryJson = offlineArtifactValidationFutureShadowEligibilityReviewBinderSummaryRes && offlineArtifactValidationFutureShadowEligibilityReviewBinderSummaryRes.ok ? await offlineArtifactValidationFutureShadowEligibilityReviewBinderSummaryRes.json().catch(() => null) : null;
      const offlineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackSummaryRes = await apiFetch('/api/brain/ml-offline-artifacts/validation/future-shadow-review-binder-routing-summary-packs/summary').catch(() => null);
      const offlineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackSummaryJson = offlineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackSummaryRes && offlineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackSummaryRes.ok ? await offlineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackSummaryRes.json().catch(() => null) : null;
      const offlineArtifactValidationFutureShadowBoardReviewPacketSummaryRes = await apiFetch('/api/brain/ml-offline-artifacts/validation/future-shadow-board-review-packets/summary').catch(() => null);
      const offlineArtifactValidationFutureShadowBoardReviewPacketSummaryJson = offlineArtifactValidationFutureShadowBoardReviewPacketSummaryRes && offlineArtifactValidationFutureShadowBoardReviewPacketSummaryRes.ok ? await offlineArtifactValidationFutureShadowBoardReviewPacketSummaryRes.json().catch(() => null) : null;
      const offlineArtifactValidationFutureShadowBoardReviewDecisionLogSummaryRes = await apiFetch('/api/brain/ml-offline-artifacts/validation/future-shadow-board-review-decision-logs/summary').catch(() => null);
      const offlineArtifactValidationFutureShadowBoardReviewDecisionLogSummaryJson = offlineArtifactValidationFutureShadowBoardReviewDecisionLogSummaryRes && offlineArtifactValidationFutureShadowBoardReviewDecisionLogSummaryRes.ok ? await offlineArtifactValidationFutureShadowBoardReviewDecisionLogSummaryRes.json().catch(() => null) : null;

      setPayload({
        insights: [],
        ...(responseJson?.data || {}),
        predictiveEngine,
        mlopsReadiness: {
          accuracy: accuracyJson?.data,
          modelReadiness: readinessJson?.data,
          dataQuality: dataQualityJson?.data,
          datasets: datasetJson?.data,
          benchmarks: benchmarkJson?.data,
          trainingPackages: trainingPackageJson?.data,
          modelImports: modelImportJson?.data,
          modelApprovals: modelApprovalJson?.data,
          shadowEvaluations: shadowEvaluationJson?.data,
          shadowStability: shadowStabilityJson?.data,
          offlinePilotReadiness: offlinePilotJson?.data,
          offlinePilotDecisions: offlinePilotDecisionJson?.data,
          offlinePilotReviewPacks: offlinePilotReviewPackJson?.data,
          offlinePilotKpis: offlinePilotKpiJson?.data,
          offlinePilotCloseouts: offlinePilotCloseoutJson?.data,
          productionReadinessDesigns: productionReadinessDesignJson?.data,
          productionReadinessBacklogs: productionReadinessBacklogJson?.data,
          productionReleaseGateSimulations: productionReleaseGateSimulationJson?.data,
          productionImplementationCharters: productionImplementationCharterJson?.data,
          productionWorkOrders: productionWorkOrderJson?.data,
          productionDryRunPlans: productionDryRunPlanJson?.data,
          productionDryRunExecutions: productionDryRunExecutionJson?.data,
          productionDryRunCloseoutMemos: productionDryRunCloseoutMemoJson?.data,
          productionGovernanceSignoffs: productionGovernanceSignoffJson?.data,
          safeInferenceBoundaries: safeInferenceBoundaryJson?.data,
          modelArtifactMetadata: modelArtifactMetadataJson?.data,
          candidateModelPackages: candidateModelPackageJson?.data,
          candidatePackageIntakeBinders: candidatePackageIntakeBinderJson?.data,
          candidatePackageHumanReviewSignoffs: candidatePackageHumanReviewSignoffJson?.data,
          candidatePackageHumanSignoffArchivePacks: candidatePackageHumanSignoffArchivePackJson?.data,
          candidatePackageArchiveRetentionReviewBinders: candidatePackageArchiveRetentionReviewBinderJson?.data,
          candidatePackageArchiveRetentionReviewSignoffs: candidatePackageArchiveRetentionReviewSignoffJson?.data,
          candidatePackageRetentionSignoffArchivePacks: candidatePackageRetentionSignoffArchivePackJson?.data,
          candidatePackageRetentionArchiveFinalAuditSnapshots: candidatePackageRetentionArchiveFinalAuditSnapshotJson?.data,
          candidatePackageFinalAuditSnapshotGovernanceSignoffs: candidatePackageFinalAuditSnapshotGovernanceSignoffJson?.data,
          candidatePackageGovernanceSignoffArchivePacks: candidatePackageGovernanceSignoffArchivePackJson?.data,
          candidatePackageGovernanceSignoffArchiveFinalizationSummaryPacks: candidatePackageGovernanceSignoffArchiveFinalizationSummaryPackJson?.data,
          shadowInferenceAdapters: shadowInferenceAdapterJson?.data,
          disabledShadowAdapterShells: disabledShadowAdapterShellJson?.data,
          shadowRuntimeContractFixtures: shadowRuntimeContractFixturesJson?.data,
          disabledShadowRuntimeHarnesses: disabledShadowRuntimeHarnessJson?.data,
          shadowAdapterObservationLogs: shadowAdapterObservationLogJson?.data,
          shadowObservationEvents: shadowObservationEventStoreJson?.data,
          shadowObservationReviewDashboard: shadowObservationReviewDashboardJson?.data,
          shadowObservationReviewDecisionLog: shadowObservationReviewDecisionLogJson?.data,
          shadowObservationDecisionReviewExportBinder: shadowObservationDecisionReviewExportBinderJson?.data,
          shadowObservationBinderReviewSignoffGate: shadowObservationBinderReviewSignoffGateJson?.data,
          shadowObservationSignoffArchivePack: shadowObservationSignoffArchivePackJson?.data,
          shadowObservationArchivePackRetentionPolicy: shadowObservationArchivePackRetentionPolicyJson?.data,
          readOnlyShadowScoringRuntime: readOnlyShadowScoringRuntimeJson?.data,
          shadowScoreReviewQueue: shadowScoreReviewQueueJson?.data,
          shadowScoreReviewSignoffWorkflow: shadowScoreReviewSignoffWorkflowJson?.data,
          shadowScoreSignoffEvidencePack: shadowScoreSignoffEvidencePackJson?.data,
          shadowScoreEvidenceRetentionReview: shadowScoreEvidenceRetentionReviewJson?.data,
          shadowScoreRetentionReviewSignoff: shadowScoreRetentionReviewSignoffJson?.data,
          shadowScoreSignoffArchiveBinder: shadowScoreSignoffArchiveBinderJson?.data,
          shadowRuntimeAdapter: shadowRuntimeAdapterJson?.data,
          shadowRuntimeReplay: shadowRuntimeReplayJson?.data,
          shadowRuntimeReplayReviewDashboard: shadowRuntimeReplayReviewDashboardJson?.data,
          shadowRuntimeReplayDeltaTrendEvidencePack: shadowRuntimeReplayDeltaTrendEvidencePackJson?.data,
          shadowRuntimeCandidateOutputFixturePack: shadowRuntimeCandidateOutputFixturePackJson?.data,
          shadowRuntimeCandidateOutputComparisonMatrix: shadowRuntimeCandidateOutputComparisonMatrixJson?.data,
          shadowRuntimeCandidateContractDriftReviewPack: shadowRuntimeCandidateContractDriftReviewPackJson?.data,
          shadowRuntimeCandidateArtifactMetadataIntakeReadinessPack: shadowRuntimeCandidateArtifactMetadataIntakeReadinessPackJson?.data,
          shadowRuntimeArtifactMetadataCompatibilityMatrix: shadowRuntimeArtifactMetadataCompatibilityMatrixJson?.data,
          shadowRuntimeArtifactEnvelopeStorageReadinessDesign: shadowRuntimeArtifactEnvelopeStorageReadinessDesignJson?.data,
          shadowRuntimeArtifactEnvelopeRetentionPolicyReadinessPack: shadowRuntimeArtifactEnvelopeRetentionPolicyReadinessPackJson?.data,
          shadowRuntimeArtifactEnvelopeRetentionEvidenceExportReadinessPack: shadowRuntimeArtifactEnvelopeRetentionEvidenceExportReadinessPackJson?.data,
          shadowRuntimeArtifactEnvelopeRetentionEvidenceExportReviewBinderDesign: shadowRuntimeArtifactEnvelopeRetentionEvidenceExportReviewBinderDesignJson?.data,
          shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityMatrix: shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityMatrixJson?.data,
          shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageReviewPack: shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageReviewPackJson?.data,
          shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPack: shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPackJson?.data,
          shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationMatrix: shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationMatrixJson?.data,
          shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationReviewRoutingReadinessPack: shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationReviewRoutingReadinessPackJson?.data,
          shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalancePack: shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalancePackJson?.data,
          shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceReviewNotesPack: shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceReviewNotesPackJson?.data,
          shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceNotesTriageMatrix: shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceNotesTriageMatrixJson?.data,
          shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceNotesTriageReviewRoutingSummaryPack: shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceNotesTriageReviewRoutingSummaryPackJson?.data,
          offlineArtifactIntake: { ...(offlineArtifactIntakeJson?.data || {}), validationSummary: offlineArtifactValidationSummaryJson?.data, validationReviewQueueSummary: offlineArtifactValidationReviewQueueSummaryJson?.data, validationReviewerAssignmentUx: offlineArtifactValidationReviewerAssignmentUxJson?.data, validationEvidenceReviewPackSummary: offlineArtifactValidationEvidenceReviewPackSummaryJson?.data, validationEvidenceGapClosureMatrixSummary: offlineArtifactValidationEvidenceGapClosureMatrixSummaryJson?.data, validationEvidenceClosureSignoffPackSummary: offlineArtifactValidationEvidenceClosureSignoffPackSummaryJson?.data, validationFutureShadowEligibilityGateSummary: offlineArtifactValidationFutureShadowEligibilityGateSummaryJson?.data, validationFutureShadowEligibilityReviewBinderSummary: offlineArtifactValidationFutureShadowEligibilityReviewBinderSummaryJson?.data, validationFutureShadowReviewBinderRoutingSummaryPackSummary: offlineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackSummaryJson?.data, validationFutureShadowBoardReviewPacketSummary: offlineArtifactValidationFutureShadowBoardReviewPacketSummaryJson?.data, validationFutureShadowBoardReviewDecisionLogSummary: offlineArtifactValidationFutureShadowBoardReviewDecisionLogSummaryJson?.data },
        },
      });
    } catch (error: unknown) {
      setNotification({ type: 'error', text: readErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  }, [fromDate, lastResetAt, setNotification, toDate, toJ]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => { void fetchData(); }, 260);
    return () => window.clearTimeout(timeoutId);
  }, [fetchData]);

  useEffect(() => {
    const reload = () => { void fetchData(); };
    window.addEventListener('kourosh:ai-features-updated', reload as EventListener);
    return () => window.removeEventListener('kourosh:ai-features-updated', reload as EventListener);
  }, [fetchData]);

  useEffect(() => {
    const reload = () => { void fetchData(); };
    window.addEventListener('kourosh:collection-action-recorded', reload as EventListener);
    window.addEventListener('storage', reload as EventListener);
    window.addEventListener('focus', reload as EventListener);
    return () => {
      window.removeEventListener('kourosh:collection-action-recorded', reload as EventListener);
      window.removeEventListener('storage', reload as EventListener);
      window.removeEventListener('focus', reload as EventListener);
    };
  }, [fetchData]);

  return {
    payload,
    setPayload,
    loading,
    fetchData,
  };
}
