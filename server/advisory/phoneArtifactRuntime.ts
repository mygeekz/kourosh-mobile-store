import { join } from "node:path";
import { AdvisoryArtifactRegistry } from "./artifactRegistry";
import { detectMeanDrift, type DriftReport } from "./modelGovernance";
import { runPortableRegression, type PortableRegressionArtifact } from "./portableModel";
import {
  countRelatedPhoneModelRows,
  countRelatedPhoneSpecificationRows,
  PHONE_PRICING_FEATURES,
  phonePricingFeatureVector,
  roundPhonePrice,
  unavailablePhoneMlAdvisory,
  type PhoneMlAdvisory,
  type PhonePricingModelInput,
  type PhonePricingTrainingRow,
} from "./phonePricingModel";

export const advisoryArtifactDirectory = (): string =>
  process.env.KOUROSH_ADVISORY_ARTIFACT_DIR || join(process.cwd(), "data", "advisory-models");

export const advisoryArtifactRegistry = (): AdvisoryArtifactRegistry =>
  new AdvisoryArtifactRegistry(advisoryArtifactDirectory());

const predictPrice = (artifact: PortableRegressionArtifact, input: PhonePricingModelInput, asOf: Date): number =>
  roundPhonePrice(Math.exp(runPortableRegression(artifact, phonePricingFeatureVector(input, asOf))));

export const runApprovedPhoneArtifacts = async (
  input: PhonePricingModelInput,
  purchaseRows: PhonePricingTrainingRow[],
  saleRows: PhonePricingTrainingRow[],
  asOf = new Date(),
  registry = advisoryArtifactRegistry(),
): Promise<PhoneMlAdvisory> => {
  const purchase = await registry.active("phone-purchase-price");
  const sale = await registry.active("phone-sale-price");
  const timeToSell = await registry.active("phone-days-to-sell");
  const related = countRelatedPhoneModelRows(input, [...purchaseRows, ...saleRows]);
  if (!purchase || !sale) {
    const result = unavailablePhoneMlAdvisory(
      "مدل قیمت تأییدشده فعال نیست؛ برآورد مقایسه‌ای فروشگاه همچنان قابل استفاده است.",
      purchaseRows.length,
      saleRows.length,
      saleRows.filter((row) => row.purchaseDate && row.eventDate).length,
      related,
    );
    result.executionMode = "approved-artifact-unavailable";
    return result;
  }
  const compatible = [purchase, sale, ...(timeToSell ? [timeToSell] : [])]
    .every((artifact) => JSON.stringify(artifact.featureNames) === JSON.stringify([...PHONE_PRICING_FEATURES]));
  if (!compatible) {
    const result = unavailablePhoneMlAdvisory("قرارداد ویژگی artifact فعال با نسخه جدید حافظه و باتری سازگار نیست؛ بازآموزی و تأیید مجدد لازم است.", purchaseRows.length, saleRows.length, 0, related);
    result.executionMode = "approved-artifact";
    result.artifactIds = [purchase.artifactId, sale.artifactId];
    return result;
  }
  if (related < 4) {
    const result = unavailablePhoneMlAdvisory(
      "این مدل گوشی خارج از دامنه داده‌های تاریخی فروشگاه است؛ مدل از اعلام قیمت خودداری کرد.",
      purchaseRows.length,
      saleRows.length,
      saleRows.filter((row) => row.purchaseDate && row.eventDate).length,
      related,
    );
    result.executionMode = "approved-artifact";
    result.artifactIds = [purchase.artifactId, sale.artifactId];
    return result;
  }
  const relatedSpecifications = countRelatedPhoneSpecificationRows(input, [...purchaseRows, ...saleRows]);
  if (input.storage && relatedSpecifications < 2) {
    const result = unavailablePhoneMlAdvisory("برای این ترکیب مدل و حافظه داده تاریخی کافی وجود ندارد؛ مدل از تعمیم قیمت مدل‌های حافظه دیگر خودداری کرد.", purchaseRows.length, saleRows.length, 0, relatedSpecifications);
    result.executionMode = "approved-artifact";
    result.artifactIds = [purchase.artifactId, sale.artifactId];
    return result;
  }
  const purchasePrice = predictPrice(purchase, input, asOf);
  const salePrediction = predictPrice(sale, input, asOf);
  const salePrice = Math.max(purchasePrice, salePrediction);
  const residualRatio = Math.max(0.04, Math.min(0.25, sale.metrics.mape / 100 || 0.12));
  const saleRange = { min: roundPhonePrice(salePrice * (1 - residualRatio)), max: roundPhonePrice(salePrice * (1 + residualRatio)) };
  const estimatedDaysToSell = timeToSell
    ? Math.max(1, Math.min(365, Math.round(runPortableRegression(timeToSell, phonePricingFeatureVector(input, asOf)))))
    : null;
  const holdingRisk = estimatedDaysToSell === null ? 0.03 : Math.min(0.08, estimatedDaysToSell / 365 * 0.08);
  return {
    status: "available",
    executionMode: "approved-artifact",
    artifactIds: [purchase.artifactId, sale.artifactId, ...(timeToSell ? [timeToSell.artifactId] : [])],
    purchasePrice,
    salePrice,
    saleRange,
    estimatedDaysToSell,
    safeMaximumBuyPrice: roundPhonePrice(Math.min(purchasePrice, saleRange.min * (1 - 0.1 - holdingRisk))),
    confidence: related >= 12 && purchase.metrics.mape <= 15 && sale.metrics.mape <= 15 ? "high" : "medium",
    abstentionReason: null,
    evidence: {
      purchaseTrainingRows: purchase.metrics.sampleCount,
      saleTrainingRows: sale.metrics.sampleCount,
      timeToSellTrainingRows: timeToSell?.metrics.sampleCount ?? 0,
      exactOrRelatedModelRows: related,
      purchaseMetrics: purchase.metrics,
      saleMetrics: sale.metrics,
      timeToSellMetrics: timeToSell?.metrics ?? null,
    },
    safety: { advisoryOnly: true, automaticDecisioningEnabled: false, businessMutationEnabled: false, externalAiCallsEnabled: false },
  };
};

export const phoneArtifactDrift = async (
  rows: PhonePricingTrainingRow[],
  registry = advisoryArtifactRegistry(),
): Promise<Record<string, DriftReport | { status: "unavailable" }>> => {
  const output: Record<string, DriftReport | { status: "unavailable" }> = {};
  for (const task of ["phone-purchase-price", "phone-sale-price"] as const) {
    const artifact = await registry.active(task);
    output[task] = artifact
      ? detectMeanDrift({
          featureNames: artifact.featureNames,
          trainingMeans: artifact.means,
          trainingScales: artifact.scales,
          recentRows: rows.slice(0, 100).map((row) => phonePricingFeatureVector(row, row.eventDate || new Date())),
        })
      : { status: "unavailable" };
  }
  return output;
};
