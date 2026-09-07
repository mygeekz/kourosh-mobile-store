import moment from "jalali-moment";
import { allAsync, execAsync, getAsync, runAsync } from "../db/query";

export const recordInventoryInDb = async (payload: {
  productId: number;
  entryType: "in" | "out";
  quantity: number;
  unitCost?: number;
  refType?: string;
  refId?: number;
  entryDate: string;
}) => {
  const q = Number(payload.quantity || 0);
  if (!Number.isFinite(q) || q <= 0) throw new Error("quantity نامعتبر");
  const uc = Number(payload.unitCost || 0);
  await runAsync(
    `INSERT INTO inventory_ledger (productId, entryType, quantity, unitCost, refType, refId, entryDate)
     VALUES (?,?,?,?,?,?,?)`,
    [
      payload.productId,
      payload.entryType,
      q,
      payload.entryType === "in" ? uc : 0,
      payload.refType ?? null,
      payload.refId ?? null,
      payload.entryDate,
    ],
  );
};

export const computeFifoCogsForProduct = async (
  productId: number,
  soldQty: number,
) => {
  let remaining = Number(soldQty || 0);
  if (remaining <= 0) return { cogs: 0, consumed: [] as any[] };

  const ins = await allAsync(
    `SELECT id, quantity, unitCost FROM inventory_ledger
      WHERE productId = ? AND entryType = 'in'
      ORDER BY entryDate ASC, id ASC`,
    [productId],
  );

  const outs = await allAsync(
    `SELECT quantity FROM inventory_ledger
      WHERE productId = ? AND entryType = 'out'
      ORDER BY entryDate ASC, id ASC`,
    [productId],
  );
  const totalOut = (outs || []).reduce(
    (s: any, r: any) => s + Number(r.quantity || 0),
    0,
  );

  // available by FIFO layers
  let consumedOut = totalOut;
  let cogs = 0;
  const used: any[] = [];

  for (const row of ins || []) {
    let layerQty = Number(row.quantity || 0);
    if (consumedOut > 0) {
      const take = Math.min(layerQty, consumedOut);
      layerQty -= take;
      consumedOut -= take;
    }
    if (layerQty <= 0) continue;

    const takeForSale = Math.min(layerQty, remaining);
    if (takeForSale > 0) {
      cogs += takeForSale * Number(row.unitCost || 0);
      used.push({ inId: row.id, qty: takeForSale, unitCost: row.unitCost });
      remaining -= takeForSale;
    }
    if (remaining <= 0) break;
  }

  return { cogs, consumed: used, shortfall: remaining };
};

export const getInventoryFifoAgingForAllProducts = async () => {

  const products = await allAsync(
    `SELECT id, name FROM products ORDER BY name ASC`,
    [],
  );
  const outRows = await allAsync(
    `SELECT productId, SUM(quantity) as outQty
       FROM inventory_ledger
      WHERE entryType = 'out'
      GROUP BY productId`,
    [],
  );
  const outMap: Record<string, number> = {};
  (outRows || []).forEach((r: any) => {
    outMap[String(r.productId)] = Number(r.outQty || 0);
  });

  const inRows = await allAsync(
    `SELECT productId, entryDate, quantity, unitCost
       FROM inventory_ledger
      WHERE entryType = 'in'
      ORDER BY productId ASC, entryDate ASC, id ASC`,
    [],
  );

  const layersByProduct: Record<string, any[]> = {};
  for (const r of inRows || []) {
    const pid = String(r.productId);
    if (!layersByProduct[pid]) layersByProduct[pid] = [];
    layersByProduct[pid].push({
      entryDate: String(r.entryDate),
      remaining: Number(r.quantity || 0),
      unitCost: Number(r.unitCost || 0),
    });
  }

  for (const pid of Object.keys(layersByProduct)) {
    let remainingOut = Number(outMap[pid] || 0);
    const layers = layersByProduct[pid];
    for (const L of layers) {
      if (remainingOut <= 0) break;
      const take = Math.min(L.remaining, remainingOut);
      L.remaining -= take;
      remainingOut -= take;
    }
    layersByProduct[pid] = layers.filter((l) => l.remaining > 0.0000001);
  }

  const now = moment();
  const result: any[] = [];
  for (const p of products || []) {
    const pid = String(p.id);
    const layers = layersByProduct[pid] || [];
    const totalQty = layers.reduce((s, l) => s + Number(l.remaining || 0), 0);
    const totalValue = layers.reduce(
      (s, l) => s + Number(l.remaining || 0) * Number(l.unitCost || 0),
      0,
    );
    const avgCost = totalQty > 0 ? totalValue / totalQty : 0;

    const aging = layers.map((l) => {
      const days = Math.max(0, now.diff(moment(l.entryDate), "days"));
      return {
        entryDate: l.entryDate,
        remainingQty: l.remaining,
        unitCost: l.unitCost,
        value: Number(l.remaining) * Number(l.unitCost),
        ageDays: days,
      };
    });

    result.push({
      productId: p.id,
      name: p.name,
      onHandQty: totalQty,
      onHandValue: totalValue,
      avgCost,
      layers: aging,
    });
  }

  return result;
};

