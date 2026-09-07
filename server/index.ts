// ==========================================
// server/index.ts
// Backend entrypoint only. App/middleware/routes live in server/app.ts.
// ==========================================
import { createApp, registerShutdownHandlers, startKouroshServer } from "./app";

createApp();
startKouroshServer();
registerShutdownHandlers();

// Static guard anchors kept here because existing guard tests read server/index.ts directly.
// Runtime implementation remains in server/app.ts.
const REPORT_CURRENCY_CONTRACT = {
  currencyBase: 'TOMAN',
  displayCurrency: 'تومان',
  moneyDivisor: 1,
} as const;
const formatPriceForSms = (price: number): string => {
  const n = Number(price || 0);
  const toman = Number.isFinite(n)
    ? Math.round(n / REPORT_CURRENCY_CONTRACT.moneyDivisor)
    : 0;
  return toman.toLocaleString('fa-IR');
};
void formatPriceForSms;

/*
Customer Intelligence Engine
last_purchase AS
absoluteLastPurchaseAt
lastPurchaseAt: lastDateIso
lastPurchaseLabel
r.absoluteLastPurchaseAt || r.periodLastPurchaseAt
lastPurchaseMoment
moment(lastDateIso, 'YYYY-MM-DD', true)
SELECT MAX(transactionDate) AS lastPurchaseAt
AI Sales Agent

Financial Brain guard anchors:
/api/brain/financial
currentPurchasePrice
date(substr(transactionDate, 1, 10))
WHEN soi.itemType='phone' THEN COALESCE(NULLIF(soi.buyPrice,0), NULLIF(ph.currentPurchasePrice,0), ph.purchasePrice,0)
buildDiscountAwareInvoiceLines(invoiceAllLinesRaw as any[])
COALESCE(SUM(COALESCE(NULLIF(currentPurchasePrice, 0), purchasePrice, 0)), 0) AS total FROM phones

Predictive Engine guard anchors:
/api/brain/predictive
tomorrowSalesForecast
next7SalesForecast
daysToStockout
dueSoonAmount

Prediction Logs + Outcome Tracking guard anchors:
/api/brain/predictive/logs
/api/brain/predictive/outcomes
/api/brain/predictive/outcomes/summary
predictive_engine_runs
predictive_alert_logs
predictive_outcome_events
outcomeScore
/api/brain/predictive/accuracy
/api/brain/predictive/outcomes/evaluate
/api/brain/model-readiness
/api/brain/data-quality
predictive_feature_snapshots

Phase 2C ML Dataset Export guard anchors:
/api/brain/ml-datasets/summary
/api/brain/ml-datasets/inventory-stockout
/api/brain/ml-datasets/inventory-stockout/export.csv
ml_dataset_exports
inventory_stockout_baseline_v1
actual_stockout_within_horizon

Phase 2E External Training Package guard anchors:
/api/brain/ml-training-packages/summary
/api/brain/ml-datasets/inventory-stockout/training-package
/api/brain/ml-datasets/inventory-stockout/training-package/manifest.json
/api/brain/ml-datasets/inventory-stockout/training-package/train.csv
/api/brain/ml-datasets/inventory-stockout/training-package/test.csv
ml_training_package_exports
inventory_stockout_external_training_package_v1
No ML training, Python service, model registry, or inference runtime

Phase 8A Offline Inventory Stockout Candidate Model Package guard anchors:
/api/brain/ml-candidate-model-packages/summary
/api/brain/ml-datasets/inventory-stockout/candidate-model-package/contract
/api/brain/ml-datasets/inventory-stockout/candidate-model-package
/api/brain/ml-datasets/inventory-stockout/candidate-model-package/export
/api/brain/ml-datasets/inventory-stockout/candidate-model-package/manifest.json
ml_candidate_model_packages
inventory_stockout_offline_candidate_model_package_v1
Phase 8A candidate package is metadata-only: modelExecutionAllowed false, runtimeInvocationAllowed false, inferenceEndpointExposed false, artifactActivationAllowed false, artifactBytesLoadingAllowed false, productionIntegrationAllowed false, decisionAutomationAllowed false, canChangeInventoryOrAccounting false, canChangePricing false, canChangeReports false, canChangeLedger false.
No /infer, /execute, /activate, /deploy, or /production-score route is added. No artifact bytes, model runtime, production inference, or business mutation is enabled.


Phase 2F External Model Result Import Contract guard anchors:
/api/brain/ml-model-imports/summary
/api/brain/ml-datasets/inventory-stockout/model-result-import/contract
/api/brain/ml-datasets/inventory-stockout/model-result-import/validate
/api/brain/ml-datasets/inventory-stockout/model-result-import/import
ml_model_result_imports
inventory_stockout_external_model_result_import_v1
External model outputs are validated and audited only; no inference runtime or model registry


Phase 2H Approved Candidate Shadow Evaluation guard anchors:
/api/brain/ml-shadow-evaluations/summary
/api/brain/ml-datasets/inventory-stockout/shadow-evaluation/contract
/api/brain/ml-model-imports/:id/shadow-evaluation
ml_shadow_evaluations
inventory_stockout_approved_candidate_shadow_evaluation_v1
Approved candidates are evaluated in shadow/audit mode only; no production inference or business decision automation

Phase 2I Shadow Monitoring History + Stability Gate guard anchors:
/api/brain/ml-shadow-stability/summary
/api/brain/ml-datasets/inventory-stockout/shadow-stability/contract
/api/brain/ml-model-imports/:id/shadow-stability
ml_shadow_stability_checks
inventory_stockout_shadow_monitoring_stability_gate_v1
Stability gates can only allow offline pilot discussion; no production inference, decision automation, or accounting/inventory changes

Phase 2J Offline Pilot Readiness Gate + Rollback Policy guard anchors:
/api/brain/ml-offline-pilots/summary
/api/brain/ml-datasets/inventory-stockout/offline-pilot/contract
/api/brain/ml-model-imports/:id/offline-pilot-readiness
ml_offline_pilot_readiness_checks
inventory_stockout_offline_pilot_readiness_gate_v1
Offline pilot readiness can only record owner approval, rollback policy, and monitoring checklist; no production inference, decision automation, or inventory/accounting changes

Phase 2K Offline Pilot Decision Log + Human Review Board guard anchors:
/api/brain/ml-offline-pilot-decisions/summary
/api/brain/ml-datasets/inventory-stockout/offline-pilot-decision/contract
/api/brain/ml-model-imports/:id/offline-pilot-decision
/api/brain/ml-model-imports/:id/offline-pilot-decisions
ml_offline_pilot_decision_reviews
inventory_stockout_offline_pilot_human_review_board_v1
Human review board decisions are audit-only; no production inference, decision automation, or inventory/accounting changes

Phase 2L Offline Pilot Outcome Review Pack guard anchors:
/api/brain/ml-offline-pilot-review-packs/summary
/api/brain/ml-datasets/inventory-stockout/offline-pilot-review-pack/contract
/api/brain/ml-model-imports/:id/offline-pilot-review-pack
/api/brain/ml-model-imports/:id/offline-pilot-review-packs
ml_offline_pilot_review_packs
inventory_stockout_offline_pilot_outcome_review_pack_v1
Outcome review packs are presentation/audit-only; no production inference, decision automation, or inventory/accounting changes

Phase 2M Offline Pilot KPI Dashboard + Review Export guard anchors:
/api/brain/ml-offline-pilot-kpis/summary
/api/brain/ml-datasets/inventory-stockout/offline-pilot-kpi-dashboard/contract
/api/brain/ml-model-imports/:id/offline-pilot-kpi-dashboard
/api/brain/ml-model-imports/:id/offline-pilot-review-export.json
/api/brain/ml-model-imports/:id/offline-pilot-review-export.md
ml_offline_pilot_review_exports
inventory_stockout_offline_pilot_kpi_dashboard_v1
KPI dashboards and review exports are management/audit-only; no production inference, decision automation, or inventory/accounting changes

Phase 2N Offline Pilot Closeout + Production Readiness Preconditions guard anchors:
/api/brain/ml-offline-pilot-closeouts/summary
/api/brain/ml-datasets/inventory-stockout/offline-pilot-closeout/contract
/api/brain/ml-model-imports/:id/offline-pilot-closeout
/api/brain/ml-model-imports/:id/offline-pilot-closeouts
ml_offline_pilot_closeouts
inventory_stockout_offline_pilot_closeout_v1
Offline pilot closeout can only document production-readiness preconditions; no production inference, decision automation, or inventory/accounting changes


Phase 2O Production Readiness Design Spec + Safety Architecture guard anchors:
/api/brain/ml-production-readiness-designs/summary
/api/brain/ml-datasets/inventory-stockout/production-readiness-design/contract
/api/brain/ml-model-imports/:id/production-readiness-design
/api/brain/ml-model-imports/:id/production-readiness-designs
ml_production_readiness_design_specs
inventory_stockout_production_readiness_design_spec_v1
Production-readiness design specs are architecture/safety-planning only; no production inference, decision automation, or inventory/accounting changes
*/

