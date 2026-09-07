import type { Express, Request, Response } from "express";
import type { AuthorizeRole } from "./routes/intelligence/types";
import { allAsync, runAsync } from "./db/query";
import { phoneStorageCapacityGb } from "./advisory/phonePricingModel";

export type MarketPriceSnapshot = {
  id: number;
  model: string;
  storage: string;
  ram?: string | null;
  color?: string | null;
  condition?: string | null;
  batteryHealth?: number | null;
  priceType: "purchase" | "sale";
  price: number;
  sourceName: string;
  sourceReference?: string | null;
  observedAt: string;
  approvedByUserId?: number | null;
};

export type MarketEvidenceSide = {
  referencePrice: number | null;
  range: { min: number; max: number } | null;
  sampleCount: number;
  sourceCount: number;
  latestObservedAt: string | null;
  freshness: "fresh" | "aging" | "unavailable";
  specificationMatch: "exact-model-storage-ram" | "exact-model-storage" | "none";
  outliersExcluded: number;
};

export type PhoneMarketEvidence = {
  mode: "operator-approved-manual-snapshots";
  purchase: MarketEvidenceSide;
  sale: MarketEvidenceSide;
  limitations: string[];
};

const normalize = (value: unknown): string => String(value ?? "")
  .replace(/[يى]/g, "ی").replace(/ك/g, "ک")
  .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
  .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
  .toLocaleLowerCase("en-US").replace(/[^a-z0-9\u0600-\u06ff]+/g, " ").trim();

const numeric = (value: unknown): number | null => Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : null;
const sameStorage = (left: unknown, right: unknown): boolean => {
  const a = phoneStorageCapacityGb(left);
  const b = phoneStorageCapacityGb(right);
  return a > 0 && b > 0 ? a === b : normalize(left) === normalize(right);
};
const sameRam = (left: unknown, right: unknown): boolean => {
  const a = numeric(String(left ?? "").match(/\d+(?:\.\d+)?/)?.[0]);
  const b = numeric(String(right ?? "").match(/\d+(?:\.\d+)?/)?.[0]);
  return a !== null && b !== null ? a === b : normalize(left) === normalize(right);
};
const roundPrice = (value: number): number => Math.round(value / 100_000) * 100_000;
const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};
const quantile = (sorted: number[], position: number): number => {
  const index = (sorted.length - 1) * position;
  const lower = Math.floor(index);
  const fraction = index - lower;
  return sorted[lower] + (sorted[Math.min(lower + 1, sorted.length - 1)] - sorted[lower]) * fraction;
};
const robustRows = (rows: MarketPriceSnapshot[]): { rows: MarketPriceSnapshot[]; excluded: number } => {
  if (rows.length < 4) return { rows, excluded: 0 };
  const sorted = rows.map((row) => row.price).sort((a, b) => a - b);
  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);
  const iqr = q3 - q1;
  if (!(iqr > 0)) return { rows, excluded: 0 };
  const kept = rows.filter((row) => row.price >= q1 - 1.5 * iqr && row.price <= q3 + 1.5 * iqr);
  return kept.length ? { rows: kept, excluded: rows.length - kept.length } : { rows, excluded: 0 };
};

const unavailableSide = (): MarketEvidenceSide => ({
  referencePrice: null, range: null, sampleCount: 0, sourceCount: 0, latestObservedAt: null,
  freshness: "unavailable", specificationMatch: "none", outliersExcluded: 0,
});

const evidenceSide = (
  input: { model: string; storage?: string; ram?: string },
  rows: MarketPriceSnapshot[],
  priceType: MarketPriceSnapshot["priceType"],
  asOf: Date,
): MarketEvidenceSide => {
  let matched = rows.filter((row) => row.priceType === priceType
    && normalize(row.model) === normalize(input.model)
    && sameStorage(row.storage, input.storage));
  if (!matched.length) return unavailableSide();
  let specificationMatch: MarketEvidenceSide["specificationMatch"] = "exact-model-storage";
  if (normalize(input.ram)) {
    const exactRam = matched.filter((row) => sameRam(row.ram, input.ram));
    if (exactRam.length) {
      matched = exactRam;
      specificationMatch = "exact-model-storage-ram";
    }
  }
  const recent = matched.filter((row) => {
    const observed = new Date(row.observedAt);
    const ageDays = (asOf.getTime() - observed.getTime()) / 86_400_000;
    return !Number.isNaN(observed.getTime()) && ageDays >= -1 && ageDays <= 14;
  });
  if (!recent.length) return unavailableSide();
  const robust = robustRows(recent);
  const prices = robust.rows.map((row) => row.price).sort((a, b) => a - b);
  const latest = robust.rows.map((row) => row.observedAt).sort().at(-1) ?? null;
  const latestAge = latest ? (asOf.getTime() - new Date(latest).getTime()) / 86_400_000 : Infinity;
  return {
    referencePrice: roundPrice(median(prices)),
    range: { min: roundPrice(prices[0]), max: roundPrice(prices[prices.length - 1]) },
    sampleCount: robust.rows.length,
    sourceCount: new Set(robust.rows.map((row) => normalize(row.sourceName))).size,
    latestObservedAt: latest,
    freshness: latestAge <= 7 ? "fresh" : "aging",
    specificationMatch,
    outliersExcluded: robust.excluded,
  };
};