export const getMonthlyProfitByProductFifo = async (monthsBack: number = 6) => {
  const m = Math.max(1, Math.min(24, Math.floor(Number(monthsBack || 6))));
  const startMonth = moment()
    .startOf("month")
    .subtract(m - 1, "month")
    .format("YYYY-MM");

  const sales = await allAsync(
    `SELECT itemId as productId, itemName, SUM(quantity) as qty, SUM(totalPrice) as revenue,
            substr(transactionDate, 1, 7) as month
       FROM sales_transactions
      WHERE itemType = 'inventory'
        AND substr(transactionDate, 1, 7) >= ?
      GROUP BY itemId, itemName, substr(transactionDate, 1, 7)
      ORDER BY month ASC`,
    [startMonth],
  );

  const rows: any[] = [];
  for (const r of sales || []) {
    const pid = Number(r.productId);
    const qty = Number(r.qty || 0);
    const revenue = Number(r.revenue || 0);
    const month = String(r.month);

    const end = moment(month + "-01")
      .endOf("month")
      .toDate()
      .toISOString();
    const prevEnd = moment(month + "-01")
      .subtract(1, "month")
      .endOf("month")
      .toDate()
      .toISOString();

    const soldToEnd = await getAsync(
      `SELECT SUM(quantity) as q FROM inventory_ledger
        WHERE productId = ? AND entryType = 'out' AND entryDate <= ?`,
      [pid, end],
    );
    const soldToPrev = await getAsync(
      `SELECT SUM(quantity) as q FROM inventory_ledger
        WHERE productId = ? AND entryType = 'out' AND entryDate <= ?`,
      [pid, prevEnd],
    );

    const qtyToEnd = Number(soldToEnd?.q || 0);
    const qtyToPrev = Number(soldToPrev?.q || 0);

    const fifoEnd = await computeFifoCogsForProduct(pid, qtyToEnd);
    const fifoPrev = await computeFifoCogsForProduct(pid, qtyToPrev);

    const cogs = Number(fifoEnd.cogs || 0) - Number(fifoPrev.cogs || 0);
    const profit = revenue - cogs;
    const marginPct = revenue > 0 ? (profit / revenue) * 100 : 0;

    rows.push({
      month,
      productId: pid,
      name: String(r.itemName),
      qty,
      revenue,
      cogs,
      profit,
      marginPct,
    });
  }

  return rows;
};