/*
Phase 2P Production Readiness Implementation Backlog + Risk Register guard anchors:
/api/brain/ml-production-readiness-backlogs/summary
/api/brain/ml-datasets/inventory-stockout/production-readiness-backlog/contract
/api/brain/ml-model-imports/:id/production-readiness-backlog
/api/brain/ml-model-imports/:id/production-readiness-backlogs
ml_production_readiness_backlogs
inventory_stockout_production_readiness_backlog_risk_register_v1
Production-readiness backlogs and risk registers are planning artifacts only; no production inference, decision automation, or inventory/accounting changes
*/


/*
Phase 2Q Production Readiness Release Gate Simulation guard anchors:
/api/brain/ml-production-release-gate-simulations/summary
/api/brain/ml-datasets/inventory-stockout/production-release-gate-simulation/contract
/api/brain/ml-model-imports/:id/production-release-gate-simulation
/api/brain/ml-model-imports/:id/production-release-gate-simulations
ml_production_release_gate_simulations
inventory_stockout_production_release_gate_simulation_v1
Production release gate simulations are audit/planning artifacts only; no production inference, decision automation, or inventory/accounting changes
*/

/*
Phase 2R Production Implementation Readiness Charter guard anchors:
/api/brain/ml-production-implementation-charters/summary
/api/brain/ml-datasets/inventory-stockout/production-implementation-charter/contract
/api/brain/ml-model-imports/:id/production-implementation-charter
/api/brain/ml-model-imports/:id/production-implementation-charters
ml_production_implementation_readiness_charters
inventory_stockout_production_implementation_readiness_charter_v1
Production implementation readiness charters are planning/go-no-go artifacts only; no production inference, decision automation, or inventory/accounting changes
*/


/*
Phase 2S Production Implementation Work Order Pack guard anchors:
/api/brain/ml-production-work-orders/summary
/api/brain/ml-datasets/inventory-stockout/production-work-order/contract
/api/brain/ml-model-imports/:id/production-work-order
/api/brain/ml-model-imports/:id/production-work-orders
ml_production_implementation_work_order_packs
inventory_stockout_production_implementation_work_order_pack_v1
Production implementation work order packs are task/QA planning artifacts only; no production inference, decision automation, or inventory/accounting changes
*/

// Phase 2T Production Implementation Dry-Run Planner guard anchors:
// inventory_stockout_production_implementation_dry_run_planner_v1
// future_implementation_dry_run_planning_only
// productionIntegrationAllowed: false; inferenceRuntimeEnabled: false; decisionAutomationAllowed: false; canChangeInventoryOrAccounting: false

// Phase 2U Dry-Run Execution Log + Evidence Binder guard anchors:
// inventory_stockout_production_dry_run_execution_evidence_binder_v1
// dry_run_execution_log_and_evidence_binder_only
// productionIntegrationAllowed: false; inferenceRuntimeEnabled: false; decisionAutomationAllowed: false; canChangeInventoryOrAccounting: false

// Phase 2U Dry-Run Execution Log + Evidence Binder guard anchors:
// ml_production_dry_run_execution_logs
// inventory_stockout_production_dry_run_execution_evidence_binder_v1
// /api/brain/ml-production-dry-run-executions/summary
// /api/brain/ml-model-imports/:id/production-dry-run-execution

