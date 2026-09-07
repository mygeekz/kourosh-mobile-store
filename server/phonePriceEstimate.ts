import type { Express, Request, Response } from "express";
import type { AuthorizeRole } from "./routes/intelligence/types";
import { buildPhoneMlAdvisory, type PhoneMlAdvisory } from "./advisory/phonePricingModel";
import { runPhoneAdvisoryInference } from "./advisory/advisoryInference";
import { advisoryPolicyPublicSnapshot, getAdvisoryOnlyPolicy } from "./advisory/advisoryPolicy";
import { isFactoryNewPhoneCondition, normalizePhoneBatteryHealth } from "./utils/phoneSpecification";
import { phoneStorageCapacityGb } from "./advisory/phonePricingModel";
import { buildPhoneMarketEvidence, readApprovedPhoneMarketSnapshots, type PhoneMarketEvidence } from "./phoneMarketPriceSnapshots";

export type PhonePriceEstimateInput = {
  model: string;
  color?: string;
  storage?: string;
  ram?: string;
  condition?: string;
  batteryHealth?: number;
};

export type ComparablePhone = {
  id: number;
  model: string;
  color?: string | null;
  storage?: string | null;
  ram?: string | null;
  condition?: string | null;
  batteryHealth?: number | null;
  price: number;
  eventDate?: string | null;
  purchaseDate?: string | null;
  source: "phone-purchase" | "cash-sale" | "sales-order" | "installment-sale";
};

type EstimateSide = {
  suggestedPrice: number | null;
  range: { min: number; max: number } | null;
  comparableCount: number;
  dataLevel: "sufficient" | "limited" | "insufficient";
  basis: "purchase-history" | "actual-sales-history";
  specificationMatch: "exact-model-storage-ram" | "exact-model-storage" | "model-only" | "none";
  confidence: "high" | "medium" | "low" | "insufficient";
  confidenceReason: string;
  outliersExcluded: number;
  monotonicityStatus: "consistent" | "warning" | "not-evaluable";
};

export type PhonePricingRecommendationSide = {
  suggestedPrice: number | null;
  source: "guarded-blend" | "comparable-baseline" | "insufficient";
  status: "ready" | "review-required" | "insufficient";
  mlStatus: "accepted" | "rejected-scale-mismatch" | "rejected-out-of-range" | "unavailable";
  mlDeviationPercent: number | null;
  reason: string;
};

export type PhonePricingRecommendation = {
  strategy: "guarded-ensemble-v1";
  currencyUnit: "toman";
  qualityGate: "passed" | "fallback-engaged" | "insufficient";
  conflictDetected: boolean;
  purchase: PhonePricingRecommendationSide;
  sale: PhonePricingRecommendationSide;
};

export type PhonePriceEstimateResponse = {
  mode: "read-only-ml-advisory-with-comparable-fallback";
  estimatorKind: "portable-trained-regression-and-deterministic-fallback";
  generatedAt: string;
  input: PhonePriceEstimateInput;
  purchase: EstimateSide;
  sale: EstimateSide;
  recommendation: PhonePricingRecommendation;
  evidence: {
    matchedPhoneIds: number[];
    purchaseSources: number;
    actualSaleSources: number;
  };
  reasons: string[];
  limitations: string[];
  mlAdvisory: PhoneMlAdvisory;
  marketEvidence: PhoneMarketEvidence;
  safety: {
    realInferenceEnabled: boolean;
    modelExecutionEnabled: boolean;
    runtimeArtifactByteLoadingEnabled: boolean;
    artifactActivationEnabled: false;
    externalAiCallsEnabled: false;
    businessMutationEnabled: false;
    automaticPricingEnabled: false;
  };
  advisoryPolicy: ReturnType<typeof advisoryPolicyPublicSnapshot>;
};

const normalize = (value: unknown): string =>
  String(value ?? "")
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, " ")
    .trim();

const tokens = (value: unknown): string[] => normalize(value).split(" ").filter(Boolean);

const numeric = (value: unknown): number | null => {
  const result = Number(value);
  return Number.isFinite(result) && result > 0 ? result : null;
};