export const createInventoryAdjustmentInDb = async (payload: {
  productId: number;
  direction: "in" | "out";
  quantity: number;
  unitCost?: number; // required for 'in'
  reason?: string;
  entryDate: string; // ISO
}) => {
  const pid = Number(payload.productId);
  const dir = payload.direction;
  const qty = Number(payload.quantity || 0);
  if (!pid) throw new Error("productId نامعتبر");
  if (dir !== "in" && dir !== "out") throw new Error("direction نامعتبر");
  if (!Number.isFinite(qty) || qty <= 0) throw new Error("quantity نامعتبر");
  const unitCost = Number(payload.unitCost || 0);
  if (dir === "in" && (!Number.isFinite(unitCost) || unitCost < 0))
    throw new Error("unitCost نامعتبر");
  const entryDate = String(payload.entryDate || "").trim();
  if (!entryDate) throw new Error("entryDate خالی است.");

  const product = await getAsync(
    `SELECT id, stock_quantity FROM products WHERE id = ?`,
    [pid],
  );
  if (!product) throw new Error("محصول یافت نشد.");
  if (dir === "out" && Number(product.stock_quantity || 0) < qty)
    throw new Error("موجودی برای تعدیل منفی کافی نیست.");

  await execAsync("BEGIN TRANSACTION;");
  try {
    const res = await runAsync(
      `INSERT INTO inventory_adjustments (productId, direction, quantity, unitCost, reason, entryDate)
       VALUES (?,?,?,?,?,?)`,
      [
        pid,
        dir,
        qty,
        dir === "in" ? unitCost : 0,
        payload.reason ?? null,
        entryDate,
      ],
    );

    // stock update
    if (dir === "in") {
      await runAsync(
        `UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?`,
        [qty, pid],
      );
    } else {
      await runAsync(
        `UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?`,
        [qty, pid],
      );
    }

    // ledger record
    await recordInventoryInDb({
      productId: pid,
      entryType: dir,
      quantity: qty,
      unitCost: dir === "in" ? unitCost : 0,
      refType: "adjust",
      refId: Number((res as any)?.lastID || 0),
      entryDate,
    });

    await execAsync("COMMIT;");
    return { id: Number((res as any)?.lastID || 0) };
  } catch (e) {
    await execAsync("ROLLBACK;");
    throw e;
  }
};

export const getInventoryAgingBucketsFromDb = async () => {
  const rows = await getInventoryFifoAgingForAllProducts();
  const buckets = { b0_30: 0, b31_90: 0, b91_180: 0, b181_plus: 0 };
  for (const r of rows || []) {
    for (const l of r.layers || []) {
      const v = Number(l.value || 0);
      const d = Number(l.ageDays || 0);
      if (d <= 30) buckets.b0_30 += v;
      else if (d <= 90) buckets.b31_90 += v;
      else if (d <= 180) buckets.b91_180 += v;
      else buckets.b181_plus += v;
    }
  }
  return buckets;
};

