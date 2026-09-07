import {
  runPortableRegression,
  trainPortableRegression,
  type PortableModelMetrics,
  type RegressionExample,
} from "./portableModel";
import { isFactoryNewPhoneCondition, normalizePhoneBatteryHealth } from "../utils/phoneSpecification";

export type PhonePricingModelInput = {
  model: string;
  color?: string | null;
  storage?: string | null;
  ram?: string | null;
  condition?: string | null;
  batteryHealth?: number | null;
};

export type PhonePricingTrainingRow = PhonePricingModelInput & {
  id: number;
  price: number;
  eventDate?: string | null;
  purchaseDate?: string | null;
};

export type PhoneMlAdvisory = {
  status: "available" | "abstained";
  executionMode: "portable-trained-regression" | "approved-artifact" | "approved-artifact-unavailable" | "advisory-disabled" | "safety-abstention";
  artifactIds?: string[];
  purchasePrice: number | null;
  salePrice: number | null;
  saleRange: { min: number; max: number } | null;
  estimatedDaysToSell: number | null;
  safeMaximumBuyPrice: number | null;
  confidence: "high" | "medium" | "insufficient";
  abstentionReason: string | null;
  evidence: {
    purchaseTrainingRows: number;
    saleTrainingRows: number;
    timeToSellTrainingRows: number;
    exactOrRelatedModelRows: number;
    purchaseMetrics: PortableModelMetrics | null;
    saleMetrics: PortableModelMetrics | null;
    timeToSellMetrics: PortableModelMetrics | null;
  };
  safety: {
    advisoryOnly: true;
    automaticDecisioningEnabled: false;
    businessMutationEnabled: false;
    externalAiCallsEnabled: false;
  };
};

const normalize = (value: unknown): string => String(value ?? "")
  .replace(/[يى]/g, "ی").replace(/ك/g, "ک")
  .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
  .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
  .toLocaleLowerCase("en-US").replace(/[^a-z0-9\u0600-\u06ff]+/g, " ").trim();

const numericText = (value: unknown): number => {
  const match = normalize(value).match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 0;
};

export const phoneStorageCapacityGb = (value: unknown): number => {
  const key = normalize(value);
  const amount = numericText(key);
  return /(?:^| )tb(?: |$)|ترابایت/.test(key) ? amount * 1024 : amount;
};

const hash = (value: string): number => {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
};

const conditionScore = (value: unknown): number => {
  const key = normalize(value);
  if (isFactoryNewPhoneCondition(value)) return 1.05;
  if (/در حد نو|like new/.test(key)) return 1;
  if (/کارکرده|used/.test(key)) return 0.88;
  if (/عالی|excellent/.test(key)) return 0.97;
  if (/تمیز|good/.test(key)) return 0.93;
  if (/معمولی|fair/.test(key)) return 0.86;
  if (/تعمیر|damaged/.test(key)) return 0.65;
  return 0.88;
};

export const PHONE_PRICING_FEATURES = [
  "model_hash_0", "model_hash_1", "model_hash_2", "model_hash_3",
  "model_hash_4", "model_hash_5", "model_hash_6", "model_hash_7",
  "storage_gb_v2", "ram_gb", "battery_health_v2", "condition_score_v2",
  "color_hash_sin", "color_hash_cos", "observation_year", "observation_month",
] as const;

export const phonePricingFeatureVector = (input: PhonePricingModelInput, observedAt: string | Date): number[] => {
  const buckets = Array(8).fill(0);
  const tokens = normalize(input.model).split(" ").filter(Boolean);
  for (const token of tokens) buckets[hash(token) % buckets.length] += 1;
  const date = new Date(observedAt);
  const validDate = Number.isNaN(date.getTime()) ? new Date("2025-01-01T00:00:00Z") : date;
  const colorAngle = (hash(normalize(input.color)) % 360) * Math.PI / 180;
  return [
    ...buckets,
    phoneStorageCapacityGb(input.storage),
    numericText(input.ram),
    normalizePhoneBatteryHealth(input.condition, input.batteryHealth) ?? 90,
    conditionScore(input.condition),
    Math.sin(colorAngle),
    Math.cos(colorAngle),
    validDate.getUTCFullYear(),
    validDate.getUTCMonth() + 1,
  ];
};

export const roundPhonePrice = (value: number): number => {
  const step = value >= 10_000_000 ? 100_000 : value >= 1_000_000 ? 10_000 : 1_000;
  return Math.max(step, Math.round(value / step) * step);
};