const conditionFactor = (value: unknown): number => {
  const key = normalize(value);
  const factors: Record<string, number> = {
    "نو آکبند": 1.05,
    "نو": 1.05,
    "آکبند": 1.05,
    "در حد نو": 1,
    "عالی": 0.97,
    "تمیز": 0.93,
    "کارکرده": 0.88,
    "معمولی": 0.86,
    "خط و خش دار": 0.8,
    "نیازمند تعمیر": 0.65,
    "like new": 1,
    excellent: 0.97,
    good: 0.93,
    fair: 0.88,
    damaged: 0.7,
  };
  return isFactoryNewPhoneCondition(value) ? 1.05 : factors[key] ?? 0.88;
};

const sameStorage = (left: unknown, right: unknown): boolean => {
  const a = phoneStorageCapacityGb(left);
  const b = phoneStorageCapacityGb(right);
  return a > 0 && b > 0 ? a === b : normalize(left) === normalize(right);
};

const sameRam = (left: unknown, right: unknown): boolean => {
  const a = numeric(left);
  const b = numeric(right);
  return a !== null && b !== null ? a === b : normalize(left) === normalize(right);
};

const dateAgeDays = (value: unknown, asOf: Date): number | null => {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const parsed = new Date(raw.length === 10 ? `${raw}T00:00:00Z` : raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return Math.max(0, Math.floor((asOf.getTime() - parsed.getTime()) / 86_400_000));
};

const recencyWeight = (ageDays: number | null): number => {
  if (ageDays === null) return 0.45;
  if (ageDays <= 30) return 1;
  if (ageDays <= 90) return 0.85;
  if (ageDays <= 180) return 0.7;
  if (ageDays <= 365) return 0.55;
  return 0.4;
};

const modelScore = (target: string, candidate: string): number => {
  const targetKey = normalize(target);
  const candidateKey = normalize(candidate);
  if (!targetKey || !candidateKey) return 0;
  if (targetKey === candidateKey) return 50;
  const targetTokens = tokens(targetKey);
  const candidateSet = new Set(tokens(candidateKey));
  const overlap = targetTokens.filter((token) => candidateSet.has(token)).length;
  const ratio = targetTokens.length ? overlap / targetTokens.length : 0;
  return ratio >= 0.75 ? 35 + ratio * 10 : 0;
};

const comparableScore = (input: PhonePriceEstimateInput, row: ComparablePhone): number => {
  let score = modelScore(input.model, row.model);
  if (!score) return 0;
  const addExact = (target: unknown, candidate: unknown, points: number) => {
    if (!normalize(target)) return;
    if (normalize(target) === normalize(candidate)) score += points;
  };
  addExact(input.storage, row.storage, 15);
  addExact(input.ram, row.ram, 10);
  addExact(input.condition, row.condition, 10);
  addExact(input.color, row.color, 5);
  if (input.batteryHealth && numeric(row.batteryHealth)) {
    const delta = Math.abs(input.batteryHealth - Number(row.batteryHealth));
    score += delta <= 3 ? 10 : delta <= 7 ? 7 : delta <= 15 ? 3 : 0;
  }
  return score;
};

const adjustedPrice = (input: PhonePriceEstimateInput, row: ComparablePhone): number => {
  const conditionAdjustment = conditionFactor(input.condition) / conditionFactor(row.condition);
  const targetBattery = normalizePhoneBatteryHealth(input.condition, input.batteryHealth);
  const rowBattery = normalizePhoneBatteryHealth(row.condition, row.batteryHealth);
  const batteryAdjustment = targetBattery && rowBattery
    ? Math.min(1.1, Math.max(0.9, 1 + (targetBattery - rowBattery) * 0.002))
    : 1;
  return row.price * conditionAdjustment * batteryAdjustment;
};

const roundStorePrice = (value: number): number => {
  const step = value >= 10_000_000 ? 100_000 : value >= 1_000_000 ? 10_000 : 1_000;
  return Math.max(step, Math.round(value / step) * step);
};

const guardedRecommendationSide = (
  comparable: EstimateSide,
  mlPrice: number | null,
  mlAvailable: boolean,
): PhonePricingRecommendationSide => {
  const baseline = numeric(comparable.suggestedPrice);
  const candidate = numeric(mlPrice);
  if (!baseline) {
    return {
      suggestedPrice: null,
      source: "insufficient",
      status: "insufficient",
      mlStatus: mlAvailable && candidate ? "rejected-out-of-range" : "unavailable",
      mlDeviationPercent: null,
      reason: "برای کنترل خروجی ML، برآورد قابل اتکای معاملات مشابه وجود ندارد؛ سیستم از اعلام قیمت خودداری کرد.",
    };
  }
  if (!mlAvailable || !candidate) {
    return {
      suggestedPrice: roundStorePrice(baseline),
      source: "comparable-baseline",
      status: "ready",
      mlStatus: "unavailable",
      mlDeviationPercent: null,
      reason: "توصیه بر پایه معاملات مشابه واقعی فروشگاه ارائه شده است.",
    };
  }

  const ratio = candidate / baseline;
  const deviationPercent = Math.round(((candidate - baseline) / baseline) * 1000) / 10;
  const scaleMismatch = ratio >= 7.5 && ratio <= 12.5;
  const lowerReference = numeric(comparable.range?.min) ?? baseline;
  const upperReference = numeric(comparable.range?.max) ?? baseline;
  const lowerGuard = lowerReference * 0.65;
  const upperGuard = upperReference * 1.35;
  if (scaleMismatch || candidate < lowerGuard || candidate > upperGuard) {
    return {
      suggestedPrice: roundStorePrice(baseline),
      source: "comparable-baseline",
      status: "review-required",
      mlStatus: scaleMismatch ? "rejected-scale-mismatch" : "rejected-out-of-range",
      mlDeviationPercent: deviationPercent,
      reason: scaleMismatch
        ? "خروجی ML اختلاف مقیاس نزدیک به ده‌برابر دارد و از توصیه نهایی کنار گذاشته شد."
        : "خروجی ML خارج از محدوده قابل دفاع معاملات مشابه است و از توصیه نهایی کنار گذاشته شد.",
    };
  }

  const mlWeight = comparable.confidence === "high" ? 0.3 : comparable.confidence === "medium" ? 0.22 : 0.15;
  const blended = roundStorePrice((baseline * (1 - mlWeight)) + (candidate * mlWeight));
  return {
    suggestedPrice: blended,
    source: "guarded-blend",
    status: "ready",
    mlStatus: "accepted",
    mlDeviationPercent: deviationPercent,
    reason: "توصیه نهایی با وزن بیشتر معاملات مشابه و سهم کنترل‌شده ML محاسبه شده است.",
  };
};

export const buildGuardedPhonePricingRecommendation = (
  purchase: EstimateSide,
  sale: EstimateSide,
  mlAdvisory: PhoneMlAdvisory,
): PhonePricingRecommendation => {
  let purchaseRecommendation = guardedRecommendationSide(
    purchase,
    mlAdvisory.safeMaximumBuyPrice,
    mlAdvisory.status === "available",
  );
  const saleRecommendation = guardedRecommendationSide(
    sale,
    mlAdvisory.salePrice,
    mlAdvisory.status === "available",
  );
  if (
    purchaseRecommendation.suggestedPrice
    && saleRecommendation.suggestedPrice
    && purchaseRecommendation.suggestedPrice >= saleRecommendation.suggestedPrice
  ) {
    purchaseRecommendation = {
      ...purchaseRecommendation,
      suggestedPrice: null,
      status: "review-required",
      reason: "قیمت خرید پیشنهادی حاشیه امنی پایین‌تر از قیمت فروش ندارد؛ تأیید قیمت خرید متوقف شد.",
    };
  }
  const sides = [purchaseRecommendation, saleRecommendation];
  const conflictDetected = sides.some((side) => side.mlStatus === "rejected-scale-mismatch" || side.mlStatus === "rejected-out-of-range");
  const insufficient = sides.every((side) => side.suggestedPrice === null);
  return {
    strategy: "guarded-ensemble-v1",
    currencyUnit: "toman",
    qualityGate: insufficient ? "insufficient" : conflictDetected ? "fallback-engaged" : "passed",
    conflictDetected,
    purchase: purchaseRecommendation,
    sale: saleRecommendation,
  };
};

const weightedMedian = (values: Array<{ value: number; weight: number }>): number | null => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a.value - b.value);
  const totalWeight = sorted.reduce((sum, item) => sum + item.weight, 0);
  let cursor = 0;
  for (const item of sorted) {
    cursor += item.weight;
    if (cursor >= totalWeight / 2) return item.value;
  }
  return sorted[sorted.length - 1].value;
};