export const listSalesProfitRowsFifo = async (
  fromIso: string,
  toIso: string,
) => {

  const safeNum = (v: any) => Number(v || 0);

  const ins = await allAsync(
    `SELECT id, productId, entryDate, quantity, unitCost
       FROM inventory_ledger
      WHERE entryType = 'in' AND entryDate <= ?
      ORDER BY entryDate ASC, id ASC`,
    [toIso],
  );

  const saleRows = await allAsync(
    `WITH invoice_lines AS (
       SELECT
         so.id AS saleId,
         so.transactionDate AS date,
         soi.itemId AS productId,
         COALESCE(soi.description, p.name, '—') AS name,
         COALESCE(soi.quantity, 0) AS qty,
         MAX(0, COALESCE(soi.totalPrice, (COALESCE(soi.quantity, 0) * COALESCE(soi.unitPrice, 0)) - COALESCE(soi.discountPerItem, 0))) AS lineNet,
         COALESCE(so.discount, 0) AS orderDiscount,
         soi.id AS lineId
       FROM sales_orders so
       JOIN sales_order_items soi ON so.id = soi.orderId
       LEFT JOIN products p ON p.id = soi.itemId
       WHERE soi.itemType = 'inventory'
         AND (so.status IS NULL OR so.status = 'active')
         AND date(so.transactionDate) BETWEEN date(?) AND date(?)
     ),
     order_bases AS (
       SELECT saleId, SUM(lineNet) AS orderBase FROM invoice_lines GROUP BY saleId
     )
     SELECT saleId, date, productId, name, qty, revenue
       FROM (
         SELECT
           il.saleId,
           il.date,
           il.productId,
           il.name,
           il.qty,
           MAX(0, il.lineNet - CASE WHEN COALESCE(ob.orderBase, 0) > 0 THEN il.orderDiscount * (il.lineNet / ob.orderBase) ELSE 0 END) AS revenue,
           0 AS sourceSort,
           il.lineId AS lineId
         FROM invoice_lines il
         LEFT JOIN order_bases ob ON ob.saleId = il.saleId

         UNION ALL

         SELECT
           ins.id AS saleId,
           COALESCE(ins.saleDateISO, ins.dateCreated) AS date,
           isi.itemId AS productId,
           COALESCE(isi.description, p.name, '—') AS name,
           COALESCE(isi.quantity, 0) AS qty,
           COALESCE(isi.totalPrice, 0) AS revenue,
           1 AS sourceSort,
           isi.id AS lineId
         FROM installment_sales ins
         JOIN installment_sale_items isi ON ins.id = isi.saleId
         LEFT JOIN products p ON p.id = isi.itemId
         WHERE isi.itemType = 'inventory'
           AND COALESCE(ins.status,'active') = 'active'
           AND date(COALESCE(ins.saleDateISO, ins.dateCreated)) BETWEEN date(?) AND date(?)
       ) src
      ORDER BY date(date) ASC, sourceSort ASC, saleId ASC, lineId ASC`,
    [fromIso, toIso, fromIso, toIso],
  );

  if (!saleRows || saleRows.length === 0) return [];

  const layers: Record<string, any[]> = {};
  for (const r of ins || []) {
    const pid = String(r.productId);
    if (!layers[pid]) layers[pid] = [];
    layers[pid].push({
      remaining: safeNum(r.quantity),
      unitCost: safeNum(r.unitCost),
    });
  }

  const takeFromLayers = (pid: number, qty: number) => {
    const key = String(pid);
    const L = layers[key] || [];
    let remaining = safeNum(qty);
    let cogs = 0;
    for (const layer of L) {
      if (remaining <= 0) break;
      const take = Math.min(safeNum(layer.remaining), remaining);
      if (take > 0) {
        cogs += take * safeNum(layer.unitCost);
        layer.remaining -= take;
        remaining -= take;
      }
    }
    layers[key] = (layers[key] || []).filter(
      (x: any) => safeNum(x.remaining) > 0.0000001,
    );
    return cogs;
  };

  const useFallbackCost = !ins || ins.length === 0;
  const results: any[] = [];

  for (const s of saleRows as any[]) {
    const pid = safeNum(s.productId);
    const qty = safeNum(s.qty);
    const revenue = safeNum(s.revenue);

    let cogs = 0;
    if (!useFallbackCost) {
      cogs = takeFromLayers(pid, qty);
    }
    if (!cogs) {
      const pRow = await getAsync(
        `SELECT purchasePrice FROM products WHERE id = ?`,
        [pid],
      );
      cogs = qty * safeNum(pRow?.purchasePrice);
    }

    const profit = revenue - cogs;
    const marginPct = revenue > 0 ? (profit / revenue) * 100 : 0;

    results.push({
      saleId: safeNum(s.saleId),
      date: String(s.date || "").slice(0, 19),
      productId: pid,
      name: String(s.name || "—"),
      qty,
      revenue,
      cogs,
      profit,
      marginPct,
    });
  }

  return results.sort((a, b) => String(a.date).localeCompare(String(b.date)));
};