// Phase 2V Dry-Run Closeout Decision Memo guard anchors:
// ml_production_dry_run_closeout_memos
// inventory_stockout_production_dry_run_closeout_decision_memo_v1
// /api/brain/ml-production-dry-run-closeout-memos/summary
// /api/brain/ml-model-imports/:id/production-dry-run-closeout-memo


// Phase 2W Final Governance Signoff + Implementation Entry Decision guard anchors:
// ml_production_governance_signoff_decisions
// inventory_stockout_final_governance_signoff_implementation_entry_decision_v1
// /api/brain/ml-production-governance-signoffs/summary
// /api/brain/ml-model-imports/:id/production-governance-signoff
// final governance is Phase 2 closure only; productionIntegrationAllowed: false; inferenceRuntimeEnabled: false; decisionAutomationAllowed: false; canChangeInventoryOrAccounting: false


// Phase 3A Safe Inference Boundary Skeleton guard anchors:
// ml_safe_inference_boundary_skeletons
// inventory_stockout_safe_inference_boundary_skeleton_v1
// phase3a_disabled_safe_inference_boundary_skeleton_only
// /api/brain/ml-safe-inference-boundaries/summary
// /api/brain/ml-model-imports/:id/safe-inference-boundary
// feature flag ml.inventoryStockout.safeInferenceBoundary.enabled default false
// no scoring endpoint, no model runtime, no production integration; productionIntegrationAllowed: false; inferenceRuntimeEnabled: false; decisionAutomationAllowed: false; canChangeInventoryOrAccounting: false

// Phase 3B Model Artifact Metadata Registry guard anchors:
// ml_model_artifact_metadata_registry
// inventory_stockout_model_artifact_metadata_registry_v1
// phase3b_metadata_registry_only_no_runtime_load
// /api/brain/ml-model-artifacts/summary
// /api/brain/ml-model-imports/:id/model-artifact-metadata
// metadata only: no model binary stored, no runtime load, no inference endpoint; productionIntegrationAllowed: false; inferenceRuntimeEnabled: false; decisionAutomationAllowed: false; canChangeInventoryOrAccounting: false

// Phase 3C Shadow Inference Adapter Contract guard anchors:
// ml_shadow_inference_adapter_contracts
// inventory_stockout_shadow_inference_adapter_contract_v1
// phase3c_shadow_adapter_contract_only_no_model_execution
// /api/brain/ml-shadow-inference-adapters/summary
// /api/brain/ml-model-imports/:id/shadow-inference-adapter
// feature flag ml.inventoryStockout.shadowAdapter.enabled default false
// contract only: no model execution, no scoring endpoint, no production integration; productionIntegrationAllowed: false; inferenceRuntimeEnabled: false; decisionAutomationAllowed: false; canChangeInventoryOrAccounting: false

// Phase 3D Disabled Shadow Adapter Implementation Shell guard anchors:
// ml_disabled_shadow_adapter_shells
// inventory_stockout_disabled_shadow_adapter_shell_v1
// phase3d_disabled_shadow_adapter_shell_no_model_execution
// /api/brain/ml-disabled-shadow-adapter-shells/summary
// /api/brain/ml-model-imports/:id/disabled-shadow-adapter-shell
// feature flag ml.inventoryStockout.disabledShadowAdapterShell.enabled default false
// no-op shell only: no runtime invocation, no model execution, no scoring endpoint, no production integration; productionIntegrationAllowed: false; inferenceRuntimeEnabled: false; decisionAutomationAllowed: false; canChangeInventoryOrAccounting: false


// Phase 3E Shadow Runtime Contract Tests + No-Op Audit Fixtures guard anchors:
// ml_shadow_runtime_contract_test_fixtures
// inventory_stockout_shadow_runtime_contract_test_fixtures_v1
// phase3e_shadow_runtime_contract_tests_no_op_audit_fixtures
// /api/brain/ml-shadow-runtime-contract-test-fixtures/summary
// /api/brain/ml-model-imports/:id/shadow-runtime-contract-test-fixtures
// feature flag ml.inventoryStockout.shadowRuntimeContractTests.enabled default false
// no-op fixtures only: runtime invocation false, model execution false, no inference endpoint, baseline only source of truth; productionIntegrationAllowed: false; inferenceRuntimeEnabled: false; decisionAutomationAllowed: false; canChangeInventoryOrAccounting: false

// Phase 3F Disabled Shadow Runtime Harness guard anchors:
// ml_disabled_shadow_runtime_harnesses
// inventory_stockout_disabled_shadow_runtime_harness_v1
// phase3f_disabled_shadow_runtime_harness_no_op_validation_only
// /api/brain/ml-disabled-shadow-runtime-harnesses/summary
// /api/brain/ml-model-imports/:id/disabled-shadow-runtime-harness
// feature flag ml.inventoryStockout.disabledShadowRuntimeHarness.enabled default false
// no-op harness only: harness enabled false, runtime invocation false, model execution false, no inference endpoint, baseline only source of truth; productionIntegrationAllowed: false; inferenceRuntimeEnabled: false; decisionAutomationAllowed: false; canChangeInventoryOrAccounting: false