const quantile = (sorted: number[], position: number): number => {
  if (sorted.length === 1) return sorted[0];
  const index = (sorted.length - 1) * position;
  const lower = Math.floor(index);
  const fraction = index - lower;
  return sorted[lower] + (sorted[Math.min(lower + 1, sorted.length - 1)] - sorted[lower]) * fraction;
};

const removePriceOutliers = <T extends { value: number }>(items: T[]): { items: T[]; excluded: number } => {
  if (items.length < 4) return { items, excluded: 0 };
  const sorted = items.map((item) => item.value).sort((a, b) => a - b);
  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);
  const iqr = q3 - q1;
  if (!(iqr > 0)) return { items, excluded: 0 };
  const minimum = q1 - 1.5 * iqr;
  const maximum = q3 + 1.5 * iqr;
  const kept = items.filter((item) => item.value >= minimum && item.value <= maximum);
  return kept.length ? { items: kept, excluded: items.length - kept.length } : { items, excluded: 0 };
};

const confidenceFor = (match: EstimateSide["specificationMatch"], count: number): Pick<EstimateSide, "confidence" | "confidenceReason"> => {
  if (!count || match === "none") return { confidence: "insufficient", confidenceReason: "نمونه قابل اتکایی برای این مشخصات ثبت نشده است." };
  if (match === "exact-model-storage-ram" && count >= 3) return { confidence: "high", confidenceReason: "مدل، حافظه و RAM دقیق با حداقل سه نمونه منطبق است." };
  if (match === "exact-model-storage-ram") return { confidence: "medium", confidenceReason: "مشخصات دقیق منطبق است، اما تعداد نمونه‌ها محدود است." };
  if (match === "exact-model-storage" && count >= 3) return { confidence: "medium", confidenceReason: "مدل و حافظه دقیق است؛ RAM دقیق در همه نمونه‌ها موجود نیست." };
  return { confidence: "low", confidenceReason: match === "exact-model-storage" ? "مدل و حافظه منطبق است، اما RAM یا تعداد نمونه کافی نیست." : "برآورد فقط بر نمونه‌های مدل مشابه تکیه دارد." };
};

