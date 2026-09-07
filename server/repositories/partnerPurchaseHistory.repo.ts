import { allAsync } from "../db/query";

const safeJsonParse = <T = any>(value: any): T | null => {
  if (value == null || value === "") return null;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

export const listProductPricingHistoryForPartnerProfileFromRepo = async (
  productIds: number[],
): Promise<any[]> => {
  if (!productIds.length) return [] as any[];
  const placeholders = productIds.map(() => "?").join(",");
  return allAsync(
    `SELECT id, productId, oldPrice, newPrice, source, note, createdAt, userId
       FROM pricing_history
      WHERE productId IN (${placeholders})
      ORDER BY productId ASC, datetime(createdAt) ASC, id ASC`,
    productIds,
  ).catch(() => [] as any[]);
};

export const listPhoneInventoryEventsForPartnerProfileFromRepo = async (
  phoneId: number,
): Promise<any[]> => {
  const rows = await allAsync(
    `SELECT * FROM phone_inventory_events WHERE phoneId = ? ORDER BY datetime(COALESCE(eventDate, createdAt)) DESC, id DESC`,
    [phoneId],
  ).catch(() => [] as any[]);
  return (rows || []).map((row: any) => ({
    ...row,
    metadata: safeJsonParse(row.metadata),
  }));
};


export const listPhoneInventoryEventsForPartnerProfileBatchFromRepo = async (
  phoneIds: number[],
): Promise<any[]> => {
  const ids = Array.from(new Set((phoneIds || []).map(Number).filter((id) => Number.isInteger(id) && id > 0)));
  if (!ids.length) return [];
  const placeholders = ids.map(() => "?").join(",");
  const rows = await allAsync(
    `SELECT * FROM phone_inventory_events
      WHERE phoneId IN (${placeholders})
      ORDER BY phoneId ASC, datetime(COALESCE(eventDate, createdAt)) DESC, id DESC`,
    ids,
  ).catch(() => [] as any[]);
  return (rows || []).map((row: any) => ({ ...row, metadata: safeJsonParse(row.metadata) }));
};
