import type { AdvisoryArtifactRegistry } from "./artifactRegistry";
import { getAdvisoryOnlyPolicy, type AdvisoryOnlyPolicy } from "./advisoryPolicy";
import { inventoryArtifactRegistry, runApprovedInventoryArtifact } from "./inventoryArtifactRuntime";
import type { InventoryArtifactRegistry } from "./inventoryArtifactRegistry";
import {
  buildInventoryMlAdvisory,
  type InventoryCurrentRow,
  type InventoryLabeledRow,
  type InventoryMlAdvisory,
} from "./inventoryStockoutModel";
import { advisoryArtifactRegistry, runApprovedPhoneArtifacts } from "./phoneArtifactRuntime";
import {
  buildPhoneMlAdvisory,
  unavailablePhoneMlAdvisory,
  type PhoneMlAdvisory,
  type PhonePricingModelInput,
  type PhonePricingTrainingRow,
} from "./phonePricingModel";

type AdvisoryInferenceOptions = {
  policy?: AdvisoryOnlyPolicy;
  phoneRegistry?: AdvisoryArtifactRegistry;
  inventoryRegistry?: InventoryArtifactRegistry;
};

const finitePositive = (value: unknown): boolean => Number.isFinite(Number(value)) && Number(value) > 0;

const unavailablePhone = (
  mode: "advisory-disabled" | "safety-abstention",
  reason: string,
  purchases: number,
  sales: number,
  related = 0,
): PhoneMlAdvisory => ({
  ...unavailablePhoneMlAdvisory(reason, purchases, sales, 0, related),
  executionMode: mode,
});

const passesPhoneQualityGate = (advisory: PhoneMlAdvisory): boolean => {
  if (advisory.status !== "available") return false;
  if (!finitePositive(advisory.purchasePrice) || !finitePositive(advisory.salePrice)) return false;
  if (Number(advisory.salePrice) < Number(advisory.purchasePrice)) return false;
  const metrics = [advisory.evidence.purchaseMetrics, advisory.evidence.saleMetrics].filter(Boolean);
  return metrics.length === 2 && metrics.every((metric) => (
    Number.isFinite(Number(metric?.mape))
      && Number(metric?.mape) <= 35
      && Number.isFinite(Number(metric?.r2))
      && Number(metric?.r2) >= -0.25
  ));
};

export const runPhoneAdvisoryInference = async (
  input: PhonePricingModelInput,
  purchaseRows: PhonePricingTrainingRow[],
  saleRows: PhonePricingTrainingRow[],
  asOf = new Date(),
  options: AdvisoryInferenceOptions = {},
): Promise<PhoneMlAdvisory> => {
  const policy = options.policy ?? getAdvisoryOnlyPolicy();
  if (!policy.advisoryInferenceEnabled) {
    return unavailablePhone(
      "advisory-disabled",
      "ML مشاور با kill switch غیرفعال است؛ برآورد معاملات مشابه بدون ML ادامه دارد.",
      purchaseRows.length,
      saleRows.length,
    );
  }

  try {
    const approved = await runApprovedPhoneArtifacts(
      input,
      purchaseRows,
      saleRows,
      asOf,
      options.phoneRegistry ?? advisoryArtifactRegistry(),
    );
    if (approved.status === "available") {
      return passesPhoneQualityGate(approved)
        ? approved
        : unavailablePhone("safety-abstention", "کیفیت artifact فعال از حد ایمنی مشاور پایین‌تر است؛ ML از پاسخ خودداری کرد.", purchaseRows.length, saleRows.length);
    }
  } catch {
    return unavailablePhone(
      "safety-abstention",
      "اعتبار artifact فعال قابل تأیید نبود؛ ML به‌صورت ایمن متوقف و برآورد مقایسه‌ای حفظ شد.",
      purchaseRows.length,
      saleRows.length,
    );
  }

  const trainedReadOnly = buildPhoneMlAdvisory(input, purchaseRows, saleRows, asOf);
  if (trainedReadOnly.status === "available" && !passesPhoneQualityGate(trainedReadOnly)) {
    return unavailablePhone(
      "safety-abstention",
      "کیفیت مدل آموزش‌یافته خواندنی از حد ایمنی مشاور پایین‌تر است؛ ML از پاسخ خودداری کرد.",
      purchaseRows.length,
      saleRows.length,
      trainedReadOnly.evidence.exactOrRelatedModelRows,
    );
  }
  return trainedReadOnly;
};

const unavailableInventory = (
  mode: "advisory-disabled" | "safety-abstention",
  reason: string,
): InventoryMlAdvisory => ({
  status: "abstained",
  mode,
  reason,
  metrics: null,
  items: [],
  safety: {
    advisoryOnly: true,
    humanReviewRequired: true,
    automaticOrderingEnabled: false,
    inventoryMutationEnabled: false,
  },
});

const passesInventoryQualityGate = (advisory: InventoryMlAdvisory): boolean => {
  if (advisory.status !== "available" || !advisory.metrics) return false;
  return advisory.metrics.sampleCount >= 60
    && advisory.metrics.accuracy >= 0.55
    && advisory.metrics.brier <= 0.35
    && advisory.items.every((item) => item.probability >= 0 && item.probability <= 1);
};

export const runInventoryAdvisoryInference = async (
  labeledRows: InventoryLabeledRow[],
  currentRows: InventoryCurrentRow[],
  asOf = new Date(),
  options: AdvisoryInferenceOptions = {},
): Promise<InventoryMlAdvisory> => {
  const policy = options.policy ?? getAdvisoryOnlyPolicy();
  if (!policy.advisoryInferenceEnabled) {
    return unavailableInventory("advisory-disabled", "ML مشاور موجودی با kill switch غیرفعال است.");
  }

  try {
    const approved = await runApprovedInventoryArtifact(
      currentRows,
      options.inventoryRegistry ?? inventoryArtifactRegistry(),
    );
    if (approved.status === "available") {
      return passesInventoryQualityGate(approved)
        ? approved
        : unavailableInventory("safety-abstention", "کیفیت artifact موجودی از حد ایمنی پایین‌تر است؛ پیشنهاد ML نمایش داده نشد.");
    }
  } catch {
    return unavailableInventory("safety-abstention", "اعتبار artifact موجودی قابل تأیید نبود؛ ML به‌صورت ایمن متوقف شد.");
  }

  const trainedReadOnly = buildInventoryMlAdvisory(labeledRows, currentRows, asOf);
  if (trainedReadOnly.status === "available" && !passesInventoryQualityGate(trainedReadOnly)) {
    return unavailableInventory("safety-abstention", "کیفیت مدل خواندنی موجودی از حد ایمنی پایین‌تر است؛ ML از پاسخ خودداری کرد.");
  }
  return trainedReadOnly;
};