const storageMonotonicity = (
  input: PhonePriceEstimateInput,
  candidates: ComparablePhone[],
): EstimateSide["monotonicityStatus"] => {
  const targetCapacity = phoneStorageCapacityGb(input.storage);
  if (!targetCapacity) return "not-evaluable";
  const groups = new Map<number, number[]>();
  for (const row of candidates) {
    const capacity = phoneStorageCapacityGb(row.storage);
    if (!capacity || !numeric(row.price)) continue;
    const values = groups.get(capacity) ?? [];
    values.push(adjustedPrice(input, row));
    groups.set(capacity, values);
  }
  const medians = [...groups.entries()].map(([capacity, values]) => ({
    capacity,
    median: quantile([...values].sort((a, b) => a - b), 0.5),
  }));
  const target = medians.find((item) => item.capacity === targetCapacity);
  if (!target || medians.length < 2) return "not-evaluable";
  const tolerance = 0.03;
  const inversion = medians.some((item) =>
    (item.capacity < targetCapacity && item.median > target.median * (1 + tolerance))
    || (item.capacity > targetCapacity && item.median < target.median * (1 - tolerance)));
  return inversion ? "warning" : "consistent";
};

const estimateSide = (
  input: PhonePriceEstimateInput,
  rows: ComparablePhone[],
  basis: EstimateSide["basis"],
  asOf: Date,
): { estimate: EstimateSide; matched: ComparablePhone[] } => {
  const modelCandidates = rows.filter((row) => modelScore(input.model, row.model) > 0 && numeric(row.price));
  const exactModelCandidates = modelCandidates.filter((row) => normalize(input.model) === normalize(row.model));
  const exactModelAvailable = exactModelCandidates.length > 0;
  let specificationCandidates = exactModelAvailable ? exactModelCandidates : modelCandidates;
  let specificationMatch: EstimateSide["specificationMatch"] = specificationCandidates.length ? "model-only" : "none";
  if (normalize(input.storage)) {
    specificationCandidates = specificationCandidates.filter((row) => sameStorage(input.storage, row.storage));
    specificationMatch = specificationCandidates.length ? (exactModelAvailable ? "exact-model-storage" : "model-only") : "none";
  }
  if (normalize(input.ram)) {
    const exactRam = specificationCandidates.filter((row) => sameRam(input.ram, row.ram));
    if (exactRam.length > 0) {
      specificationCandidates = exactRam;
      specificationMatch = exactModelAvailable ? "exact-model-storage-ram" : "model-only";
    }
  }
  const matched = specificationCandidates
    .map((row) => ({ row, score: comparableScore(input, row) }))
    .filter(({ row, score }) => score >= 42 && numeric(row.price))
    .sort((a, b) => b.score - a.score || Number(b.row.id) - Number(a.row.id))
    .slice(0, 25);
  if (!matched.length) {
    return {
      estimate: {
        suggestedPrice: null, range: null, comparableCount: 0, dataLevel: "insufficient", basis,
        specificationMatch: "none", confidence: "insufficient", confidenceReason: "نمونه قابل اتکایی برای این مشخصات ثبت نشده است.",
        outliersExcluded: 0, monotonicityStatus: "not-evaluable",
      },
      matched: [],
    };
  }
  const weighted = matched.map(({ row, score }) => ({
    value: adjustedPrice(input, row),
    weight: (score / 100) * recencyWeight(dateAgeDays(row.eventDate, asOf)),
  }));
  const robust = removePriceOutliers(weighted);
  const median = weightedMedian(robust.items);
  const prices = robust.items.map((item) => item.value).sort((a, b) => a - b);
  const confidence = confidenceFor(specificationMatch, robust.items.length);
  const monotonicityStatus = storageMonotonicity(input, exactModelCandidates.length ? exactModelCandidates : modelCandidates);
  return {
    estimate: {
      suggestedPrice: median === null ? null : roundStorePrice(median),
      range: median === null ? null : {
        min: roundStorePrice(prices[0]),
        max: roundStorePrice(prices[prices.length - 1]),
      },
      comparableCount: robust.items.length,
      dataLevel: robust.items.length >= 3 ? "sufficient" : "limited",
      basis,
      specificationMatch,
      ...confidence,
      outliersExcluded: robust.excluded,
      monotonicityStatus,
    },
    matched: matched.filter((_, index) => robust.items.includes(weighted[index])).map(({ row }) => row),
  };
};