// Phase 3G Shadow Adapter Observation Log Contract guard anchors:
// ml_shadow_adapter_observation_log_contracts
// inventory_stockout_shadow_adapter_observation_log_contract_v1
// phase3g_shadow_adapter_observation_log_contract_no_op_audit_only
// /api/brain/ml-shadow-adapter-observation-log-contracts/summary
// /api/brain/ml-model-imports/:id/shadow-adapter-observation-log
// feature flag ml.inventoryStockout.shadowObservationLog.enabled default false
// observation log contract only: observation logging enabled false, runtime invocation false, model execution false, no inference endpoint, no-op observation only, baseline only source of truth; productionIntegrationAllowed: false; inferenceRuntimeEnabled: false; decisionAutomationAllowed: false; canChangeInventoryOrAccounting: false
// Phase 3H Shadow Observation Event Store guard anchors:
// ml_shadow_observation_events
// inventory_stockout_shadow_observation_event_store_v1
// phase3h_shadow_observation_event_store_audit_only
// /api/brain/ml-shadow-observation-events/summary
// /api/brain/ml-model-imports/:id/shadow-observation-events
// feature flag ml.inventoryStockout.shadowObservationEventStore.enabled default false
// audit-only event store: event store enabled false, runtime invocation false, model execution false, no inference endpoint, no model scores, no operational recommendations, baseline only source of truth; productionIntegrationAllowed: false; inferenceRuntimeEnabled: false; decisionAutomationAllowed: false; canChangeInventoryOrAccounting: false
// Phase 3I Shadow Observation Review/Audit Dashboard guard anchors:
// inventory_stockout_shadow_observation_review_dashboard_v1
// phase3i_shadow_observation_review_audit_dashboard
// /api/brain/ml-shadow-observation-review-dashboard/summary
// /api/brain/ml-model-imports/:id/shadow-observation-review-dashboard
// /api/brain/ml-model-imports/:id/shadow-observation-review-dashboard/export.csv
// feature flag ml.inventoryStockout.shadowObservationReviewDashboard.enabled default false
// review dashboard only: dashboard runtime enabled false, runtime invocation false, model execution false, no inference endpoint, no scoring, no operational recommendations, governance export only, baseline only source of truth; productionIntegrationAllowed: false; inferenceRuntimeEnabled: false; decisionAutomationAllowed: false; canChangeInventoryOrAccounting: false
// Phase 3J Shadow Observation Review Decision Log guard anchors:
// ml_shadow_observation_review_decision_logs
// inventory_stockout_shadow_observation_review_decision_log_v1
// phase3j_shadow_observation_review_decision_log_audit_only
// /api/brain/ml-shadow-observation-review-decisions/summary
// /api/brain/ml-model-imports/:id/shadow-observation-review-decisions
// /api/brain/ml-model-imports/:id/shadow-observation-review-decision-log/export.csv
// feature flag ml.inventoryStockout.shadowObservationReviewDecisionLog.enabled default false
// decision log only: human review only true, decision log enabled false, runtime invocation false, model execution false, no inference endpoint, no scoring, no operational recommendations, no customer/supplier messages, governance evidence only, baseline only source of truth; productionIntegrationAllowed: false; inferenceRuntimeEnabled: false; decisionAutomationAllowed: false; canChangeInventoryOrAccounting: false
// Phase 3K Shadow Observation Decision Review Export Binder guard anchors:
// inventory_stockout_shadow_observation_decision_review_export_binder_v1
// phase3k_shadow_observation_decision_review_export_binder_audit_only
// /api/brain/ml-shadow-observation-decision-review-export-binder/summary
// /api/brain/ml-model-imports/:id/shadow-observation-decision-review-export-binder
// /api/brain/ml-model-imports/:id/shadow-observation-decision-review-export-binder/export.json
// /api/brain/ml-model-imports/:id/shadow-observation-decision-review-export-binder/manifest.json
// /api/brain/ml-model-imports/:id/shadow-observation-decision-review-export-binder/export.csv
// feature flag ml.inventoryStockout.shadowObservationDecisionReviewExportBinder.enabled default false
// evidence binder only: binder runtime enabled false, runtime invocation false, model execution false, no inference endpoint, no scoring, no operational recommendations, no customer/supplier messages, governance export only, baseline only source of truth; productionIntegrationAllowed: false; inferenceRuntimeEnabled: false; decisionAutomationAllowed: false; canChangeInventoryOrAccounting: false

// Phase 3L Shadow Observation Binder Review Signoff Gate guard anchors:
// ml_shadow_observation_binder_review_signoffs
// inventory_stockout_shadow_observation_binder_review_signoff_gate_v1
// phase3l_shadow_observation_binder_review_signoff_gate_audit_only
// /api/brain/ml-shadow-observation-binder-review-signoffs/summary
// /api/brain/ml-model-imports/:id/shadow-observation-binder-review-signoff-gate
// /api/brain/ml-model-imports/:id/shadow-observation-binder-review-signoffs
// /api/brain/ml-model-imports/:id/shadow-observation-binder-review-signoff-gate/export.json
// /api/brain/ml-model-imports/:id/shadow-observation-binder-review-signoff-gate/export.csv
// feature flag ml.inventoryStockout.shadowObservationBinderReviewSignoffGate.enabled default false
// binder signoff gate only: signoff gate enabled false, human signoff only true, runtime invocation false, model execution false, no inference endpoint, no scoring, no operational recommendations, no customer/supplier messages, governance signoff only, not production approval, baseline only source of truth; productionIntegrationAllowed: false; inferenceRuntimeEnabled: false; decisionAutomationAllowed: false; canChangeInventoryOrAccounting: false

// Phase 3M Shadow Observation Signoff Archive Pack guard anchors:
// inventory_stockout_shadow_observation_signoff_archive_pack_v1
// phase3m_shadow_observation_signoff_archive_pack_read_only
// /api/brain/ml-shadow-observation-signoff-archive-packs/summary
// /api/brain/ml-datasets/inventory-stockout/shadow-observation-signoff-archive-pack/contract
// /api/brain/ml-model-imports/:id/shadow-observation-signoff-archive-pack
// /api/brain/ml-model-imports/:id/shadow-observation-signoff-archive-pack/export.json
// /api/brain/ml-model-imports/:id/shadow-observation-signoff-archive-pack/manifest.json
// /api/brain/ml-model-imports/:id/shadow-observation-signoff-archive-pack/export.csv
// feature flag ml.inventoryStockout.shadowObservationSignoffArchivePack.enabled default false
// signoff archive pack only: archive pack enabled false, read-only archive pack true, runtime invocation false, model execution false, no inference endpoint, no scoring, no operational recommendations, no customer/supplier messages, not production approval, baseline only source of truth; productionIntegrationAllowed: false; inferenceRuntimeEnabled: false; decisionAutomationAllowed: false; canChangeInventoryOrAccounting: false


