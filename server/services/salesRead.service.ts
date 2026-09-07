import {
  fetchInvoiceDataForSaleIds,
  fetchLegacyInvoice,
  fetchLegacySalesRows,
  fetchProfitPerSaleMap,
  fetchSalesOrderInvoice,
  fetchSalesOrderRows,
  fetchSellableItems,
} from '../repositories/salesRead.repo';

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readValue = (value: unknown, key: string): unknown =>
  isRecord(value) ? value[key] : undefined;

const readFirstValue = (value: unknown, keys: readonly string[]): unknown => {
  for (const key of keys) {
    const candidate = readValue(value, key);
    if (candidate !== undefined && candidate !== null) return candidate;
  }
  return undefined;
};

const readNum = (value: unknown, keys: readonly string[], def = 0): number => {
  for (const key of keys) {
    const candidate = Number(readValue(value, key));
    if (Number.isFinite(candidate)) return candidate;
  }
  return def;
};

const readNestedValue = (
  value: unknown,
  parentKey: string,
  childKeys: readonly string[],
): unknown => readFirstValue(readValue(value, parentKey), childKeys);

const getItemsFromInvoice = (invoice: unknown): unknown[] => {
  if (!isRecord(invoice)) return [];

  for (const key of [
    'items',
    'orderItems',
    'lines',
    'details',
    'itemsData',
    'items_list',
    'invoiceItems',
    'rows',
  ]) {
    const candidate = invoice[key];
    if (Array.isArray(candidate)) return candidate;
  }

  const itemsByType = invoice.itemsByType;
  if (isRecord(itemsByType)) {
    return Object.values(itemsByType)
      .flatMap((value) => (Array.isArray(value) ? value : [value]))
      .filter(Boolean);
  }

  return [];
};

const nameFromItem = (item: unknown): string => {
  const direct = readFirstValue(item, [
    'itemName',
    'name',
    'title',
    'productName',
    'serviceName',
    'model',
    'description',
    'label',
  ]);
  if (direct && String(direct).trim()) return String(direct).trim();

  const nested =
    readNestedValue(item, 'product', ['name', 'title']) ??
    readNestedValue(item, 'service', ['name', 'title']) ??
    readNestedValue(item, 'phone', ['model']) ??
    readNestedValue(item, 'device', ['model']) ??
    readNestedValue(item, 'goods', ['name']);
  if (nested && String(nested).trim()) return String(nested).trim();
  return 'کالا';
};

const summarize = (items: unknown[]): string => {
  const parts = items.slice(0, 2).map((item) => {
    const quantity = readNum(
      item,
      ['quantity', 'qty', 'count', 'quantitySold', 'qty_sold'],
      1,
    );
    return `${nameFromItem(item)} × ${quantity}`;
  });
  const more = Math.max(items.length - 2, 0);
  return parts.join('، ') + (more ? ` و ${more} قلم دیگر` : '');
};

const computeTotal = (invoice: unknown, items: unknown[]): number => {
  const top = readNum(invoice, [
    'grandTotal',
    'total',
    'totalAmount',
    'finalAmount',
    'sum',
    'invoiceTotal',
  ]);
  if (top) return top;

  let total = 0;
  for (const item of items) {
    const quantity = readNum(
      item,
      ['quantity', 'qty', 'count', 'quantitySold', 'qty_sold'],
      1,
    );
    const lineTotal = readNum(
      item,
      ['totalPrice', 'lineTotal', 'total', 'line_total', 'sum'],
      Number.NaN,
    );
    if (Number.isFinite(lineTotal)) {
      total += lineTotal;
      continue;
    }
    const unitPrice = readNum(
      item,
      ['unitPrice', 'unit_price', 'price', 'salePrice', 'unitSalePrice'],
      0,
    );
    total += unitPrice * quantity;
  }
  return total;
};

const calcInvoiceProfit = (items: unknown[]): number => {
  if (!items.length) return 0;
  let revenue = 0;
  let cost = 0;

  for (const item of items) {
    const quantity = readNum(
      item,
      ['quantity', 'qty', 'count', 'quantitySold', 'qty_sold'],
      1,
    );
    const unitSale = readNum(item, [
      'unitPrice',
      'unit_price',
      'price',
      'salePrice',
      'unitSalePrice',
    ]);
    const lineSale = readNum(
      item,
      ['totalPrice', 'lineTotal', 'total', 'line_total', 'sum'],
      unitSale * quantity,
    );
    const unitCost = readNum(
      item,
      [
        'purchasePrice',
        'buyPrice',
        'cost',
        'purchase_price',
        'unitCost',
        'unit_cost',
      ],
      0,
    );
    revenue += lineSale;
    cost += unitCost * quantity;
  }

  return revenue - cost;
};