export const countRelatedPhoneModelRows = (input: PhonePricingModelInput, rows: PhonePricingTrainingRow[]): number => {
  const target = new Set(normalize(input.model).split(" ").filter((token) => token.length > 1));
  return rows.filter((row) => {
    const candidate = normalize(row.model).split(" ");
    const overlap = [...target].filter((token) => candidate.includes(token)).length;
    return target.size > 0 && overlap / target.size >= 0.5;
  }).length;
};

export const countRelatedPhoneSpecificationRows = (input: PhonePricingModelInput, rows: PhonePricingTrainingRow[]): number => {
  const related = rows.filter((row) => normalize(row.model) === normalize(input.model));
  if (!normalize(input.storage)) return related.length;
  const targetStorage = phoneStorageCapacityGb(input.storage);
  return related.filter((row) => targetStorage > 0 && phoneStorageCapacityGb(row.storage) === targetStorage).length;
};

export const phonePricingExamples = (rows: PhonePricingTrainingRow[], logTarget = true): RegressionExample[] => rows
  .filter((row) => Number.isFinite(Number(row.price)) && Number(row.price) > 0 && Boolean(row.eventDate))
  .map((row) => ({
    x: phonePricingFeatureVector(row, row.eventDate || ""),
    y: logTarget ? Math.log(Number(row.price)) : Number(row.price),
    observedAt: String(row.eventDate),
    entityKey: String(row.id),
  }));

const daysBetween = (start: unknown, end: unknown): number | null => {
  const left = new Date(String(start || ""));
  const right = new Date(String(end || ""));
  if (Number.isNaN(left.getTime()) || Number.isNaN(right.getTime())) return null;
  const days = Math.round((right.getTime() - left.getTime()) / 86_400_000);
  return days >= 0 && days <= 3650 ? days : null;
};

export const unavailablePhoneMlAdvisory = (reason: string, purchases: number, sales: number, timeRows: number, related: number): PhoneMlAdvisory => ({
  status: "abstained", executionMode: "portable-trained-regression", purchasePrice: null, salePrice: null,
  saleRange: null, estimatedDaysToSell: null, safeMaximumBuyPrice: null, confidence: "insufficient",
  abstentionReason: reason,
  evidence: { purchaseTrainingRows: purchases, saleTrainingRows: sales, timeToSellTrainingRows: timeRows, exactOrRelatedModelRows: related, purchaseMetrics: null, saleMetrics: null, timeToSellMetrics: null },
  safety: { advisoryOnly: true, automaticDecisioningEnabled: false, businessMutationEnabled: false, externalAiCallsEnabled: false },
});

