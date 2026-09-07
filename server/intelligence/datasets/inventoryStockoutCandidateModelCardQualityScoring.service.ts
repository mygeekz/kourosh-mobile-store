import {
  getMlCandidateEvaluationMetadataImportById,
  listMlCandidateEvaluationMetadataImports,
} from "../../db/domains/mlDatasets.db";
import type {
  InventoryStockoutCandidateModelCardQualityCheck,
  InventoryStockoutCandidateModelCardQualityScoringContract,
  InventoryStockoutCandidateModelCardQualityScoringResponse,
  MlCandidateModelCardQualityScoringCatalogSummary,
  OfflineCandidateModelCardQualityScoringRecommendation,
  OfflineCandidateModelCardQualityScoringStatus,
} from "./datasetTypes";

const CONTRACT_KEY = "inventory_stockout_offline_candidate_model_card_quality_scoring_v1" as const;
const CONTRACT_VERSION = "v1" as const;
const PHASE = "Phase 9F" as const;

const metadataReadOnlyModelCardQualityScoring = true as const;
const backendModelExecutionAllowed = false as const;
const runtimeInvocationAllowed = false as const;
const backendInferenceEndpointExposed = false as const;
const inferenceEndpointExposed = false as const;
const productionIntegrationAllowed = false as const;
const decisionAutomationAllowed = false as const;
const canChangeInventoryOrAccounting = false as const;
const canChangePricing = false as const;
const canChangeReports = false as const;
const canChangeLedger = false as const;
const canMutateBusinessRecords = false as const;
const artifactExecutionAllowed = false as const;
const artifactActivationAllowed = false as const;
const artifactBytesLoadingAllowedInBackend = false as const;
const rawTrainingCsvLoadingAllowedInBackend = false as const;

const FORBIDDEN_BEHAVIOR = [
  "No backend model execution.",
  "No inference endpoint exposure.",
  "No artifact activation.",
  "No model byte loading in backend.",
  "No raw training CSV loading in backend.",
  "No production integration.",
  "No automatic decision-making.",
  "No mutation of inventory, accounting, pricing, ledger, report, customer, partner, repair, sales, or invoice records.",
] as const;

const CHECKLIST_KEYS = [
  "model_purpose",
  "prediction_type",
  "dataset_source",
  "training_package_reference",
  "feature_list",
  "target_definition",
  "algorithm",
  "metrics",
  "known_limitations",
  "safety_restrictions",
  "not_approved_for_production",
  "not_approved_for_backend_execution",
  "not_approved_for_business_mutation",
] as const;

type RawImportRow = Record<string, unknown>;

type QualityInput = {
  row: RawImportRow;
  candidateManifest: Record<string, unknown>;
  modelCard: Record<string, unknown>;
  metrics: Record<string, unknown>;
  evaluationReport: Record<string, unknown>;
  safetyPolicy: Record<string, unknown>;
};

const safetyPolicy = {
  metadataReadOnlyModelCardQualityScoring,
  backendModelExecutionAllowed,
  runtimeInvocationAllowed,
  backendInferenceEndpointExposed,
  inferenceEndpointExposed,
  productionIntegrationAllowed,
  decisionAutomationAllowed,
  canChangeInventoryOrAccounting,
  canChangePricing,
  canChangeReports,
  canChangeLedger,
  canMutateBusinessRecords,
  artifactExecutionAllowed,
  artifactActivationAllowed,
  artifactBytesLoadingAllowedInBackend,
  rawTrainingCsvLoadingAllowedInBackend,
};

const asString = (value: unknown): string | null => {
  const text = String(value ?? "").trim();
  return text || null;
};

const asNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;

const parseJsonRecord = (value: unknown): Record<string, unknown> => {
  if (asRecord(value)) return value as Record<string, unknown>;
  if (typeof value !== "string" || !value.trim()) return {};
  try {
    const parsed = JSON.parse(value);
    return asRecord(parsed) || {};
  } catch (_err) {
    return { parseWarning: "metadata_json_parse_failed" };
  }
};