export const buildPhoneMarketEvidence = (
  input: { model: string; storage?: string; ram?: string },
  rows: MarketPriceSnapshot[],
  asOf = new Date(),
): PhoneMarketEvidence => ({
  mode: "operator-approved-manual-snapshots",
  purchase: evidenceSide(input, rows, "purchase", asOf),
  sale: evidenceSide(input, rows, "sale", asOf),
  limitations: [
    "شاهد بازار فقط از داده‌ای استفاده می‌کند که اپراتور مجاز به‌صورت دستی ثبت کرده است.",
    "هیچ وب‌سایت یا API بیرونی فراخوانی نمی‌شود و شاهد بازار قیمت را خودکار تغییر نمی‌دهد.",
  ],
});

export const PHONE_MARKET_SNAPSHOT_SCHEMA = `CREATE TABLE IF NOT EXISTS phone_market_price_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    model TEXT NOT NULL, storage TEXT NOT NULL, ram TEXT, color TEXT, condition TEXT, battery_health REAL,
    price_type TEXT NOT NULL CHECK(price_type IN ('purchase', 'sale')), price REAL NOT NULL CHECK(price > 0),
    source_name TEXT NOT NULL, source_reference TEXT, observed_at TEXT NOT NULL,
    approval_status TEXT NOT NULL DEFAULT 'approved' CHECK(approval_status = 'approved'),
    approved_by_user_id INTEGER, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc'))
  )`;
export const PHONE_MARKET_SNAPSHOT_INDEX = "CREATE INDEX IF NOT EXISTS idx_phone_market_snapshot_lookup ON phone_market_price_snapshots(model, storage, ram, price_type, observed_at)";

export const ensurePhoneMarketSnapshotTable = async (): Promise<void> => {
  await runAsync(PHONE_MARKET_SNAPSHOT_SCHEMA);
  await runAsync(PHONE_MARKET_SNAPSHOT_INDEX);
};

export const readApprovedPhoneMarketSnapshots = async (): Promise<MarketPriceSnapshot[]> => {
  await ensurePhoneMarketSnapshotTable();
  return allAsync(`SELECT id, model, storage, ram, color, condition, battery_health AS batteryHealth,
    price_type AS priceType, price, source_name AS sourceName, source_reference AS sourceReference,
    observed_at AS observedAt, approved_by_user_id AS approvedByUserId
    FROM phone_market_price_snapshots WHERE approval_status = 'approved' ORDER BY observed_at DESC, id DESC LIMIT 500`) as Promise<MarketPriceSnapshot[]>;
};

const text = (value: unknown, max: number): string => String(value ?? "").trim().slice(0, max);

export const registerPhoneMarketPriceSnapshotRoutes = (app: Express, authorizeRole: AuthorizeRole): void => {
  app.get("/api/phones/market-price-snapshots", authorizeRole(["Admin", "Manager", "Warehouse"]), async (request: Request, response: Response, next) => {
    try {
      const model = text(request.query.model, 120);
      const storage = text(request.query.storage, 40);
      if (!model || !storage) return response.status(400).json({ success: false, message: "مدل و حافظه برای مشاهده شاهد بازار الزامی است." });
      const rows = await readApprovedPhoneMarketSnapshots();
      return response.json({ success: true, data: buildPhoneMarketEvidence({ model, storage, ram: text(request.query.ram, 40) || undefined }, rows) });
    } catch (error) { return next(error); }
  });

  app.post("/api/phones/market-price-snapshots", authorizeRole(["Admin", "Manager"]), async (request: Request, response: Response, next) => {
    try {
      const model = text(request.body?.model, 120);
      const storage = text(request.body?.storage, 40);
      const ram = text(request.body?.ram, 40) || null;
      const sourceName = text(request.body?.sourceName, 120);
      const sourceReference = text(request.body?.sourceReference, 240) || null;
      const priceType = text(request.body?.priceType, 16);
      const price = numeric(request.body?.price);
      const observedAt = text(request.body?.observedAt, 40);
      const observedDate = new Date(observedAt);
      const ageDays = (Date.now() - observedDate.getTime()) / 86_400_000;
      if (!model || !storage || !sourceName || !["purchase", "sale"].includes(priceType) || !price || Number.isNaN(observedDate.getTime())) {
        return response.status(400).json({ success: false, message: "مشخصات، نوع قیمت، مبلغ، منبع و زمان مشاهده باید معتبر باشند." });
      }
      if (ageDays < -1 || ageDays > 90) return response.status(400).json({ success: false, message: "زمان مشاهده باید بین اکنون و حداکثر ۹۰ روز گذشته باشد." });
      await ensurePhoneMarketSnapshotTable();
      const result = await runAsync(`INSERT INTO phone_market_price_snapshots
        (model, storage, ram, color, condition, battery_health, price_type, price, source_name, source_reference, observed_at, approved_by_user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        model, storage, ram, text(request.body?.color, 80) || null, text(request.body?.condition, 80) || null,
        numeric(request.body?.batteryHealth), priceType, price, sourceName, sourceReference, observedDate.toISOString(),
        Number((request as any).user?.id || 0) || null,
      ]);
      return response.status(201).json({ success: true, data: { id: result.lastID, approvalStatus: "approved", automaticPricingApplied: false } });
    } catch (error) { return next(error); }
  });
};