/** Trains deterministic real regressors on store history, then returns advisory output only. */
export const buildPhoneMlAdvisory = (input: PhonePricingModelInput, purchaseRows: PhonePricingTrainingRow[], saleRows: PhonePricingTrainingRow[], asOf = new Date()): PhoneMlAdvisory => {
  const purchaseExamples = phonePricingExamples(purchaseRows);
  const saleExamples = phonePricingExamples(saleRows);
  const timeRows = saleRows.map((row) => ({ row, days: daysBetween(row.purchaseDate, row.eventDate) })).filter((item): item is { row: PhonePricingTrainingRow; days: number } => item.days !== null);
  const timeExamples: RegressionExample[] = timeRows.map(({ row, days }) => ({ x: phonePricingFeatureVector(row, row.eventDate || ""), y: days, observedAt: String(row.eventDate), entityKey: String(row.id) }));
  const related = countRelatedPhoneModelRows(input, [...purchaseRows, ...saleRows]);
  if (purchaseExamples.length < 24 || saleExamples.length < 24) return unavailablePhoneMlAdvisory("برای آموزش پایدار مدل قیمت، حداقل ۲۴ خرید و ۲۴ فروش معتبر لازم است.", purchaseExamples.length, saleExamples.length, timeExamples.length, related);
  if (related < 4) return unavailablePhoneMlAdvisory("این مدل گوشی خارج از دامنه داده‌های تاریخی فروشگاه است؛ مدل از اعلام قیمت خودداری کرد.", purchaseExamples.length, saleExamples.length, timeExamples.length, related);
  const trainedAt = asOf.toISOString();
  const purchaseArtifact = trainPortableRegression({ artifactId: `phone-purchase-${trainedAt}`, task: "phone-purchase-price", featureNames: [...PHONE_PRICING_FEATURES], examples: purchaseExamples, trainedAt });
  const saleArtifact = trainPortableRegression({ artifactId: `phone-sale-${trainedAt}`, task: "phone-sale-price", featureNames: [...PHONE_PRICING_FEATURES], examples: saleExamples, trainedAt });
  const currentFeatures = phonePricingFeatureVector(input, asOf);
  const purchasePrice = roundPhonePrice(Math.exp(runPortableRegression(purchaseArtifact, currentFeatures)));
  const salePrice = roundPhonePrice(Math.exp(runPortableRegression(saleArtifact, currentFeatures)));
  const residualRatio = Math.max(0.04, Math.min(0.25, saleArtifact.metrics.mape / 100 || 0.12));
  const normalizedSale = Math.max(salePrice, purchasePrice);
  const saleRange = { min: roundPhonePrice(normalizedSale * (1 - residualRatio)), max: roundPhonePrice(normalizedSale * (1 + residualRatio)) };
  let timeArtifact = null;
  let estimatedDaysToSell: number | null = null;
  if (timeExamples.length >= 24) {
    timeArtifact = trainPortableRegression({ artifactId: `phone-days-${trainedAt}`, task: "phone-days-to-sell", featureNames: [...PHONE_PRICING_FEATURES], examples: timeExamples, trainedAt });
    estimatedDaysToSell = Math.max(1, Math.min(365, Math.round(runPortableRegression(timeArtifact, currentFeatures))));
  }
  const holdingRisk = estimatedDaysToSell === null ? 0.03 : Math.min(0.08, estimatedDaysToSell / 365 * 0.08);
  const safeMaximumBuyPrice = roundPhonePrice(Math.min(purchasePrice, saleRange.min * (1 - 0.1 - holdingRisk)));
  const confident = related >= 12 && saleArtifact.metrics.mape <= 15 && purchaseArtifact.metrics.mape <= 15;
  return {
    status: "available", executionMode: "portable-trained-regression", purchasePrice, salePrice: normalizedSale, saleRange,
    estimatedDaysToSell, safeMaximumBuyPrice, confidence: confident ? "high" : "medium", abstentionReason: null,
    evidence: {
      purchaseTrainingRows: purchaseExamples.length, saleTrainingRows: saleExamples.length, timeToSellTrainingRows: timeExamples.length, exactOrRelatedModelRows: related,
      purchaseMetrics: purchaseArtifact.metrics, saleMetrics: saleArtifact.metrics, timeToSellMetrics: timeArtifact?.metrics ?? null,
    },
    safety: { advisoryOnly: true, automaticDecisioningEnabled: false, businessMutationEnabled: false, externalAiCallsEnabled: false },
  };
};

export type PhoneModelBundle = {
  purchase: ReturnType<typeof trainPortableRegression>;
  sale: ReturnType<typeof trainPortableRegression>;
  timeToSell: ReturnType<typeof trainPortableRegression> | null;
};

/** Phase 16 offline trainer. It creates shadow candidates only; activation is a separate admin action. */
export const trainPhoneModelBundle = (
  purchaseRows: PhonePricingTrainingRow[],
  saleRows: PhonePricingTrainingRow[],
  options: { trainedAt?: Date; syntheticTrainingData?: boolean } = {},
): PhoneModelBundle => {
  const purchaseExamples = phonePricingExamples(purchaseRows);
  const saleExamples = phonePricingExamples(saleRows);
  const timeExamples: RegressionExample[] = saleRows.flatMap((row) => {
    const days = daysBetween(row.purchaseDate, row.eventDate);
    return days === null ? [] : [{ x: phonePricingFeatureVector(row, row.eventDate || ""), y: days, observedAt: String(row.eventDate), entityKey: String(row.id) }];
  });
  if (purchaseExamples.length < 24 || saleExamples.length < 24) throw new Error("Phone training requires at least 24 valid purchases and 24 valid sales");
  const trainedAt = (options.trainedAt ?? new Date()).toISOString();
  const suffix = trainedAt.replace(/[^0-9]/g, "").slice(0, 17);
  const common = { featureNames: [...PHONE_PRICING_FEATURES], trainedAt, syntheticTrainingData: Boolean(options.syntheticTrainingData) };
  return {
    purchase: trainPortableRegression({ ...common, artifactId: `phone-purchase-${suffix}`, task: "phone-purchase-price", examples: purchaseExamples }),
    sale: trainPortableRegression({ ...common, artifactId: `phone-sale-${suffix}`, task: "phone-sale-price", examples: saleExamples }),
    timeToSell: timeExamples.length >= 24
      ? trainPortableRegression({ ...common, artifactId: `phone-days-${suffix}`, task: "phone-days-to-sell", examples: timeExamples })
      : null,
  };
};