export const buildPhonePriceEstimate = (
  input: PhonePriceEstimateInput,
  purchaseRows: ComparablePhone[],
  saleRows: ComparablePhone[],
  asOf = new Date(),
  mlAdvisoryOverride?: PhoneMlAdvisory,
  marketEvidenceOverride?: PhoneMarketEvidence,
): PhonePriceEstimateResponse => {
  const purchase = estimateSide(input, purchaseRows, "purchase-history", asOf);
  const sale = estimateSide(input, saleRows, "actual-sales-history", asOf);
  const matchedIds = [...new Set([...purchase.matched, ...sale.matched].map((row) => Number(row.id)))].sort((a, b) => a - b);
  const reasons: string[] = [];
  if (purchase.estimate.dataLevel === "insufficient") reasons.push("برای پیشنهاد قیمت خرید، معامله مشابه کافی در داده‌های فروشگاه وجود ندارد.");
  else reasons.push(`قیمت خرید از ${purchase.estimate.comparableCount} سابقه با حافظه منطبق${purchase.estimate.specificationMatch === "exact-model-storage-ram" ? " و RAM دقیق" : "؛ RAM دقیق در داده موجود نبود"} و با تعدیل وضعیت و باتری برآورد شده است.`);
  if (sale.estimate.dataLevel === "insufficient") reasons.push("برای پیشنهاد قیمت فروش، فروش واقعی مشابه کافی در سیستم ثبت نشده است.");
  else reasons.push(`قیمت فروش از ${sale.estimate.comparableCount} فروش واقعی با حافظه منطبق${sale.estimate.specificationMatch === "exact-model-storage-ram" ? " و RAM دقیق" : ""} در سیستم فروش برآورد شده است.`);
  if (purchase.estimate.outliersExcluded + sale.estimate.outliersExcluded > 0) reasons.push("برای جلوگیری از انحراف پیشنهاد، قیمت‌های پرت با قاعده IQR از بازه قابل اتکا کنار گذاشته شدند.");
  if (purchase.estimate.monotonicityStatus === "warning" || sale.estimate.monotonicityStatus === "warning") reasons.push("ترتیب تاریخی قیمت بین ظرفیت‌های حافظه ناسازگار است؛ پیشنهاد نیازمند بررسی دستی بیشتری است.");
  const mlAdvisory = mlAdvisoryOverride ?? buildPhoneMlAdvisory(input, purchaseRows, saleRows, asOf);
  const recommendation = buildGuardedPhonePricingRecommendation(purchase.estimate, sale.estimate, mlAdvisory);
  if (recommendation.conflictDetected) reasons.unshift("کنترل ایمنی، خروجی ناسازگار ML را از توصیه نهایی حذف و برآورد معاملات مشابه را فعال کرد.");
  return {
    mode: "read-only-ml-advisory-with-comparable-fallback",
    estimatorKind: "portable-trained-regression-and-deterministic-fallback",
    generatedAt: asOf.toISOString(),
    input,
    purchase: purchase.estimate,
    sale: sale.estimate,
    recommendation,
    evidence: {
      matchedPhoneIds: matchedIds,
      purchaseSources: purchase.estimate.comparableCount,
      actualSaleSources: sale.estimate.comparableCount,
    },
    reasons,
    limitations: [
      "این برآورد فقط از داده‌های ثبت‌شده همین فروشگاه استفاده می‌کند و قیمت بازار بیرونی را نمی‌بیند.",
      "مدل واقعی فقط نقش مشاور دارد و نتیجه آن تصمیم یا تغییر خودکار قیمت نیست.",
      "ML تنها پس از عبور از کنترل مقیاس و سازگاری با معاملات مشابه در توصیه نهایی سهم می‌گیرد.",
      "قیمت پیشنهادی باید پیش از ثبت نهایی توسط کاربر بررسی شود.",
    ],
    mlAdvisory,
    marketEvidence: marketEvidenceOverride ?? buildPhoneMarketEvidence(input, [], asOf),
    safety: {
      realInferenceEnabled: mlAdvisory.status === "available",
      modelExecutionEnabled: mlAdvisory.status === "available",
      runtimeArtifactByteLoadingEnabled: mlAdvisory.executionMode === "approved-artifact",
      artifactActivationEnabled: false,
      externalAiCallsEnabled: false,
      businessMutationEnabled: false,
      automaticPricingEnabled: false,
    },
    advisoryPolicy: advisoryPolicyPublicSnapshot(getAdvisoryOnlyPolicy()),
  };
};

