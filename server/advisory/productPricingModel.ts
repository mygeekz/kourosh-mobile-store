import { runPortableRegression, trainPortableRegression, type RegressionExample } from "./portableModel";

export type ProductPriceRow = { id: number; productId: number; name: string; categoryId: number | null; purchaseCost: number; salePrice: number; soldAt: string };
export type ProductPriceInput = { productId: number; name: string; categoryId: number | null; purchaseCost: number };

const hash = (value: string): number => {
  let result = 2166136261;
  for (const char of value.toLocaleLowerCase("fa-IR")) { result ^= char.charCodeAt(0); result = Math.imul(result, 16777619); }
  return result >>> 0;
};

const features = (row: Pick<ProductPriceRow, "name" | "categoryId" | "purchaseCost">): number[] => {
  const buckets = Array(6).fill(0);
  for (const token of row.name.split(/\s+/).filter(Boolean)) buckets[hash(token) % buckets.length] += 1;
  return [...buckets, Number(row.categoryId || 0), Math.log(Math.max(1, Number(row.purchaseCost || 0)))];
};

export const buildProductPriceAdvisory = (input: ProductPriceInput, rows: ProductPriceRow[], now = new Date()) => {
  const valid = rows.filter((row) => row.purchaseCost > 0 && row.salePrice > 0 && row.soldAt);
  const related = valid.filter((row) => row.productId === input.productId || (input.categoryId && row.categoryId === input.categoryId)).length;
  const safety = { advisoryOnly: true as const, humanReviewRequired: true as const, automaticPricingEnabled: false as const, businessMutationEnabled: false as const };
  if (valid.length < 30 || related < 5 || input.purchaseCost <= 0) return { status: "abstained" as const, suggestedSalePrice: null, range: null, reason: "برای مشاوره قیمت این کالا، سابقه خرید و فروش مرتبط کافی نیست.", metrics: null, safety };
  const examples: RegressionExample[] = valid.map((row) => ({ x: features(row), y: Math.log(row.salePrice), observedAt: row.soldAt, entityKey: String(row.id) }));
  const artifact = trainPortableRegression({ artifactId: `product-sale-${now.toISOString()}`, task: "product-sale-price", featureNames: ["name_hash_0", "name_hash_1", "name_hash_2", "name_hash_3", "name_hash_4", "name_hash_5", "category_id", "log_purchase_cost"], examples, trainedAt: now.toISOString() });
  const price = Math.exp(runPortableRegression(artifact, features(input)));
  const step = price >= 1_000_000 ? 10_000 : 1_000;
  const rounded = Math.max(step, Math.round(price / step) * step);
  const spread = Math.max(0.05, Math.min(0.2, artifact.metrics.mape / 100 || 0.1));
  return { status: "available" as const, suggestedSalePrice: rounded, range: { min: Math.round(rounded * (1 - spread) / step) * step, max: Math.round(rounded * (1 + spread) / step) * step }, reason: "پیشنهاد از مدل رگرسیون آموزش‌دیده روی فروش واقعی و بهای خرید محاسبه شده است.", metrics: artifact.metrics, safety };
};