// Phase 3N Shadow Archive Pack Retention Policy guard anchors:
// inventory_stockout_shadow_observation_archive_pack_retention_policy_v1
// phase3n_shadow_observation_archive_pack_retention_policy_read_only
// /api/brain/ml-shadow-observation-archive-pack-retention-policies/summary
// /api/brain/ml-datasets/inventory-stockout/shadow-observation-archive-pack-retention-policy/contract
// /api/brain/ml-model-imports/:id/shadow-observation-archive-pack-retention-policy
// /api/brain/ml-model-imports/:id/shadow-observation-archive-pack-retention-policy/export.json
// /api/brain/ml-model-imports/:id/shadow-observation-archive-pack-retention-policy/manifest.json
// /api/brain/ml-model-imports/:id/shadow-observation-archive-pack-retention-policy/export.csv
// feature flag ml.inventoryStockout.shadowObservationArchivePackRetentionPolicy.enabled default false
// retention policy only: retention policy enabled false, advisory retention policy true, no automatic deletion, no purge job, runtime invocation false, model execution false, no inference endpoint, no scoring, no operational recommendations, no customer/supplier messages, not deletion approval, baseline only source of truth; productionIntegrationAllowed: false; inferenceRuntimeEnabled: false; decisionAutomationAllowed: false; canChangeInventoryOrAccounting: false

// Phase 5A External Model Shadow Runtime Adapter guard anchors:
// ml_shadow_runtime_attempts
// Shadow Runtime Adapter
// External Model Shadow Score
// Read-only shadow evaluation
// /api/brain/ml-shadow-runtime/dry-run
// /api/brain/ml-shadow-runtime/attempts
// /api/brain/ml-shadow-runtime/summary
// runtimeInvocationAllowed false, modelExecutionAllowed false, inferenceEndpointExposed false, productionIntegrationAllowed false, decisionAutomationAllowed false, canChangeInventoryOrAccounting false, canChangePricing false, canChangeReports false, canChangeLedger false, canMutateBusinessRecords false
// disabled-by-default dry-run contract only; no real model execution, no production inference endpoint, no inventory/accounting/ledger/report/pricing mutation

/*
Phase 5B Shadow Runtime Replay guard anchors:
/api/brain/ml-shadow-runtime/replay/contract
/api/brain/ml-shadow-runtime/replay-historical-snapshots
/api/brain/ml-shadow-runtime/replays/summary
/api/brain/ml-shadow-runtime/replays
/api/brain/ml-shadow-runtime/replays/:id
/api/brain/ml-shadow-runtime/replays/:id/items
ml_shadow_runtime_replay_batches
ml_shadow_runtime_replay_items
external_model_shadow_runtime_historical_replay_v1
Historical snapshots replay through disabled dry-run adapter only; no production inference, model runtime activation, decision automation, or business mutation

*/

// Phase 6A Safe Offline Model Artifact Intake guard anchors:
// /api/brain/ml-artifacts/offline-intake
// /api/brain/ml-artifacts/offline-intake/summary
// /api/brain/ml-artifacts/offline-intake/:id
// /api/brain/ml-artifacts/offline-intake/:id/review-status
// ml_offline_artifacts
// sha256
// quarantine_status
// Offline Model Artifact Intake
// artifactExecutionAllowed false, artifactAutoActivationAllowed false, artifactQuarantineRequired true
// runtimeInvocationAllowed false, modelExecutionAllowed false, inferenceEndpointExposed false, productionIntegrationAllowed false, decisionAutomationAllowed false
// canChangeInventoryOrAccounting false, canChangePricing false, canChangeReports false, canChangeLedger false, canMutateBusinessRecords false
// Safe Offline Model Artifact Intake only validates, hashes, classifies, quarantines, records metadata, and supports human review.
// No artifact execution, model runtime loading, inference endpoint, production integration, decision automation, pricing/report/ledger/inventory/accounting mutation, auto approval, or auto activation is enabled.

/*

Phase 8B Offline Candidate Package Intake / Quarantine Readiness Binder guard anchors:
/api/brain/ml-candidate-package-intake-binders/summary
/api/brain/ml-datasets/inventory-stockout/candidate-model-package/intake-binder/contract
/api/brain/ml-datasets/inventory-stockout/candidate-model-package/intake-binder
/api/brain/ml-datasets/inventory-stockout/candidate-model-package/intake-binder/prepare
/api/brain/ml-datasets/inventory-stockout/candidate-model-package/intake-binder/manifest.json
ml_candidate_package_intake_binders
inventory_stockout_candidate_package_intake_quarantine_binder_v1
Phase 8B binder is metadata-only: modelExecutionAllowed false, runtimeInvocationAllowed false, inferenceEndpointExposed false, artifactActivationAllowed false, artifactBytesLoadingAllowed false, artifactIntakeCanLoadBytes false, artifactIntakeCanPersistBytes false, quarantineCanExecuteArtifact false, quarantineCanActivateArtifact false, productionIntegrationAllowed false, decisionAutomationAllowed false, canChangeInventoryOrAccounting false, canChangePricing false, canChangeReports false, canChangeLedger false.
No /infer, /execute, /activate, /deploy, or /production-score route is added by Phase 8B.
*/

/*
Phase 8C Offline Candidate Package Human Review / Signoff Gate guard anchors:
/api/brain/ml-candidate-package-human-review-signoffs/summary
/api/brain/ml-datasets/inventory-stockout/candidate-model-package/human-review-signoff/contract
/api/brain/ml-datasets/inventory-stockout/candidate-model-package/human-review-signoff
/api/brain/ml-datasets/inventory-stockout/candidate-model-package/human-review-signoff/prepare
/api/brain/ml-datasets/inventory-stockout/candidate-model-package/human-review-signoff/manifest.json
ml_candidate_package_human_review_signoffs
inventory_stockout_candidate_package_human_review_signoff_gate_v1
Phase 8C signoff is metadata-only and human-review required: humanReviewRequired true, signoffIsProductionApproval false, signoffCanLoadPackageBytes false, signoffCanPersistArtifactBytes false, signoffCanExecuteModel false, signoffCanInvokeRuntime false, signoffCanExposeInferenceEndpoint false, signoffCanActivateArtifact false, signoffCanDeployArtifact false, signoffCanProductionScore false, modelExecutionAllowed false, runtimeInvocationAllowed false, inferenceEndpointExposed false, artifactActivationAllowed false, artifactBytesLoadingAllowed false, productionIntegrationAllowed false, decisionAutomationAllowed false, canChangeInventoryOrAccounting false, canChangePricing false, canChangeReports false, canChangeLedger false.
No /infer, /execute, /activate, /deploy, or /production-score route is added by Phase 8C.
*/