export const readPhonePriceComparables = async (): Promise<{
  purchases: ComparablePhone[];
  sales: ComparablePhone[];
}> => {
  const { allAsync } = await import("./db/query");
  const purchases = await allAsync(`
    SELECT id, model, color, storage, ram, condition, batteryHealth,
           COALESCE(NULLIF(currentPurchasePrice, 0), purchasePrice, 0) AS price,
           COALESCE(NULLIF(currentPurchasePriceUpdatedAt, ''), purchaseDate, registerDate) AS eventDate,
           purchaseDate,
           'phone-purchase' AS source
    FROM phones
    WHERE COALESCE(NULLIF(currentPurchasePrice, 0), purchasePrice, 0) > 0
    ORDER BY id DESC
    LIMIT 1000
  `) as ComparablePhone[];
  const sales = await allAsync(`
    SELECT id, model, color, storage, ram, condition, batteryHealth, price, eventDate, purchaseDate, source
    FROM (
      SELECT ph.id, ph.model, ph.color, ph.storage, ph.ram, ph.condition, ph.batteryHealth,
             CASE WHEN COALESCE(st.quantity, 0) > 0 THEN st.totalPrice / st.quantity ELSE st.pricePerItem END AS price,
             st.transactionDate AS eventDate, ph.purchaseDate, 'cash-sale' AS source
      FROM sales_transactions st
      JOIN phones ph ON st.itemType = 'phone' AND st.itemId = ph.id
      WHERE COALESCE(NULLIF(st.totalPrice, 0), st.pricePerItem, 0) > 0
      UNION ALL
      SELECT ph.id, ph.model, ph.color, ph.storage, ph.ram, ph.condition, ph.batteryHealth,
             CASE WHEN COALESCE(soi.quantity, 0) > 0 THEN soi.totalPrice / soi.quantity ELSE soi.unitPrice END AS price,
             so.transactionDate AS eventDate, ph.purchaseDate, 'sales-order' AS source
      FROM sales_order_items soi
      JOIN sales_orders so ON so.id = soi.orderId
      JOIN phones ph ON soi.itemType = 'phone' AND soi.itemId = ph.id
      WHERE COALESCE(so.status, 'active') = 'active' AND COALESCE(NULLIF(soi.totalPrice, 0), soi.unitPrice, 0) > 0
      UNION ALL
      SELECT ph.id, ph.model, ph.color, ph.storage, ph.ram, ph.condition, ph.batteryHealth,
             CASE WHEN COALESCE(isi.quantity, 0) > 0 THEN isi.totalPrice / isi.quantity ELSE isi.unitPrice END AS price,
             COALESCE(ins.saleDateISO, ins.dateCreated) AS eventDate, ph.purchaseDate, 'installment-sale' AS source
      FROM installment_sale_items isi
      JOIN installment_sales ins ON ins.id = isi.saleId
      JOIN phones ph ON isi.itemType = 'phone' AND isi.itemId = ph.id
      WHERE COALESCE(ins.status,'active') = 'active'
        AND COALESCE(NULLIF(isi.totalPrice, 0), isi.unitPrice, 0) > 0
      UNION ALL
      SELECT ph.id, ph.model, ph.color, ph.storage, ph.ram, ph.condition, ph.batteryHealth,
             ins.actualSalePrice AS price,
             COALESCE(ins.saleDateISO, ins.dateCreated) AS eventDate, ph.purchaseDate, 'installment-sale' AS source
      FROM installment_sales ins
      JOIN phones ph ON ins.phoneId = ph.id
      WHERE COALESCE(ins.status,'active') = 'active'
        AND COALESCE(ins.actualSalePrice, 0) > 0
        AND NOT EXISTS (
          SELECT 1 FROM installment_sale_items isi
          WHERE isi.saleId = ins.id AND isi.itemType = 'phone'
        )
    )
    WHERE price > 0
    ORDER BY eventDate DESC
    LIMIT 1000
  `) as ComparablePhone[];
  return { purchases, sales };
};