const getPath = (source: Record<string, unknown>, path: string): unknown =>
  path.split(".").reduce<unknown>((current, segment) => asRecord(current)?.[segment], source);

const hasValueAtPaths = (sources: Array<{ name: string; record: Record<string, unknown> }>, paths: string[]) => {
  for (const source of sources) {
    for (const path of paths) {
      const value = getPath(source.record, path);
      if (value === false) return { available: true, source: `${source.name}.${path}`, value };
      if (typeof value === "number" && Number.isFinite(value)) return { available: true, source: `${source.name}.${path}`, value };
      if (typeof value === "string" && value.trim()) return { available: true, source: `${source.name}.${path}`, value };
      if (Array.isArray(value) && value.length > 0) return { available: true, source: `${source.name}.${path}`, value };
      if (asRecord(value) && Object.keys(asRecord(value) || {}).length > 0) return { available: true, source: `${source.name}.${path}`, value };
    }
  }
  return { available: false, source: "missing", value: null };
};

const asStringArray = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => String(item ?? "").trim()).filter(Boolean);
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
};

const getBooleanAtPaths = (sources: Array<{ name: string; record: Record<string, unknown> }>, paths: string[]): { found: boolean; value: boolean | null; source: string } => {
  for (const source of sources) {
    for (const path of paths) {
      const value = getPath(source.record, path);
      if (typeof value === "boolean") return { found: true, value, source: `${source.name}.${path}` };
      if (typeof value === "string" && ["true", "false"].includes(value.toLowerCase())) {
        return { found: true, value: value.toLowerCase() === "true", source: `${source.name}.${path}` };
      }
    }
  }
  return { found: false, value: null, source: "missing" };
};

const textIncludesAny = (value: unknown, terms: string[]) => {
  const text = JSON.stringify(value ?? {}).toLowerCase();
  return terms.some((term) => text.includes(term.toLowerCase()));
};

const metricAvailable = (input: QualityInput) => {
  const rowMetrics = ["accuracy", "precisionScore", "recallScore", "f1", "rocAuc", "mae", "rmse", "r2"].some((key) => asNumber(input.row[key]) !== null);
  if (rowMetrics) return { available: true, source: "metadataImport.metricColumns" };
  return hasValueAtPaths([
    { name: "modelCard", record: input.modelCard },
    { name: "metrics", record: input.metrics },
    { name: "evaluationReport", record: input.evaluationReport },
  ], ["metrics", "metricsSummary", "classification", "regression", "metricValues", "summary.metrics"]);
};

const makeCheck = (
  key: string,
  label: string,
  weight: number,
  available: boolean,
  source: string,
  presentMessage: string,
  missingMessage: string,
  warning = false,
): InventoryStockoutCandidateModelCardQualityCheck => {
  const status = available ? warning ? "warning" : "pass" : "fail";
  return {
    key,
    label,
    status,
    weight,
    earned: available ? warning ? Math.round(weight * 0.5) : weight : 0,
    source,
    message: available ? presentMessage : missingMessage,
  };
};