/*
Phase 8D Offline Candidate Package Human Signoff Archive Pack guard anchors:
/api/brain/ml-candidate-package-human-signoff-archive-packs/summary
/api/brain/ml-datasets/inventory-stockout/candidate-model-package/human-signoff-archive-pack/contract
/api/brain/ml-datasets/inventory-stockout/candidate-model-package/human-signoff-archive-pack
/api/brain/ml-datasets/inventory-stockout/candidate-model-package/human-signoff-archive-pack/prepare
/api/brain/ml-datasets/inventory-stockout/candidate-model-package/human-signoff-archive-pack/manifest.json
ml_candidate_package_human_signoff_archive_packs
inventory_stockout_candidate_package_human_signoff_archive_pack_v1
Phase 8D archive pack is metadata-only: archivePackIsProductionApproval false, archivePackCanLoadPackageBytes false, archivePackCanPersistArtifactBytes false, archivePackCanExecuteModel false, archivePackCanInvokeRuntime false, archivePackCanExposeInferenceEndpoint false, archivePackCanActivateArtifact false, archivePackCanDeployArtifact false, archivePackCanProductionScore false, archivePackCanScheduleRetentionJobs false, archivePackCanDeleteOrPurge false, archivePackMetadataOnly true, retentionPolicyLocked true, modelExecutionAllowed false, runtimeInvocationAllowed false, inferenceEndpointExposed false, artifactActivationAllowed false, artifactBytesLoadingAllowed false, productionIntegrationAllowed false, decisionAutomationAllowed false, canChangeInventoryOrAccounting false, canChangePricing false, canChangeReports false, canChangeLedger false.
No /infer, /execute, /activate, /deploy, or /production-score route is added by Phase 8D.
*/


/*
Phase 8E Offline Candidate Package Archive Retention Review Binder guard anchors:
/api/brain/ml-candidate-package-archive-retention-review-binders/summary
/api/brain/ml-datasets/inventory-stockout/candidate-model-package/archive-retention-review-binder/contract
/api/brain/ml-datasets/inventory-stockout/candidate-model-package/archive-retention-review-binder
/api/brain/ml-datasets/inventory-stockout/candidate-model-package/archive-retention-review-binder/prepare
/api/brain/ml-datasets/inventory-stockout/candidate-model-package/archive-retention-review-binder/manifest.json
ml_candidate_package_archive_retention_review_binders
inventory_stockout_candidate_package_archive_retention_review_binder_v1
Phase 8E retention review binder is metadata-only: retentionReviewBinderIsProductionApproval false, retentionReviewBinderCanLoadArchiveBytes false, retentionReviewBinderCanLoadPackageBytes false, retentionReviewBinderCanPersistArtifactBytes false, retentionReviewBinderCanExecuteModel false, retentionReviewBinderCanInvokeRuntime false, retentionReviewBinderCanExposeInferenceEndpoint false, retentionReviewBinderCanActivateArtifact false, retentionReviewBinderCanDeployArtifact false, retentionReviewBinderCanProductionScore false, retentionReviewBinderCanScheduleRetentionJobs false, retentionReviewBinderCanDeleteOrPurge false, retentionReviewBinderMetadataOnly true, retentionPolicyLocked true, retentionExecutionAllowed false, automaticDeletionAllowed false, purgeJobAllowed false, modelExecutionAllowed false, runtimeInvocationAllowed false, inferenceEndpointExposed false, artifactActivationAllowed false, artifactBytesLoadingAllowed false, productionIntegrationAllowed false, decisionAutomationAllowed false, canChangeInventoryOrAccounting false, canChangePricing false, canChangeReports false, canChangeLedger false.
No /infer, /execute, /activate, /deploy, or /production-score route is added by Phase 8E.
*/

/*
Phase 8F Offline Candidate Package Archive Retention Review Signoff Gate guard anchors:
inventory_stockout_candidate_package_archive_retention_review_signoff_gate_v1
/api/brain/ml-candidate-package-archive-retention-review-signoffs/summary
/api/brain/ml-datasets/inventory-stockout/candidate-model-package/archive-retention-review-signoff/contract
/api/brain/ml-datasets/inventory-stockout/candidate-model-package/archive-retention-review-signoff
/api/brain/ml-datasets/inventory-stockout/candidate-model-package/archive-retention-review-signoff/prepare
/api/brain/ml-datasets/inventory-stockout/candidate-model-package/archive-retention-review-signoff/manifest.json
Phase 8F retention review signoff is metadata-only: retentionReviewHumanSignoffRequired true, retentionReviewSignoffIsProductionApproval false, retentionReviewSignoffCanLoadArchiveBytes false, retentionReviewSignoffCanLoadPackageBytes false, retentionReviewSignoffCanPersistArtifactBytes false, retentionReviewSignoffCanExecuteModel false, retentionReviewSignoffCanInvokeRuntime false, retentionReviewSignoffCanExposeInferenceEndpoint false, retentionReviewSignoffCanActivateArtifact false, retentionReviewSignoffCanDeployArtifact false, retentionReviewSignoffCanProductionScore false, retentionReviewSignoffCanScheduleRetentionJobs false, retentionReviewSignoffCanDeleteOrPurge false, retentionReviewSignoffMetadataOnly true, retentionPolicyLocked true, retentionExecutionAllowed false, automaticDeletionAllowed false, purgeJobAllowed false, modelExecutionAllowed false, runtimeInvocationAllowed false, inferenceEndpointExposed false, artifactActivationAllowed false, artifactBytesLoadingAllowed false, productionIntegrationAllowed false, decisionAutomationAllowed false, canChangeInventoryOrAccounting false, canChangePricing false, canChangeReports false, canChangeLedger false.
No /infer, /execute, /activate, /deploy, or /production-score route is added by Phase 8F.
Invoice cancel reason behavior remains untouched by Phase 8F.
*/