const buildProfitMapFromInvoices = async (
  saleIds: number[],
): Promise<Map<number, number>> => {
  const map = new Map<number, number>();
  if (!saleIds.length) return map;

  const raw: unknown = await fetchInvoiceDataForSaleIds(saleIds);
  if (!Array.isArray(raw) || !raw.length) return map;

  const firstRow = raw[0];
  if (isRecord(firstRow) && ('items' in firstRow || 'orderItems' in firstRow)) {
    for (const invoice of raw) {
      const saleId = Number(
        readFirstValue(invoice, ['saleId', 'sale_id', 'id']),
      );
      const items = getItemsFromInvoice(invoice);
      if (Number.isFinite(saleId)) map.set(saleId, calcInvoiceProfit(items));
    }
    return map;
  }

  const bySale: Record<number, unknown[]> = {};
  for (const row of raw) {
    const saleId = Number(readFirstValue(row, ['saleId', 'sale_id', 'id']));
    if (!Number.isFinite(saleId)) continue;
    (bySale[saleId] ||= []).push(row);
  }
  Object.entries(bySale).forEach(([saleId, items]) => {
    map.set(Number(saleId), calcInvoiceProfit(items));
  });
  return map;
};

const invoiceMetadataValue = (invoice: unknown, key: string): unknown =>
  readValue(readValue(invoice, 'invoiceMetadata'), key);

export async function listSellableItems(filters?: { q?: string; limit?: number; offset?: number }) {
  return fetchSellableItems(filters);
}

export async function listSalesRows() {
  const legacyRows = await fetchLegacySalesRows();
  const newRows = await fetchSalesOrderRows().catch(() => []);

  const byId = new Map<number, UnknownRecord>();
  for (const row of [...legacyRows, ...newRows]) {
    const record: UnknownRecord = { ...row };
    const saleId = Number(
      readFirstValue(record, ['id', 'saleId', 'sale_id']),
    );
    if (!Number.isFinite(saleId) || saleId <= 0) continue;
    byId.set(saleId, { ...(byId.get(saleId) ?? {}), ...record });
  }
  const ids = Array.from(byId.keys()).sort((a, b) => b - a);

  let profitMap = new Map<number, number>();
  try {
    profitMap = await fetchProfitPerSaleMap(ids);
  } catch {
    profitMap = await buildProfitMapFromInvoices(ids);
  }

  const rows: UnknownRecord[] = [];
  for (const id of ids) {
    const base = byId.get(id) ?? {};
    let description = String(
      readFirstValue(base, ['itemName', 'description']) ?? '',
    );
    let grandTotal: number | null = Number(
      readFirstValue(base, ['grandTotal', 'total']),
    );
    if (!Number.isFinite(grandTotal)) grandTotal = null;

    let invoice: unknown = null;
    try {
      invoice = await fetchSalesOrderInvoice(id);
    } catch {
      invoice = null;
    }
    if (!invoice) {
      try {
        invoice = await fetchLegacyInvoice(id);
      } catch {
        invoice = null;
      }
    }

    if (invoice) {
      const lineItems = readValue(invoice, 'lineItems');
      if (Array.isArray(lineItems)) {
        if (!description) description = summarize(lineItems);
        if (grandTotal == null) {
          const invoiceGrandTotal = Number(
            readValue(readValue(invoice, 'financialSummary'), 'grandTotal'),
          );
          if (Number.isFinite(invoiceGrandTotal)) grandTotal = invoiceGrandTotal;
        }
      } else {
        const items = getItemsFromInvoice(invoice);
        if (!description) description = summarize(items);
        if (grandTotal == null) grandTotal = computeTotal(invoice, items);
      }
    }

    const customerId = readValue(base, 'customerId');
    const customerName = String(
      readFirstValue(base, ['customerFullName', 'customerName', 'fullName']) ??
        (customerId ? 'مشتری' : 'مهمان'),
    );
    const invoicePaymentMethod = String(
      invoiceMetadataValue(invoice, 'paymentMethod') ?? '',
    ).trim();
    const cancelReason = String(
      readValue(base, 'cancelReason') ??
        invoiceMetadataValue(invoice, 'cancelReason') ??
        '',
    ).trim();

    rows.push({
      ...base,
      id,
      description: description || '—',
      grandTotal,
      profit: profitMap.get(id) ?? 0,
      customerName,
      customerFullName: customerName,
      paymentMethod:
        readValue(base, 'paymentMethod') ||
        invoicePaymentMethod ||
        readValue(base, 'purchaseType') ||
        'cash',
      cancelReason: cancelReason || null,
      canceledAt:
        readValue(base, 'canceledAt') ??
        invoiceMetadataValue(invoice, 'canceledAt') ??
        null,
      status:
        readValue(base, 'status') ??
        invoiceMetadataValue(invoice, 'status') ??
        'active',
    });
  }

  return rows;
}
