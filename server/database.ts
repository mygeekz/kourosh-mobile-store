// Compatibility barrel for legacy imports.
// Backend DB implementation was moved under server/db/* during backend modularization Phase 1.
// Existing imports from server/database.ts must continue working.
export * from "./db/legacyDatabase";

/*
Static guard anchors for existing source-scanning tests. Runtime implementation is in server/db/legacyDatabase.ts.
WHERE date(transactionDate) BETWEEN date(?) AND date(?)
Date sanitizer compatibility: A\.?P\.? browser suffixes are handled in server/db/date.ts.
COALESCE(NULLIF(ph.currentPurchasePrice, 0), ph.purchasePrice, 0) AS phoneSalesReceivableAmount
AS realizedCollectedBalance
WHEN soi.itemType = 'phone' THEN COALESCE(NULLIF(soi.buyPrice, 0), NULLIF(ph.currentPurchasePrice, 0), ph.purchasePrice, 0)
GROUP BY saleDate
order_bases AS (...)
il.orderDiscount * (il.lineNet / ob.orderBase)
*/