const queryValue = (request: Request, key: string, max = 120): string =>
  String(request.query[key] ?? "").trim().slice(0, max);

export const registerPhonePriceEstimateRoute = (
  app: Express,
  authorizeRole: AuthorizeRole,
): void => {
  app.get(
    "/api/phones/price-estimate",
    authorizeRole(["Admin", "Manager", "Warehouse"]),
    async (request: Request, response: Response) => {
      try {
        const model = queryValue(request, "model");
        if (model.length < 2) {
          return response.status(400).json({ success: false, message: "مدل گوشی برای برآورد قیمت الزامی است." });
        }
        const condition = queryValue(request, "condition", 80) || undefined;
        const batteryRaw = queryValue(request, "batteryHealth", 3);
        const requestedBatteryHealth = batteryRaw ? Number(batteryRaw) : undefined;
        if (!isFactoryNewPhoneCondition(condition) && requestedBatteryHealth !== undefined && (!Number.isFinite(requestedBatteryHealth) || requestedBatteryHealth < 0 || requestedBatteryHealth > 100)) {
          return response.status(400).json({ success: false, message: "سلامت باتری باید بین صفر تا صد باشد." });
        }
        const batteryHealth = normalizePhoneBatteryHealth(condition, requestedBatteryHealth) ?? undefined;
        const input: PhonePriceEstimateInput = {
          model,
          color: queryValue(request, "color", 80) || undefined,
          storage: queryValue(request, "storage", 40) || undefined,
          ram: queryValue(request, "ram", 40) || undefined,
          condition,
          batteryHealth,
        };
        const [{ purchases, sales }, marketRows] = await Promise.all([readPhonePriceComparables(), readApprovedPhoneMarketSnapshots()]);
        const mlAdvisory = await runPhoneAdvisoryInference(input, purchases, sales);
        const asOf = new Date();
        const marketEvidence = buildPhoneMarketEvidence(input, marketRows, asOf);
        return response.json({ success: true, data: buildPhonePriceEstimate(input, purchases, sales, asOf, mlAdvisory, marketEvidence) });
      } catch (error: any) {
        console.error("Phone price estimate error:", error?.message || error);
        return response.status(500).json({ success: false, message: "خطا در خواندن داده‌های برآورد قیمت گوشی." });
      }
    },
  );
};