export const getRealProfitPerProductFifo = async (
  fromIso: string,
  toIso: string,
) => {

  // Normalize incoming dates
  const fromMoment = moment(String(fromIso));
  const toMoment = moment(String(toIso));
  // Use DATE-only boundaries because many tables store YYYY-MM-DD
  const fromDate = (
    fromMoment.isValid() ? fromMoment : moment().startOf("month")
  ).format("YYYY-MM-DD");
  const toDate = (toMoment.isValid() ? toMoment : moment().endOf("day")).format(
    "YYYY-MM-DD",
  );

  // Prefer the newer transaction tables if they have data (sales_transactions + inventory_ledger).
  // Some installs only populate sales_orders/sales_order_items and products.purchasePrice.
  const stCountRow = await getAsync(
    `SELECT COUNT(*) as c FROM sales_transactions`,
  );
  const ledgerCountRow = await getAsync(
    `SELECT COUNT(*) as c FROM inventory_ledger`,
  );
  const stCount = Number(stCountRow?.c || 0);
  const ledgerCount = Number(ledgerCountRow?.c || 0);

  // Helper to compute totals
  const safeNum = (v: any) => Number(v || 0);

  if (stCount > 0 && ledgerCount > 0) {
    // -----------------------------
    // FIFO via ledger (original path)
    // -----------------------------
    // Sales (inventory only) within period
    const sales = await allAsync(
      `SELECT itemId as productId, itemName as name,
              SUM(quantity) as qty,
              SUM(totalPrice) as revenue
         FROM sales_transactions
        WHERE itemType = 'inventory'
          AND date(transactionDate) >= date(?) AND date(transactionDate) <= date(?)
        GROUP BY itemId, itemName
        ORDER BY revenue DESC`,
      [fromDate, toDate],
    );

    const totalRevenueRow = await getAsync(
      `SELECT SUM(totalPrice) as total
         FROM sales_transactions
        WHERE itemType = 'inventory'
          AND date(transactionDate) >= date(?) AND date(transactionDate) <= date(?)`,
      [fromDate, toDate],
    );
    const totalRevenue = safeNum(totalRevenueRow?.total);

    const rows: any[] = [];
    for (const r of sales || []) {
      const pid = Number(r.productId);
      const qty = safeNum(r.qty);
      const revenue = safeNum(r.revenue);

      // FIFO COGS for period using ledger outs (date-only compare)
      const outToEnd = await getAsync(
        `SELECT SUM(quantity) as q
           FROM inventory_ledger
          WHERE productId = ?
            AND entryType = 'out'
            AND date(entryDate) <= date(?)`,
        [pid, toDate],
      );
      const outBeforeFrom = await getAsync(
        `SELECT SUM(quantity) as q
           FROM inventory_ledger
          WHERE productId = ?
            AND entryType = 'out'
            AND date(entryDate) < date(?)`,
        [pid, fromDate],
      );

      const qtyToEnd = safeNum(outToEnd?.q);
      const qtyToPrev = safeNum(outBeforeFrom?.q);

      const fifoEnd = await computeFifoCogsForProduct(pid, qtyToEnd);
      const fifoPrev = await computeFifoCogsForProduct(pid, qtyToPrev);

      const cogs = safeNum(fifoEnd?.cogs) - safeNum(fifoPrev?.cogs);

      const profit = revenue - cogs;
      const avgBuyPrice = qty > 0 ? cogs / qty : 0;
      const avgSellPrice = qty > 0 ? revenue / qty : 0;
      const shareOfRevenue =
        totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0;
      const marginPct = revenue > 0 ? (profit / revenue) * 100 : 0;

      rows.push({
        productId: pid,
        name: String(r.name),
        qty,
        revenue,
        cogs,
        profit,
        avgBuyPrice,
        avgSellPrice,
        shareOfRevenue,
        marginPct,
      });
    }

    return { from: fromDate, to: toDate, totalRevenue, items: rows };
  }

  // ---------------------------------
  // Fallback path: orders + product cost
  // ---------------------------------
  // Aggregate sales by product from sales_order_items + installment items.
  // تخفیف ردیفی و سهم تخفیف کلی فاکتور اینجا لحاظ می‌شود؛ وگرنه گزارش سود واقعی کالا در فاکتورهای چندقلمی بیش‌نمایی می‌شود.
  const sales = await allAsync(
    `WITH invoice_lines AS (
       SELECT
         so.id AS orderId,
         soi.itemId AS productId,
         COALESCE(soi.description, p.name, '—') AS name,
         COALESCE(soi.quantity, 0) AS qty,
         MAX(0, COALESCE(soi.totalPrice, (COALESCE(soi.quantity, 0) * COALESCE(soi.unitPrice, 0)) - COALESCE(soi.discountPerItem, 0))) AS lineNet,
         COALESCE(so.discount, 0) AS orderDiscount
       FROM sales_order_items soi
       JOIN sales_orders so ON so.id = soi.orderId
       LEFT JOIN products p ON p.id = soi.itemId
       WHERE soi.itemType = 'inventory'
         AND (so.status IS NULL OR so.status = 'active')
         AND date(so.transactionDate) >= date(?)
         AND date(so.transactionDate) <= date(?)
     ),
     order_bases AS (
       SELECT orderId, SUM(lineNet) AS orderBase FROM invoice_lines GROUP BY orderId
     ),
     normalized_sales AS (
       SELECT il.productId, il.name, il.qty,
              MAX(0, il.lineNet - CASE WHEN COALESCE(ob.orderBase, 0) > 0 THEN il.orderDiscount * (il.lineNet / ob.orderBase) ELSE 0 END) AS revenue
       FROM invoice_lines il
       LEFT JOIN order_bases ob ON ob.orderId = il.orderId
       UNION ALL
       SELECT
         isi.itemId as productId,
         COALESCE(isi.description, p.name, '—') as name,
         COALESCE(isi.quantity, 0) as qty,
         COALESCE(isi.totalPrice, 0) as revenue
       FROM installment_sale_items isi
       JOIN installment_sales ins ON ins.id = isi.saleId
       LEFT JOIN products p ON p.id = isi.itemId
       WHERE isi.itemType = 'inventory'
         AND COALESCE(ins.status,'active') = 'active'
         AND date(COALESCE(ins.saleDateISO, ins.dateCreated)) >= date(?)
         AND date(COALESCE(ins.saleDateISO, ins.dateCreated)) <= date(?)
     )
     SELECT productId, name, SUM(qty) as qty, SUM(revenue) as revenue
       FROM normalized_sales
      GROUP BY productId, name
      ORDER BY revenue DESC`,
    [fromDate, toDate, fromDate, toDate],
  );

  const totalRevenueRow = await getAsync(
    `WITH invoice_lines AS (
       SELECT
         so.id AS orderId,
         MAX(0, COALESCE(soi.totalPrice, (COALESCE(soi.quantity, 0) * COALESCE(soi.unitPrice, 0)) - COALESCE(soi.discountPerItem, 0))) AS lineNet,
         COALESCE(so.discount, 0) AS orderDiscount
       FROM sales_order_items soi
       JOIN sales_orders so ON so.id = soi.orderId
       WHERE soi.itemType = 'inventory'
         AND (so.status IS NULL OR so.status = 'active')
         AND date(so.transactionDate) >= date(?)
         AND date(so.transactionDate) <= date(?)
     ),
     order_bases AS (
       SELECT orderId, SUM(lineNet) AS orderBase FROM invoice_lines GROUP BY orderId
     ),
     normalized_sales AS (
       SELECT MAX(0, il.lineNet - CASE WHEN COALESCE(ob.orderBase, 0) > 0 THEN il.orderDiscount * (il.lineNet / ob.orderBase) ELSE 0 END) AS revenue
       FROM invoice_lines il
       LEFT JOIN order_bases ob ON ob.orderId = il.orderId
       UNION ALL
       SELECT COALESCE(isi.totalPrice, 0) as revenue
       FROM installment_sale_items isi
       JOIN installment_sales ins ON ins.id = isi.saleId
       WHERE isi.itemType = 'inventory'
         AND COALESCE(ins.status,'active') = 'active'
         AND date(COALESCE(ins.saleDateISO, ins.dateCreated)) >= date(?)
         AND date(COALESCE(ins.saleDateISO, ins.dateCreated)) <= date(?)
     )
     SELECT SUM(revenue) as total FROM normalized_sales`,
    [fromDate, toDate, fromDate, toDate],
  );
  const totalRevenue = safeNum(totalRevenueRow?.total);

  const rows: any[] = [];
  for (const r of sales || []) {
    const pid = Number(r.productId);
    const qty = safeNum(r.qty);
    const revenue = safeNum(r.revenue);

    // Use products.purchasePrice as cost baseline if available
    const pRow = await getAsync(
      `SELECT purchasePrice as buyPrice
         FROM products
        WHERE id = ?`,
      [pid],
    );
    const buyPrice = safeNum(pRow?.buyPrice);
    const cogs = qty * buyPrice;

    const profit = revenue - cogs;
    const avgBuyPrice = qty > 0 ? buyPrice : 0;
    const avgSellPrice = qty > 0 ? revenue / qty : 0;
    const shareOfRevenue =
      totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0;
    const marginPct = revenue > 0 ? (profit / revenue) * 100 : 0;

    rows.push({
      productId: pid,
      name: String(r.name),
      qty,
      revenue,
      cogs,
      profit,
      avgBuyPrice,
      avgSellPrice,
      shareOfRevenue,
      marginPct,
    });
  }

  return { from: fromDate, to: toDate, totalRevenue, items: rows };
};