const buildChecks = (input: QualityInput): InventoryStockoutCandidateModelCardQualityCheck[] => {
  const sources = [
    { name: "modelCard", record: input.modelCard },
    { name: "candidateManifest", record: input.candidateManifest },
    { name: "evaluationReport", record: input.evaluationReport },
    { name: "safetyPolicy", record: input.safetyPolicy },
  ];

  const purpose = hasValueAtPaths(sources, ["modelPurpose", "purpose", "intendedUse", "model_purpose"]);
  const predictionType = hasValueAtPaths([{ name: "metadataImport", record: input.row }, ...sources], ["predictionType", "prediction_type"]);
  const datasetSource = hasValueAtPaths(sources, ["datasetSource", "dataset.source", "sourceDataset", "trainingPackageReference.datasetSource", "dataSource"]);
  const trainingPackageReference = hasValueAtPaths(sources, ["trainingPackageReference", "training_package_reference", "trainingManifestHash", "trainingPackage.reference", "dataset.trainingPackageReference"]);
  const featureList = hasValueAtPaths(sources, ["featureList", "features", "featureContract.features", "feature_contract.features"]);
  const targetDefinition = hasValueAtPaths(sources, ["targetDefinition", "target", "target.column", "targetColumn", "target_definition"]);
  const algorithm = hasValueAtPaths(sources, ["algorithm", "modelAlgorithm", "modelFamily", "model_family", "training.algorithm"]);
  const metrics = metricAvailable(input);
  const limitations = hasValueAtPaths(sources, ["knownLimitations", "limitations", "known_limitations", "modelLimitations"]);
  const restrictions = hasValueAtPaths(sources, ["safetyRestrictions", "safetyPolicy", "safety_policy", "restrictions", "operationalPolicy"]);

  const backendExecution = getBooleanAtPaths(sources, ["backendModelExecutionAllowed", "safetyPolicy.backendModelExecutionAllowed", "backendExecutionAllowed"]);
  const productionIntegration = getBooleanAtPaths(sources, ["productionIntegrationAllowed", "safetyPolicy.productionIntegrationAllowed"]);
  const inventoryMutation = getBooleanAtPaths(sources, ["canChangeInventoryOrAccounting", "safetyPolicy.canChangeInventoryOrAccounting", "canMutateBusinessRecords", "safetyPolicy.canMutateBusinessRecords"]);

  const productionText = textIncludesAny([input.modelCard, input.candidateManifest], ["not approved for production", "not production ready", "productionIntegrationAllowed", "production integration"]);
  const executionText = textIncludesAny([input.modelCard, input.candidateManifest], ["not approved for backend execution", "backendModelExecutionAllowed", "backend execution", "not approved for backend"]);
  const mutationText = textIncludesAny([input.modelCard, input.candidateManifest], ["not approved for pricing", "not approved for accounting", "not approved for inventory mutation", "canChangeInventoryOrAccounting", "business mutation", "mutate business"]);

  const productionOk = productionIntegration.found ? productionIntegration.value === false : productionText;
  const executionOk = backendExecution.found ? backendExecution.value === false : executionText;
  const mutationOk = inventoryMutation.found ? inventoryMutation.value === false : mutationText;

  return [
    makeCheck("model_purpose", "Model purpose", 8, purpose.available, purpose.source, "Model purpose is described.", "model_card.json should describe the model purpose."),
    makeCheck("prediction_type", "Prediction type", 7, predictionType.available, predictionType.source, "Prediction type is available.", "predictionType is missing from imported metadata/model card."),
    makeCheck("dataset_source", "Dataset source", 7, datasetSource.available, datasetSource.source, "Dataset source is documented.", "Dataset source is missing from model_card.json."),
    makeCheck("training_package_reference", "Training package reference", 8, trainingPackageReference.available, trainingPackageReference.source, "Training package reference is documented.", "Training package reference or manifest hash is missing."),
    makeCheck("feature_list", "Feature list", 8, featureList.available, featureList.source, "Feature list or feature contract is present.", "Feature list/feature contract is missing."),
    makeCheck("target_definition", "Target definition", 8, targetDefinition.available, targetDefinition.source, "Target definition is present.", "Target definition is missing."),
    makeCheck("algorithm", "Algorithm", 7, algorithm.available, algorithm.source, "Algorithm/model family is documented.", "Algorithm/model family is missing."),
    makeCheck("metrics", "Metrics", 8, metrics.available, metrics.source, "Metrics are available for review.", "Metrics summary is missing."),
    makeCheck("known_limitations", "Known limitations", 8, limitations.available, limitations.source, "Known limitations are documented.", "Known limitations should be explicitly documented."),
    makeCheck("safety_restrictions", "Safety restrictions", 8, restrictions.available, restrictions.source, "Safety restrictions are documented.", "Safety restrictions are missing from model card/manifest metadata."),
    makeCheck("not_approved_for_production", "Not approved for production", 7, productionOk, productionIntegration.source, "Production non-approval is explicit.", "Model card should explicitly state not approved for production use."),
    makeCheck("not_approved_for_backend_execution", "Not approved for backend execution", 8, executionOk, backendExecution.source, "Backend execution non-approval is explicit.", "Model card should explicitly state not approved for backend execution."),
    makeCheck("not_approved_for_business_mutation", "Not approved for business mutation", 8, mutationOk, inventoryMutation.source, "Business mutation restrictions are explicit.", "Model card should state no pricing/accounting/inventory mutation approval."),
  ];
};

