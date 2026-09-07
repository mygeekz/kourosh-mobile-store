// Phone inventory history helpers extracted from legacyRuntime in Phase 1I.

import { normalizeMoney } from "../core/json";
import type { PhoneHistoryActor } from "../core/types";

export const resolvePhoneHistoryActor = (actor?: PhoneHistoryActor | null) => ({
  userId: actor?.userId ?? null,
  username: actor?.username ?? null,
  displayName: actor?.displayName ?? actor?.username ?? null,
});

export const resolveHistoryWindow = (filters?: {
  days?: number;
  startDate?: string;
  endDate?: string;
}) => {
  const safeDays =
    Number.isFinite(Number(filters?.days)) && Number(filters?.days) > 0
      ? Number(filters?.days)
      : 30;
  const startDate = String(filters?.startDate || "").trim();
  const endDate = String(filters?.endDate || "").trim();
  const hasCustomRange = !!(startDate || endDate);
  const sinceIso =
    startDate ||
    new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000).toISOString();
  const untilIso = endDate
    ? `${endDate}T23:59:59.999Z`
    : new Date().toISOString();
  return { safeDays, sinceIso, untilIso, hasCustomRange };
};

export const getPhoneHistoryEventClass = (
  row: any,
): "price" | "status" | "critical" | "audit" => {
  const hasStatusChange =
    row.oldStatus != null &&
    row.newStatus != null &&
    String(row.oldStatus) !== String(row.newStatus);
  const hasPriceChange =
    (normalizeMoney(row.oldPurchasePrice) !==
      normalizeMoney(row.newPurchasePrice) ||
      normalizeMoney(row.oldSalePrice) !== normalizeMoney(row.newSalePrice)) &&
    (row.oldPurchasePrice != null ||
      row.newPurchasePrice != null ||
      row.oldSalePrice != null ||
      row.newSalePrice != null);
  const isCritical =
    ["deleted", "returned", "sale_returned"].includes(
      String(row.eventType || ""),
    ) || ["rose", "amber"].includes(String(row.tone || ""));
  if (isCritical) return "critical";
  if (hasPriceChange) return "price";
  if (hasStatusChange) return "status";
  return "audit";
};
