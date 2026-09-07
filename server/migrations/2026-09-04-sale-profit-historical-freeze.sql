-- v338: freeze sale-profit accounting facts at the time of sale.
-- Existing rows are baselined once and marked as legacy_baseline; they are never
-- silently re-derived from today's asset price/supplier/ownership metadata again.
ALTER TABLE sale_profit_snapshots ADD COLUMN supplierIdAtSale INTEGER;
ALTER TABLE sale_profit_snapshots ADD COLUMN supplierNameAtSale TEXT;
ALTER TABLE sale_profit_snapshots ADD COLUMN ownershipSharesJson TEXT NOT NULL DEFAULT '[]';
ALTER TABLE sale_profit_snapshots ADD COLUMN profitShareSharesJson TEXT NOT NULL DEFAULT '[]';
ALTER TABLE sale_profit_snapshots ADD COLUMN snapshotVersion INTEGER NOT NULL DEFAULT 1;
ALTER TABLE sale_profit_snapshots ADD COLUMN snapshotState TEXT NOT NULL DEFAULT 'legacy_baseline';
ALTER TABLE sale_profit_snapshots ADD COLUMN sourceCostBasis TEXT;
ALTER TABLE sale_profit_snapshots ADD COLUMN frozenAt TEXT;

CREATE TABLE IF NOT EXISTS sale_profit_capital_allocations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  snapshotId INTEGER NOT NULL,
  storePartnerId INTEGER NOT NULL,
  sharePercent REAL NOT NULL DEFAULT 0,
  amount REAL NOT NULL DEFAULT 0,
  sourceMethod TEXT NOT NULL DEFAULT 'frozen_at_sale',
  sourceStatus TEXT NOT NULL DEFAULT 'active',
  createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
  updatedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
  UNIQUE(snapshotId, storePartnerId),
  FOREIGN KEY (snapshotId) REFERENCES sale_profit_snapshots(id) ON DELETE CASCADE,
  FOREIGN KEY (storePartnerId) REFERENCES store_partners(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_sale_profit_capital_allocations_snapshot ON sale_profit_capital_allocations(snapshotId);
CREATE INDEX IF NOT EXISTS idx_sale_profit_capital_allocations_partner ON sale_profit_capital_allocations(storePartnerId);

-- Freeze the best evidence already present for pre-v338 snapshots. This is
-- explicitly labelled legacy_baseline because it may not prove the original
-- historical supplier/profile, but future edits can no longer rewrite it.
UPDATE sale_profit_snapshots
   SET supplierIdAtSale = COALESCE(
     supplierIdAtSale,
     CASE
       WHEN itemType='phone' THEN COALESCE(
         (SELECT pos.sourceLegacyPartnerId FROM phone_ownership_snapshots pos WHERE pos.phoneId=sale_profit_snapshots.itemId LIMIT 1),
         (SELECT ph.supplierId FROM phones ph WHERE ph.id=sale_profit_snapshots.itemId LIMIT 1)
       )
       WHEN itemType='inventory' THEN COALESCE(
         (SELECT prs.sourceLegacyPartnerId FROM product_ownership_snapshots prs WHERE prs.productId=sale_profit_snapshots.itemId LIMIT 1),
         (SELECT pr.supplierId FROM products pr WHERE pr.id=sale_profit_snapshots.itemId LIMIT 1)
       )
       ELSE NULL
     END
   ),
       snapshotVersion = COALESCE(NULLIF(snapshotVersion,0),1),
       snapshotState = COALESCE(NULLIF(TRIM(snapshotState),''),'legacy_baseline'),
       sourceCostBasis = COALESCE(NULLIF(TRIM(sourceCostBasis),''),'legacy_existing_snapshot'),
       frozenAt = COALESCE(NULLIF(TRIM(frozenAt),''), createdAt, strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc'));

UPDATE sale_profit_snapshots
   SET supplierNameAtSale = COALESCE(
     supplierNameAtSale,
     (SELECT p.partnerName FROM partners p WHERE p.id=sale_profit_snapshots.supplierIdAtSale LIMIT 1)
   )
 WHERE supplierIdAtSale IS NOT NULL;

INSERT OR IGNORE INTO sale_profit_capital_allocations
  (snapshotId, storePartnerId, sharePercent, amount, sourceMethod, sourceStatus)
SELECT sps.id,
       opi.storePartnerId,
       opi.sharePercent,
       COALESCE(sps.initialCostAmount,0) * (COALESCE(opi.sharePercent,0) / 100.0),
       'legacy_profile_baseline_v338',
       sps.sourceStatus
  FROM sale_profit_snapshots sps
  JOIN ownership_profile_items opi ON opi.ownershipProfileId=sps.ownershipProfileId
 WHERE NOT EXISTS (
   SELECT 1 FROM sale_profit_capital_allocations spca WHERE spca.snapshotId=sps.id
 );