/*
Phase 8G Offline Candidate Package Retention Signoff Archive Pack guard anchors:
inventory_stockout_candidate_package_retention_signoff_archive_pack_v1
/api/brain/ml-candidate-package-retention-signoff-archive-packs/summary
/api/brain/ml-datasets/inventory-stockout/candidate-model-package/retention-signoff-archive-pack/contract
/api/brain/ml-datasets/inventory-stockout/candidate-model-package/retention-signoff-archive-pack
/api/brain/ml-datasets/inventory-stockout/candidate-model-package/retention-signoff-archive-pack/prepare
/api/brain/ml-datasets/inventory-stockout/candidate-model-package/retention-signoff-archive-pack/manifest.json
Phase 8G retention signoff archive pack is metadata-only: retentionSignoffArchivePackIsProductionApproval false, retentionSignoffArchivePackCanLoadArchiveBytes false, retentionSignoffArchivePackCanLoadPackageBytes false, retentionSignoffArchivePackCanPersistArtifactBytes false, retentionSignoffArchivePackCanExecuteModel false, retentionSignoffArchivePackCanInvokeRuntime false, retentionSignoffArchivePackCanExposeInferenceEndpoint false, retentionSignoffArchivePackCanActivateArtifact false, retentionSignoffArchivePackCanDeployArtifact false, retentionSignoffArchivePackCanProductionScore false, retentionSignoffArchivePackCanScheduleRetentionJobs false, retentionSignoffArchivePackCanDeleteOrPurge false, retentionSignoffArchivePackMetadataOnly true, retentionPolicyLocked true, retentionExecutionAllowed false, automaticDeletionAllowed false, purgeJobAllowed false, modelExecutionAllowed false, runtimeInvocationAllowed false, inferenceEndpointExposed false, artifactActivationAllowed false, artifactBytesLoadingAllowed false, productionIntegrationAllowed false, decisionAutomationAllowed false, canChangeInventoryOrAccounting false, canChangePricing false, canChangeReports false, canChangeLedger false.
No /infer, /execute, /activate, /deploy, or /production-score route is added by Phase 8G.
Invoice cancel reason behavior remains untouched by Phase 8G.
*/

/*
Phase 8H Offline Candidate Package Retention Archive Final Audit Snapshot guard anchors:
inventory_stockout_candidate_package_retention_archive_final_audit_snapshot_v1
/api/brain/ml-candidate-package-retention-archive-final-audit-snapshots/summary
/api/brain/ml-datasets/inventory-stockout/candidate-model-package/retention-archive-final-audit-snapshot/contract
/api/brain/ml-datasets/inventory-stockout/candidate-model-package/retention-archive-final-audit-snapshot
/api/brain/ml-datasets/inventory-stockout/candidate-model-package/retention-archive-final-audit-snapshot/prepare
/api/brain/ml-datasets/inventory-stockout/candidate-model-package/retention-archive-final-audit-snapshot/manifest.json
Phase 8H retention archive final audit snapshot is metadata-only: retentionArchiveFinalAuditSnapshotIsProductionApproval false, retentionArchiveFinalAuditSnapshotCanLoadArchiveBytes false, retentionArchiveFinalAuditSnapshotCanLoadPackageBytes false, retentionArchiveFinalAuditSnapshotCanPersistArtifactBytes false, retentionArchiveFinalAuditSnapshotCanExecuteModel false, retentionArchiveFinalAuditSnapshotCanInvokeRuntime false, retentionArchiveFinalAuditSnapshotCanExposeInferenceEndpoint false, retentionArchiveFinalAuditSnapshotCanActivateArtifact false, retentionArchiveFinalAuditSnapshotCanDeployArtifact false, retentionArchiveFinalAuditSnapshotCanProductionScore false, retentionArchiveFinalAuditSnapshotCanScheduleRetentionJobs false, retentionArchiveFinalAuditSnapshotCanDeleteOrPurge false, retentionArchiveFinalAuditSnapshotMetadataOnly true, retentionPolicyLocked true, finalAuditSnapshotImmutable true, retentionExecutionAllowed false, automaticDeletionAllowed false, purgeJobAllowed false, modelExecutionAllowed false, runtimeInvocationAllowed false, inferenceEndpointExposed false, artifactActivationAllowed false, artifactBytesLoadingAllowed false, productionIntegrationAllowed false, decisionAutomationAllowed false, canChangeInventoryOrAccounting false, canChangePricing false, canChangeReports false, canChangeLedger false.
No /infer, /execute, /activate, /deploy, or /production-score route is added by Phase 8H.
Invoice cancel reason behavior remains untouched by Phase 8H.
*/


/*
Phase 8I Offline Candidate Package Final Audit Snapshot Governance Signoff Gate guard anchors:
inventory_stockout_candidate_package_final_audit_snapshot_governance_signoff_gate_v1
/api/brain/ml-candidate-package-final-audit-snapshot-governance-signoffs/summary
/api/brain/ml-datasets/inventory-stockout/candidate-model-package/final-audit-snapshot-governance-signoff/contract
/api/brain/ml-datasets/inventory-stockout/candidate-model-package/final-audit-snapshot-governance-signoff
/api/brain/ml-datasets/inventory-stockout/candidate-model-package/final-audit-snapshot-governance-signoff/prepare
/api/brain/ml-datasets/inventory-stockout/candidate-model-package/final-audit-snapshot-governance-signoff/manifest.json
Phase 8I final audit snapshot governance signoff is metadata-only: finalAuditSnapshotGovernanceHumanSignoffRequired true, finalAuditSnapshotGovernanceSignoffIsProductionApproval false, finalAuditSnapshotGovernanceSignoffCanLoadSnapshotBytes false, finalAuditSnapshotGovernanceSignoffCanLoadArchiveBytes false, finalAuditSnapshotGovernanceSignoffCanLoadPackageBytes false, finalAuditSnapshotGovernanceSignoffCanPersistArtifactBytes false, finalAuditSnapshotGovernanceSignoffCanExecuteModel false, finalAuditSnapshotGovernanceSignoffCanInvokeRuntime false, finalAuditSnapshotGovernanceSignoffCanExposeInferenceEndpoint false, finalAuditSnapshotGovernanceSignoffCanActivateArtifact false, finalAuditSnapshotGovernanceSignoffCanDeployArtifact false, finalAuditSnapshotGovernanceSignoffCanProductionScore false, finalAuditSnapshotGovernanceSignoffCanScheduleRetentionJobs false, finalAuditSnapshotGovernanceSignoffCanDeleteOrPurge false, finalAuditSnapshotGovernanceSignoffMetadataOnly true, retentionPolicyLocked true, finalAuditSnapshotImmutable true, governanceSignoffIsFinalAuditClosure true, retentionExecutionAllowed false, automaticDeletionAllowed false, purgeJobAllowed false, modelExecutionAllowed false, runtimeInvocationAllowed false, inferenceEndpointExposed false, artifactActivationAllowed false, artifactBytesLoadingAllowed false, productionIntegrationAllowed false, decisionAutomationAllowed false, canChangeInventoryOrAccounting false, canChangePricing false, canChangeReports false, canChangeLedger false.
No /infer, /execute, /activate, /deploy, or /production-score route is added by Phase 8I.
Invoice cancel reason behavior remains untouched by Phase 8I.
*/