const chooseStatus = (row: RawImportRow | null, checks: InventoryStockoutCandidateModelCardQualityCheck[], score: number): OfflineCandidateModelCardQualityScoringStatus => {
  if (!row) return "candidate_not_found";
  const safetyFailures = checks.filter((check) => check.key.startsWith("not_approved") && check.status === "fail").length;
  if (safetyFailures > 0) return "model_card_quality_blocked";
  if (checks.some((check) => check.status !== "pass") || score < 85) return "model_card_quality_warning";
  return "model_card_quality_ready";
};

const chooseRecommendation = (status: OfflineCandidateModelCardQualityScoringStatus): OfflineCandidateModelCardQualityScoringRecommendation => {
  if (status === "candidate_not_found") return "import_candidate_evaluation_metadata_first";
  if (status === "model_card_quality_blocked") return "resolve_model_card_safety_blocks";
  if (status === "model_card_quality_warning") return "complete_missing_model_card_metadata";
  return "review_model_card_quality_metadata_only";
};

const previewModelCard = (modelCard: Record<string, unknown>, checks: InventoryStockoutCandidateModelCardQualityCheck[]) => ({
  purpose: modelCard.modelPurpose ?? modelCard.purpose ?? modelCard.intendedUse ?? null,
  predictionType: modelCard.predictionType ?? null,
  datasetSource: modelCard.datasetSource ?? modelCard.dataSource ?? null,
  algorithm: modelCard.algorithm ?? modelCard.modelFamily ?? null,
  knownLimitations: asStringArray(modelCard.knownLimitations ?? modelCard.limitations).slice(0, 6),
  safetyRestrictionsPresent: checks.some((check) => check.key === "safety_restrictions" && check.status !== "fail"),
});

export const buildInventoryStockoutCandidateModelCardQualityScoringContract = (): InventoryStockoutCandidateModelCardQualityScoringContract => ({
  contractKey: CONTRACT_KEY,
  contractVersion: CONTRACT_VERSION,
  generatedAt: new Date().toISOString(),
  phase: PHASE,
  purpose: "Score imported offline candidate model card completeness and safety metadata for Inventory Stockout candidate review visibility only.",
  scoringScope: "offline_candidate_model_card_quality_metadata_only",
  dataSource: "ml_candidate_evaluation_metadata_imports",
  checklistKeys: [...CHECKLIST_KEYS],
  forbiddenBehavior: [...FORBIDDEN_BEHAVIOR],
  operationalPolicy: safetyPolicy,
});

export const buildInventoryStockoutCandidateModelCardQualityScoring = async (
  input: { id?: unknown; metadataImportId?: unknown } = {},
): Promise<InventoryStockoutCandidateModelCardQualityScoringResponse> => {
  const id = asNumber(input.id ?? input.metadataImportId);
  const row = id ? await getMlCandidateEvaluationMetadataImportById(id) as RawImportRow | null : null;

  const candidateManifest = parseJsonRecord(row?.candidateManifestJson);
  const modelCard = parseJsonRecord(row?.modelCardJson);
  const metrics = parseJsonRecord(row?.metricsJson);
  const evaluationReport = parseJsonRecord(row?.evaluationReportJson);
  const importedSafetyPolicy = parseJsonRecord(row?.safetyPolicyJson);
  const checks = row ? buildChecks({ row, candidateManifest, modelCard, metrics, evaluationReport, safetyPolicy: importedSafetyPolicy }) : [];
  const totalWeight = checks.reduce((sum, check) => sum + check.weight, 0);
  const earnedWeight = checks.reduce((sum, check) => sum + check.earned, 0);
  const qualityScorePct = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;
  const status = chooseStatus(row, checks, qualityScorePct);
  const recommendation = chooseRecommendation(status);
  const missingRequiredSections = checks.filter((check) => check.status === "fail").map((check) => check.key);
  const warningSections = checks.filter((check) => check.status === "warning").map((check) => check.key);
  const generatedAt = new Date().toISOString();

  const summary = {
    generatedAt,
    phase: PHASE,
    status,
    recommendation,
    id: asNumber(row?.id),
    candidatePackageId: asString(row?.candidatePackageId ?? candidateManifest.candidatePackageId),
    modelKey: asString(row?.modelKey ?? candidateManifest.modelKey),
    modelVersion: asString(row?.modelVersion ?? candidateManifest.modelVersion),
    modelFamily: asString(row?.modelFamily ?? candidateManifest.modelFamily ?? modelCard.modelFamily),
    predictionType: asString(row?.predictionType ?? candidateManifest.predictionType ?? modelCard.predictionType),
    targetColumn: asString(row?.targetColumn ?? candidateManifest.targetColumn ?? modelCard.targetColumn),
    horizonDays: asNumber(row?.horizonDays ?? candidateManifest.horizonDays ?? modelCard.horizonDays),
    qualityScorePct,
    totalWeight,
    earnedWeight,
    passCount: checks.filter((check) => check.status === "pass").length,
    warningCount: checks.filter((check) => check.status === "warning").length,
    failCount: checks.filter((check) => check.status === "fail").length,
    requiredMetadataCount: CHECKLIST_KEYS.length,
    availableMetadataCount: checks.filter((check) => check.status !== "fail").length,
    safetyLocked: true,
    metadataReadOnlyModelCardQualityScoring,
    backendModelExecutionAllowed,
    runtimeInvocationAllowed,
    backendInferenceEndpointExposed,
    inferenceEndpointExposed,
    productionIntegrationAllowed,
    decisionAutomationAllowed,
    canChangeInventoryOrAccounting,
    canChangePricing,
    canChangeReports,
    canChangeLedger,
    canMutateBusinessRecords,
    artifactExecutionAllowed,
    artifactActivationAllowed,
    artifactBytesLoadingAllowedInBackend,
    rawTrainingCsvLoadingAllowedInBackend,
    recommendedNextAction: status === "candidate_not_found"
      ? "Import candidate evaluation metadata first through Phase 9B."
      : status === "model_card_quality_blocked"
      ? "Resolve missing safety restrictions in model_card.json before comparing this candidate further; this remains metadata-only."
      : status === "model_card_quality_warning"
      ? "Complete missing model card sections before using this candidate in offline comparison workflows."
      : "Review model card quality score as metadata only; no production execution, activation, inference, or business mutation is allowed.",
  };

  return {
    success: true,
    contract: buildInventoryStockoutCandidateModelCardQualityScoringContract(),
    summary,
    checks,
    missingRequiredSections,
    warningSections,
    modelCardPreview: previewModelCard(modelCard, checks),
    safetyPolicy,
  };
};

export const buildMlCandidateModelCardQualityScoringCatalogSummary = async (
  input: Record<string, unknown> = {},
): Promise<MlCandidateModelCardQualityScoringCatalogSummary> => {
  const imports = await listMlCandidateEvaluationMetadataImports(asNumber(input.limit) ?? 10) as RawImportRow[];
  const latest = imports[0] || null;
  const current = latest ? await buildInventoryStockoutCandidateModelCardQualityScoring({ id: latest.id }) : null;
  return {
    generatedAt: new Date().toISOString(),
    contract: buildInventoryStockoutCandidateModelCardQualityScoringContract(),
    currentCandidateModelCardQualityScoring: current?.summary ?? null,
    recentCandidateMetadataImports: imports.slice(0, 10),
    recommendedNextAction: current?.summary.recommendedNextAction || "Import candidate evaluation metadata first through Phase 9B, then review model card quality metadata only.",
  };
};

/* Phase 9F anchors: inventory_stockout_offline_candidate_model_card_quality_scoring_v1, metadataReadOnlyModelCardQualityScoring, model card quality scoring metadata-only, no backend model execution, no artifact activation. */