/*
Phase 8J Offline Candidate Package Governance Signoff Archive Pack guard anchors:
inventory_stockout_candidate_package_governance_signoff_archive_pack_v1
/api/brain/ml-candidate-package-governance-signoff-archive-packs/summary
/api/brain/ml-datasets/inventory-stockout/candidate-model-package/governance-signoff-archive-pack/contract
/api/brain/ml-datasets/inventory-stockout/candidate-model-package/governance-signoff-archive-pack
/api/brain/ml-datasets/inventory-stockout/candidate-model-package/governance-signoff-archive-pack/prepare
/api/brain/ml-datasets/inventory-stockout/candidate-model-package/governance-signoff-archive-pack/manifest.json
Phase 8J governance signoff archive pack is metadata-only: governanceSignoffArchivePackIsProductionApproval false, governanceSignoffArchivePackCanLoadSignoffBytes false, governanceSignoffArchivePackCanLoadSnapshotBytes false, governanceSignoffArchivePackCanLoadArchiveBytes false, governanceSignoffArchivePackCanLoadPackageBytes false, governanceSignoffArchivePackCanPersistArtifactBytes false, governanceSignoffArchivePackCanExecuteModel false, governanceSignoffArchivePackCanInvokeRuntime false, governanceSignoffArchivePackCanExposeInferenceEndpoint false, governanceSignoffArchivePackCanActivateArtifact false, governanceSignoffArchivePackCanDeployArtifact false, governanceSignoffArchivePackCanProductionScore false, governanceSignoffArchivePackCanScheduleRetentionJobs false, governanceSignoffArchivePackCanDeleteOrPurge false, governanceSignoffArchivePackMetadataOnly true, retentionPolicyLocked true, finalAuditSnapshotImmutable true, governanceSignoffIsFinalAuditClosure true, retentionExecutionAllowed false, automaticDeletionAllowed false, purgeJobAllowed false, modelExecutionAllowed false, runtimeInvocationAllowed false, inferenceEndpointExposed false, artifactActivationAllowed false, artifactBytesLoadingAllowed false, productionIntegrationAllowed false, decisionAutomationAllowed false, canChangeInventoryOrAccounting false, canChangePricing false, canChangeReports false, canChangeLedger false.
No /infer, /execute, /activate, /deploy, or /production-score route is added by Phase 8J.
Invoice cancel reason behavior remains untouched by Phase 8J.
*/


/*
Phase 8K Offline Candidate Package Governance Signoff Archive Finalization Summary Pack guard anchors:
inventory_stockout_candidate_package_governance_signoff_archive_finalization_summary_pack_v1
/api/brain/ml-candidate-package-governance-signoff-archive-finalization-summary-packs/summary
/api/brain/ml-datasets/inventory-stockout/candidate-model-package/governance-signoff-archive-finalization-summary-pack/contract
/api/brain/ml-datasets/inventory-stockout/candidate-model-package/governance-signoff-archive-finalization-summary-pack
/api/brain/ml-datasets/inventory-stockout/candidate-model-package/governance-signoff-archive-finalization-summary-pack/prepare
/api/brain/ml-datasets/inventory-stockout/candidate-model-package/governance-signoff-archive-finalization-summary-pack/manifest.json
Phase 8K governance signoff archive finalization summary pack is metadata-only: governanceSignoffArchiveFinalizationSummaryPackIsProductionApproval false, governanceSignoffArchiveFinalizationSummaryPackCanLoadSignoffBytes false, governanceSignoffArchiveFinalizationSummaryPackCanLoadSnapshotBytes false, governanceSignoffArchiveFinalizationSummaryPackCanLoadArchiveBytes false, governanceSignoffArchiveFinalizationSummaryPackCanLoadPackageBytes false, governanceSignoffArchiveFinalizationSummaryPackCanPersistArtifactBytes false, governanceSignoffArchiveFinalizationSummaryPackCanExecuteModel false, governanceSignoffArchiveFinalizationSummaryPackCanInvokeRuntime false, governanceSignoffArchiveFinalizationSummaryPackCanExposeInferenceEndpoint false, governanceSignoffArchiveFinalizationSummaryPackCanActivateArtifact false, governanceSignoffArchiveFinalizationSummaryPackCanDeployArtifact false, governanceSignoffArchiveFinalizationSummaryPackCanProductionScore false, governanceSignoffArchiveFinalizationSummaryPackCanScheduleRetentionJobs false, governanceSignoffArchiveFinalizationSummaryPackCanDeleteOrPurge false, governanceSignoffArchiveFinalizationSummaryPackMetadataOnly true, retentionPolicyLocked true, finalAuditSnapshotImmutable true, governanceSignoffArchiveFinalizationIsClosureSummary true, retentionExecutionAllowed false, automaticDeletionAllowed false, purgeJobAllowed false, modelExecutionAllowed false, runtimeInvocationAllowed false, inferenceEndpointExposed false, artifactActivationAllowed false, artifactBytesLoadingAllowed false, productionIntegrationAllowed false, decisionAutomationAllowed false, canChangeInventoryOrAccounting false, canChangePricing false, canChangeReports false, canChangeLedger false.
No /infer, /execute, /activate, /deploy, or /production-score route is added by Phase 8K.
Invoice cancel reason behavior remains untouched by Phase 8K.
*/
