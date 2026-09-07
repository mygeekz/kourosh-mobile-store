/* ------------------------------------------------------------------
   salesOrders.ts  –  CRUD فروش چند‌قلمی + دادهٔ فاکتور + کوئری‌های کمکی
-------------------------------------------------------------------*/
import moment from 'jalali-moment';
import {
  getDbInstance,
  runAsync,
  execAsync,
  addCustomerLedgerEntryInternal,
  snapshotSalesOrderProfitAllocations,
  updateSaleProfitSnapshotSourceStatus,
  resolvePhoneCostBasisAmount,
} from './database';
import { allTypedAsync, getTypedAsync } from './db/query';

import type {
  SalesOrderPayload,
  InvoiceData as FrontendInvoiceData,
  BusinessDetails,
  Customer,
  InvoiceLineItem,
  InvoiceFinancialSummary,
} from '../types';

interface SalesOrderInvoiceRow {
  id: number;
  customerId: number | null;
  paymentMethod: "cash" | "credit";
  discount: number;
  tax: number;
  subtotal: number;
  grandTotal: number;
  transactionDate: string;
  notes: string | null;
  status: string;
  canceledAt: string | null;
  cancelReason: string | null;
  fullName: string;
  phoneNumber: string | null;
}

interface SalesOrderItemRow {
  id: number;
  orderId: number;
  itemType: string;
  itemId: number;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPerItem: number;
  totalPrice: number;
  buyPrice: number;
}

interface SellablePhoneMutationRow {
  status: string;
  purchasePrice: number | null;
  currentPurchasePrice: number | null;
}

interface SellableInventoryMutationRow {
  stock_quantity: number;
  purchasePrice: number | null;
}

interface SalesOrderCancellationRow {
  customerId: number | null;
  paymentMethod: string;
  grandTotal: number;
  status: string | null;
}

interface SalesOrderInventoryRestoreItemRow {
  itemType: string;
  itemId: number;
  quantity: number;
}

interface SalesReturnOrderRow {
  customerId: number | null;
  status: string | null;
  grandTotal: number;
}

interface SalesReturnSoldItemRow {
  itemType: string;
  itemId: number;
  quantity: number;
  description: string | null;
  unitPrice: number | null;
  totalPrice: number | null;
}

interface SalesReturnAggregateRow {
  itemType: string;
  itemId: number;
  returnedQty: number | null;
}

export interface SalesReturnRow {
  id: number;
  orderId: number;
  customerId: number | null;
  type: string;
  reason: string | null;
  notes: string | null;
  refundAmount: number;
  createdAt: string;
  createdByUserId: number | null;
}

export interface SalesReturnItemRow {
  id: number;
  returnId: number;
  itemType: string;
  itemId: number;
  description: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface SalesReturnWithItems extends SalesReturnRow {
  items: SalesReturnItemRow[];
}

interface SettingRow {
  key: string;
  value: string | null;
}

export interface SalesOrderListRow {
  id: number;
  transactionDate: string;
  grandTotal: number;
  paymentMethod: "cash" | "credit";
  customerId: number | null;
  status: string;
  canceledAt: string | null;
  cancelReason: string | null;
  customerName: string;
  customerFullName: string | null;
}

interface SalesOrderInvoiceChunkRow {
  saleId: number;
  description: string;
  quantity: number;
}

export interface SalesOrderDateTotalRow {
  id: number;
  transactionDate: string;
  grandTotal: number;
}

// Extracted helper to unify calculation logic between different parts of the app
import { calculateSalesSummary } from './calculations';

/* ============================
   ابزارک‌های تاریخ/عدد امن برای آگرگیشن
=============================*/
// تبدیل هر تاریخ ورودی به ISO انگلیسی 'YYYY-MM-DD'
const toISOEn = (d: string | Date): string => {
  const m =
    typeof d === 'string'
      ? moment(d, [moment.ISO_8601, 'YYYY-MM-DD', 'YYYY/MM/DD', 'jYYYY/jMM/jDD'], true)
      : moment(d);
  // مهم: ارقام و locale انگلیسی
  return m.locale('en').format('YYYY-MM-DD');
};
// اطمینان از عدد معتبر
const toNum = (value: unknown) =>
  Number.isFinite(Number(value)) ? Number(value) : 0;

/* ============================
   ثبت یک سفارش فروش
=============================*/
const assertSalesOrderDateIsOpen = async (isoDate: string): Promise<void> => {
  const row = await getTypedAsync<{ periodStart: string; periodEnd: string }>(
    `SELECT apl.periodStart, apl.periodEnd
       FROM accounting_period_locks apl
      WHERE apl.status = 'closed'
        AND COALESCE((
          SELECT apse.action
            FROM accounting_period_state_events apse
           WHERE apse.lockId = apl.id
           ORDER BY apse.id DESC
           LIMIT 1
        ), 'closed') = 'closed'
        AND date(?) BETWEEN date(apl.periodStart) AND date(apl.periodEnd)
      ORDER BY apl.id DESC
      LIMIT 1`,
    [isoDate],
  ).catch(() => null);
  if (row) {
    throw new Error(
      `دوره حسابداری این تاریخ بسته است (${row.periodStart} تا ${row.periodEnd}). برای ثبت فروش، ابتدا دوره را بازگشایی کنید.`,
    );
  }
};

export async function createSalesOrder(
  orderPayload: SalesOrderPayload
): Promise<{ orderId: number }> {
  await getDbInstance();

  const { customerId, paymentMethod, discount, tax, notes, items, transactionDate } = orderPayload;
  const normalizedPaymentMethod = paymentMethod === 'credit' ? 'credit' : 'cash';
  if (!items?.length) throw new Error('سبد خرید خالی است.');
  if (normalizedPaymentMethod === 'credit' && (!Number(customerId) || Number(customerId) <= 0)) {
    throw new Error('برای فروش اعتباری انتخاب مشتری الزامی است.');
  }

  let mutationStage = 'آماده‌سازی فروش';
  await execAsync('BEGIN TRANSACTION;');
  try {
    // Use unified helper to compute totals
    const { subtotal, itemsDiscount, taxableAmount, taxAmount, grandTotal } =
      calculateSalesSummary(
        items.map(it => ({ quantity: it.quantity, unitPrice: it.unitPrice, discountPerItem: it.discountPerItem })),
        Number(discount) || 0,
        Number(tax) || 0
      );

    // تاریخ ذخیره‌سازی در DB همیشه ISO انگلیسی
    const cleanGlobalDiscount = Math.max(0, Math.min(Number(discount) || 0, Math.max(0, subtotal - itemsDiscount)));

    const isoTransDate   = transactionDate ? toISOEn(transactionDate) : moment().locale('en').format('YYYY-MM-DD');

    mutationStage = 'بررسی باز بودن دوره حسابداری';
    await assertSalesOrderDateIsOpen(isoTransDate);

    mutationStage = 'ثبت سند اصلی فروش';
    const { lastID: orderId } = await runAsync(
      `INSERT INTO sales_orders
        (customerId, paymentMethod, discount, tax, subtotal, grandTotal, transactionDate, notes)
       VALUES (?,?,?,?,?,?,?,?)`,
      [
        customerId ?? null,
        normalizedPaymentMethod,
        cleanGlobalDiscount,
        Number(tax) || 0,
        subtotal,
        grandTotal,
        isoTransDate,
        notes || '',
      ]
    );
    console.log('🆕  createSalesOrder → orderId =', orderId);

    mutationStage = 'ثبت اقلام و به‌روزرسانی موجودی';
    for (const it of items) {
      let defaultBuyPrice = 0;
      let buyPrice = Math.max(0, Number(it.buyPrice) || 0);

      if (it.itemType === 'phone') {
        const phone = await getTypedAsync<SellablePhoneMutationRow>(
          'SELECT status, purchasePrice, currentPurchasePrice FROM phones WHERE id = ?',
          [it.itemId],
        );
        if (!phone || (phone.status !== 'موجود در انبار' && phone.status !== 'مرجوعی' && phone.status !== 'مرجوعی اقساطی'))
          throw new Error(`گوشی ${it.itemId} برای فروش موجود نیست.`);

        defaultBuyPrice = resolvePhoneCostBasisAmount(phone);
        // اگر قیمت خرید روز برای گوشی ثبت شده باشد، مبنای فروش/سود همان است؛ حتی اگر buyPrice قدیمی در payload آمده باشد.
        buyPrice = resolvePhoneCostBasisAmount(phone, buyPrice);

        // قیمت خرید روز، snapshot حسابداری فروش است؛ هنگام فروش روی خود گوشی هم ثبت می‌شود
        // تا گزارش اشخاص/شرکا و فروش‌های بعدی روی قیمت اولیه قفل نمانند.
        await runAsync(
          `UPDATE phones
              SET status='فروخته شده',
                  saleDate=?,
                  returnDate=NULL,
                  currentPurchasePrice=?,
                  currentPurchasePriceUpdatedAt=(strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc'))
            WHERE id=?`,
          [isoTransDate, buyPrice, it.itemId]
        );
      } else if (it.itemType === 'inventory') {
        const pr = await getTypedAsync<SellableInventoryMutationRow>(
          'SELECT stock_quantity, purchasePrice FROM products WHERE id=?',
          [it.itemId],
        );
        if (!pr || pr.stock_quantity < it.quantity)
          throw new Error(`موجودی کالای ${it.itemId} کافی نیست.`);
        defaultBuyPrice = Number(pr?.purchasePrice) || 0;
        buyPrice = buyPrice || defaultBuyPrice;
        const stockUpdate = await runAsync(
          'UPDATE products SET stock_quantity = stock_quantity - ?, saleCount = saleCount + ? WHERE id = ? AND stock_quantity >= ?',
          [it.quantity, it.quantity, it.itemId, it.quantity]
        );
        if (stockUpdate.changes !== 1) {
          throw new Error(`موجودی کالای ${it.itemId} در زمان ثبت تغییر کرده است؛ موجودی را تازه‌سازی و دوباره تلاش کنید.`);
        }
      }

      const lineSubtotal = (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0);
      const lineDiscount = Math.max(0, Math.min(Number(it.discountPerItem) || 0, lineSubtotal));
      const lineTotal = Math.max(0, lineSubtotal - lineDiscount);
      buyPrice = Math.max(0, buyPrice || defaultBuyPrice || 0);
      await runAsync(
        `INSERT INTO sales_order_items
          (orderId,itemType,itemId,description,quantity,unitPrice,discountPerItem,buyPrice,totalPrice)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [
          orderId,
          it.itemType,
          it.itemId,
          it.description,
          it.quantity,
          it.unitPrice,
          lineDiscount,
          buyPrice,
          lineTotal,
        ]
      );
    }

    mutationStage = 'ثبت دفتر حساب مشتری';
    if (customerId && grandTotal > 0) {
      const isCredit = normalizedPaymentMethod === 'credit';
      await addCustomerLedgerEntryInternal(
        customerId,
        isCredit ? `فاکتور فروش اعتباری شماره ${orderId}` : `فاکتور فروش نقدی شماره ${orderId}`,
        grandTotal,
        isCredit ? 0 : grandTotal,
        new Date().toISOString(),
        { referenceType: 'sales_order_charge', referenceId: Number(orderId) }
      );
    }

    mutationStage = 'ثبت اسنپ‌شات سود و مالکیت';
    await snapshotSalesOrderProfitAllocations(Number(orderId), isoTransDate);

    mutationStage = 'نهایی‌سازی تراکنش';
    await execAsync('COMMIT;');
    return { orderId };
  } catch (err) {
    await execAsync('ROLLBACK;').catch(() => undefined);
    const rawMessage = err instanceof Error ? err.message : String(err || 'خطای ناشناخته');
    const detailedMessage = rawMessage.startsWith('ثبت فروش در مرحله')
      ? rawMessage
      : `ثبت فروش در مرحله «${mutationStage}» ناموفق بود: ${rawMessage}`;
    console.error('❌  createSalesOrder failed →', { mutationStage, error: err });
    throw new Error(detailedMessage);
  }
}

/* ============================
   فاکتور کامل برای چاپ
=============================*/
export async function getSalesOrderForInvoice(
  orderId: number
): Promise<FrontendInvoiceData | null> {
  await getDbInstance();
  console.log('➡️  getSalesOrderForInvoice  id =', orderId);

  const order = await getTypedAsync<SalesOrderInvoiceRow>(
    `SELECT so.*, c.fullName AS fullName, c.phoneNumber AS phoneNumber
       FROM sales_orders so
       LEFT JOIN customers c ON c.id = so.customerId
      WHERE so.id = ?`,
    [orderId]
  );
  console.log('   ↳ order row =', order);
  if (!order) return null;

  const items = await allTypedAsync<SalesOrderItemRow>(
    'SELECT * FROM sales_order_items WHERE orderId = ? ORDER BY id',
    [orderId]
  );
  console.log('   ↳ items len =', items.length);

  const settingsRows = await allTypedAsync<SettingRow>(
    'SELECT key,value FROM settings',
  );
  const settings: Record<string, string | null> = Object.fromEntries(
    settingsRows.map((row) => [row.key, row.value]),
  );

  const businessDetails: BusinessDetails = {
    name:          settings.store_name           ?? 'فروشگاه',
    addressLine1:  settings.store_address_line1  ?? '',
    cityStateZip:  settings.store_city_state_zip ?? '',
    phone:         settings.store_phone          ?? '',
    email:         settings.store_email          ?? '',
    logoUrl:       settings.store_logo_path ? `/uploads/${settings.store_logo_path}` : '/kourosh-logo.svg',
  };

  const customerDetails: Partial<Customer> | null = order.customerId
    ? { id: order.customerId, fullName: order.fullName, phoneNumber: order.phoneNumber }
    : null;

  const lineItems: Array<
    InvoiceLineItem & { itemType: string; itemId: number }
  > = items.map((item) => ({
    itemType: item.itemType,
    itemId: item.itemId,
    id: item.id,
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    discountPerItem: item.discountPerItem,
    totalPrice: item.totalPrice,
  }));

  const itemsDiscount = lineItems.reduce((s, li) => s + (li.discountPerItem || 0), 0);

  const financialSummary: InvoiceFinancialSummary = {
    subtotal:        order.subtotal,
    itemsDiscount,
    globalDiscount:  order.discount,
    taxableAmount:   order.subtotal - itemsDiscount - order.discount,
    taxPercentage:   order.tax,
    taxAmount:       order.grandTotal - (order.subtotal - itemsDiscount - order.discount),
    grandTotal:      order.grandTotal,
  };

  const invoice: FrontendInvoiceData = {
    businessDetails,
    customerDetails,
    invoiceMetadata: {
      invoiceNumber: String(order.id),
      status: order.status || 'active',
      canceledAt: order.canceledAt || null,
      cancelReason: order.cancelReason || null,
      paymentMethod: order.paymentMethod === 'credit' ? 'credit' : 'cash',
      paymentMethodLabel: order.paymentMethod === 'credit' ? 'فروش اعتباری' : 'فروش نقدی',
      // نمایش شمسی فقط برای UI؛ دادهٔ خام ISO در خود order باقی می‌ماند
      transactionDate: moment(order.transactionDate, 'YYYY-MM-DD')
        .locale('fa')
        .format('jYYYY/jMM/jDD'),
    },
    lineItems,
    financialSummary,
    notes: order.notes,
  };

  console.log('   ↳ invoice done.');
  return invoice;
}

/* ============================
   لیست سفارش‌ها برای جدول
=============================*/
export async function getAllSalesOrdersFromDb(): Promise<SalesOrderListRow[]> {
  await getDbInstance();
  return await allTypedAsync<SalesOrderListRow>(`
    SELECT so.id,
           so.transactionDate,
           so.grandTotal,
           so.paymentMethod,
           so.customerId,
           so.status,
           so.canceledAt,
           so.cancelReason,
           COALESCE(c.fullName,'مهمان') AS customerName,
           c.fullName AS customerFullName
      FROM sales_orders so
      LEFT JOIN customers c ON c.id = so.customerId
     ORDER BY so.id DESC
  `);
}

/* ============================
   گرفتن آیتم‌های هر فاکتور (batched)
=============================*/
export async function getOrdersInvoiceChunks(ids: number[]) {
  if (!ids?.length) return [];

  const result: Array<{ saleId: number; items: Array<{ description: string; quantity: number }> }> = [];
  const chunkSize = 50;

  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const ph = chunk.map(() => '?').join(',');
    const rows = await allTypedAsync<SalesOrderInvoiceChunkRow>(
      `SELECT soi.orderId as saleId, soi.description, soi.quantity
         FROM sales_order_items soi
        WHERE soi.orderId IN (${ph})
        ORDER BY soi.id`,
      chunk
    );

    const bySale: Record<number, Array<{ description: string; quantity: number }>> = {};
    for (const r of rows) {
      (bySale[r.saleId] ||= []).push({ description: r.description, quantity: r.quantity });
    }
    for (const sid of Object.keys(bySale)) {
      result.push({ saleId: Number(sid), items: bySale[Number(sid)] });
    }
  }

  return result;
}

/* ============================
   آگرگیشن امن برای داشبورد
=============================*/
// فقط سفارش‌های یک بازهٔ مشخص را برمی‌گرداند (برای استفاده مستقیم در داشبورد)
export async function getSalesOrdersBetween(
  startISO: string,
  endISO: string,
): Promise<SalesOrderDateTotalRow[]> {
  await getDbInstance();
  const start = toISOEn(startISO);
  const end   = toISOEn(endISO);

  return await allTypedAsync<SalesOrderDateTotalRow>(
    `SELECT id, transactionDate, grandTotal
       FROM sales_orders
      WHERE status != 'canceled' AND transactionDate >= ? AND transactionDate <= ?
      ORDER BY transactionDate ASC, id ASC`,
    [start, end]
  );
}

// مجموع فروش روزانه در بازه (کلیدها ۱۰۰٪ ISO انگلیسی)
export async function getSalesTotalsByDate(startISO: string, endISO: string) {
  const rows: Array<{ transactionDate: string; grandTotal: number }> =
    await getSalesOrdersBetween(startISO, endISO);

  const map: Record<string, number> = {};
  for (const r of rows) {
    const k = toISOEn(r.transactionDate);
    map[k] = (map[k] || 0) + toNum(r.grandTotal);
  }
  return map;
}

/* ============================
   حذف کامل فاکتور + برگشت موجودی + اصلاح دفتر مشتری
=============================*/
export async function deleteSalesOrder(
  orderId: number,
  payload?: { reason?: string },
): Promise<{ deleted: true; preserved: true; canceled: true } | null> {
  // v341: financial sales are never physically deleted. A delete request is
  // converted to the same non-destructive cancellation/reversal workflow so
  // the source document, line items and audit path remain available forever.
  const reason = String(payload?.reason || `درخواست حذف فاکتور #${orderId}`).trim();
  const result = await cancelSalesOrder(orderId, { reason });
  return result ? { deleted: true, preserved: true, canceled: true } : null;
}


// =====================================================
// P0: Cancel Invoice (non-destructive) + Returns/Refunds
// =====================================================

export interface CancelSalesOrderPayload {
  reason?: string;
}

export async function cancelSalesOrder(orderId: number, payload?: CancelSalesOrderPayload): Promise<{ canceled: true } | null> {
  await getDbInstance();
  const normalizedReason = String(payload?.reason ?? '').trim();
  if (!normalizedReason) {
    throw new Error('ثبت دلیل ابطال فاکتور الزامی است.');
  }

  await execAsync('BEGIN;');
  try {
    const order = await getTypedAsync<SalesOrderCancellationRow>(
      `SELECT * FROM sales_orders WHERE id = ?`,
      [orderId],
    );
    if (!order) { await execAsync('ROLLBACK;'); return null; }
    if (String(order.status || 'active') === 'canceled') { await execAsync('ROLLBACK;'); return { canceled: true }; }

    const items = await allTypedAsync<SalesOrderInventoryRestoreItemRow>(
      `SELECT soi.itemType, soi.itemId,
              MAX(0, SUM(soi.quantity) - COALESCE((
                SELECT SUM(sri.quantity)
                  FROM sales_return_items sri
                  JOIN sales_returns sr ON sr.id = sri.returnId
                 WHERE sr.orderId = soi.orderId
                   AND sri.itemType = soi.itemType
                   AND sri.itemId = soi.itemId
              ), 0)) AS quantity
         FROM sales_order_items soi
        WHERE soi.orderId = ?
        GROUP BY soi.itemType, soi.itemId`,
      [orderId],
    );

    // برگشت فقط مقدار خالصِ هنوز مرجوع‌نشده
    for (const it of items) {
      if (Number(it.quantity || 0) <= 0) continue;
      if (it.itemType === 'phone') {
        const returnDateShamsi = moment().locale('fa').format('jYYYY/jMM/jDD');
        await runAsync(
          `UPDATE phones SET status='مرجوعی', saleDate=NULL, returnDate=? WHERE id=?`,
          [returnDateShamsi, it.itemId]
        );
      } else if (it.itemType === 'inventory') {
        await runAsync(`UPDATE products SET stock_quantity = stock_quantity + ?, saleCount = CASE WHEN saleCount >= ? THEN saleCount - ? ELSE 0 END WHERE id=?`, [it.quantity, it.quantity, it.quantity, it.itemId]);
      }
    }

    // اصلاح دفتر مشتری در فروش اعتباری
    if (order.customerId && order.paymentMethod === 'credit' && Number(order.grandTotal) > 0) {
      await addCustomerLedgerEntryInternal(
        Number(order.customerId),
        `ابطال فاکتور فروش شماره ${orderId} | دلیل: ${normalizedReason}`,
        0,                                // بدهکار
        Number(order.grandTotal),         // بستانکار (برگشت بدهی)
        new Date().toISOString(),
        { referenceType: 'sales_order_cancel_reversal', referenceId: Number(orderId) }
      );
    }

    await runAsync(
      `UPDATE sales_orders SET status='canceled', canceledAt=?, cancelReason=? WHERE id=?`,
      [new Date().toISOString(), normalizedReason, orderId]
    );

    await updateSaleProfitSnapshotSourceStatus('sales_order', orderId, 'canceled');

    await execAsync('COMMIT;');
    return { canceled: true };
  } catch (err) {
    await execAsync('ROLLBACK;');
    throw err;
  }
}

export interface SalesReturnItemPayload {
  itemType: 'phone' | 'inventory' | 'service';
  itemId: number;
  quantity: number;
  description?: string;
  unitPrice?: number;
}

export interface SalesReturnPayload {
  type?: 'refund' | 'exchange';
  refundAmount?: number;
  reason?: string;
  notes?: string;
  items: SalesReturnItemPayload[];
  createdByUserId?: number;
}

export async function createSalesReturn(
  orderId: number,
  payload: SalesReturnPayload,
): Promise<SalesReturnRow> {
  await getDbInstance();
  if (!payload?.items?.length) throw new Error('لیست اقلام مرجوعی خالی است.');

  const normalizedReason = String(payload.reason || '').trim();
  if (!normalizedReason) throw new Error('ثبت دلیل مرجوعی الزامی است.');

  await execAsync('BEGIN;');
  try {
    const order = await getTypedAsync<SalesReturnOrderRow>(
      `SELECT customerId, status, grandTotal FROM sales_orders WHERE id = ?`,
      [orderId],
    );
    if (!order) throw new Error('فاکتور یافت نشد.');
    if (String(order.status || 'active') === 'canceled') throw new Error('این فاکتور قبلاً باطل شده است.');

    // The invoice is immutable. Price/description/refund amount are always derived from
    // the persisted sale rows; the client may only choose item identity + quantity.
    const soldRows = await allTypedAsync<SalesReturnSoldItemRow>(
      `SELECT itemType, itemId, quantity, description, unitPrice, totalPrice
         FROM sales_order_items
        WHERE orderId = ?`,
      [orderId],
    );
    const soldMap = new Map<string, SalesReturnSoldItemRow>();
    for (const row of soldRows) soldMap.set(`${row.itemType}:${row.itemId}`, row);

    const returnedRows = await allTypedAsync<SalesReturnAggregateRow>(
      `SELECT sri.itemType as itemType, sri.itemId as itemId, SUM(sri.quantity) as returnedQty
         FROM sales_return_items sri
         JOIN sales_returns sr ON sr.id = sri.returnId
        WHERE sr.orderId = ?
        GROUP BY sri.itemType, sri.itemId`,
      [orderId],
    );
    const returnedMap = new Map<string, number>();
    for (const row of returnedRows) {
      returnedMap.set(`${row.itemType}:${row.itemId}`, Number(row.returnedQty) || 0);
    }

    // Merge duplicate client rows before validation so quantities cannot bypass the
    // remaining-quantity guard by repeating the same item key.
    const requestedMap = new Map<string, { itemType: 'phone' | 'inventory' | 'service'; itemId: number; quantity: number }>();
    for (const item of payload.items) {
      const key = `${item.itemType}:${item.itemId}`;
      const quantity = Math.floor(Number(item.quantity));
      if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('تعداد مرجوعی نامعتبر است.');
      const current = requestedMap.get(key);
      if (current) current.quantity += quantity;
      else requestedMap.set(key, { itemType: item.itemType, itemId: item.itemId, quantity });
    }

    let selectedItemsNetTotal = 0;
    let returnsAllRemainingItems = true;
    for (const sold of soldRows) {
      const key = `${sold.itemType}:${sold.itemId}`;
      const soldQty = Math.max(0, Number(sold.quantity) || 0);
      const alreadyReturnedQty = Math.max(0, returnedMap.get(key) || 0);
      const remainingQty = Math.max(0, soldQty - alreadyReturnedQty);
      const requestedQty = requestedMap.get(key)?.quantity || 0;
      if (requestedQty !== remainingQty) returnsAllRemainingItems = false;
    }

    for (const request of requestedMap.values()) {
      const key = `${request.itemType}:${request.itemId}`;
      const sold = soldMap.get(key);
      if (!sold) throw new Error('آیتم انتخاب‌شده در این فاکتور وجود ندارد.');
      const soldQty = Math.max(0, Number(sold.quantity) || 0);
      const alreadyReturnedQty = Math.max(0, returnedMap.get(key) || 0);
      const remainingQty = Math.max(0, soldQty - alreadyReturnedQty);
      if (request.quantity > remainingQty) {
        throw new Error('تعداد مرجوعی بیشتر از مقدار قابل مرجوعی است.');
      }
      const persistedLineNet = Math.max(0, Number(sold.totalPrice) || 0);
      const persistedNetUnit = soldQty > 0 ? persistedLineNet / soldQty : 0;
      selectedItemsNetTotal += persistedNetUnit * request.quantity;
    }

    const invoiceItemsNetTotal = soldRows.reduce(
      (sum, row) => sum + Math.max(0, Number(row.totalPrice) || 0),
      0,
    );
    const previousRefundRow = await getTypedAsync<{ refunded: number | null }>(
      `SELECT COALESCE(SUM(refundAmount), 0) AS refunded FROM sales_returns WHERE orderId = ?`,
      [orderId],
    );
    const invoiceGrandTotal = Math.max(0, Number(order.grandTotal) || 0);
    const remainingInvoiceRefund = Math.max(
      0,
      invoiceGrandTotal - Math.max(0, Number(previousRefundRow?.refunded) || 0),
    );
    const invoiceAdjustmentRatio = invoiceItemsNetTotal > 0
      ? invoiceGrandTotal / invoiceItemsNetTotal
      : 1;
    const proportionalRefund = Math.max(0, Math.round(selectedItemsNetTotal * invoiceAdjustmentRatio));
    const computedRefundAmount = returnsAllRemainingItems
      ? remainingInvoiceRefund
      : Math.min(remainingInvoiceRefund, proportionalRefund);

    const insertResult = await runAsync(
      `INSERT INTO sales_returns (orderId, customerId, type, reason, notes, refundAmount, createdAt, createdByUserId)
       VALUES (?,?,?,?,?,?,?,?)`,
      [
        orderId,
        order.customerId || null,
        payload.type || 'refund',
        normalizedReason,
        payload.notes || null,
        computedRefundAmount,
        new Date().toISOString(),
        payload.createdByUserId ?? null,
      ],
    );
    const returnId = Number(insertResult.lastID);

    for (const request of requestedMap.values()) {
      const key = `${request.itemType}:${request.itemId}`;
      const sold = soldMap.get(key);
      if (!sold) throw new Error('آیتم انتخاب‌شده در این فاکتور وجود ندارد.');
      const soldQty = Math.max(0, Number(sold.quantity) || 0);
      const persistedLineNet = Math.max(0, Number(sold.totalPrice) || 0);
      const persistedNetUnit = soldQty > 0 ? persistedLineNet / soldQty : 0;
      const description = String(sold.description || '');
      const unitPrice = Math.max(0, Number(sold.unitPrice) || 0);
      const lineTotal = Math.max(0, Math.round(persistedNetUnit * request.quantity));

      await runAsync(
        `INSERT INTO sales_return_items (returnId, itemType, itemId, description, quantity, unitPrice, lineTotal)
         VALUES (?,?,?,?,?,?,?)`,
        [
          returnId,
          request.itemType,
          request.itemId,
          description,
          request.quantity,
          unitPrice,
          lineTotal,
        ],
      );

      if (request.itemType === 'phone') {
        const returnDateShamsi = moment().locale('fa').format('jYYYY/jMM/jDD');
        await runAsync(
          `UPDATE phones SET status='مرجوعی', saleDate=NULL, returnDate=? WHERE id=?`,
          [returnDateShamsi, request.itemId],
        );
      } else if (request.itemType === 'inventory') {
        await runAsync(
          `UPDATE products SET stock_quantity = stock_quantity + ?, saleCount = CASE WHEN saleCount >= ? THEN saleCount - ? ELSE 0 END WHERE id=?`,
          [request.quantity, request.quantity, request.quantity, request.itemId],
        );
      }
    }

    if (order.customerId && computedRefundAmount > 0) {
      await addCustomerLedgerEntryInternal(
        Number(order.customerId),
        `مرجوعی فاکتور شماره ${orderId} (کد مرجوعی ${returnId})`,
        0,
        computedRefundAmount,
        new Date().toISOString(),
        { referenceType: 'sales_order_refund', referenceId: Number(orderId) },
      );
    }

    await execAsync('COMMIT;');

    return (await getTypedAsync<SalesReturnRow>(
      `SELECT * FROM sales_returns WHERE id = ?`,
      [returnId],
    ))!;
  } catch (error: unknown) {
    await execAsync('ROLLBACK;');
    throw error;
  }
}

export async function getSalesReturnsForOrder(
  orderId: number,
): Promise<SalesReturnWithItems[]> {
  await getDbInstance();
  const returns = await allTypedAsync<SalesReturnRow>(
    `SELECT * FROM sales_returns WHERE orderId = ? ORDER BY datetime(createdAt) DESC, id DESC`,
    [orderId],
  );
  const result: SalesReturnWithItems[] = [];
  for (const salesReturn of returns) {
    const items = await allTypedAsync<SalesReturnItemRow>(
      `SELECT * FROM sales_return_items WHERE returnId = ? ORDER BY id ASC`,
      [salesReturn.id],
    );
    result.push({ ...salesReturn, items });
  }
  return result;
}

/* GLOBAL DISCOUNT PATCH
   Apply a single invoice-level discount instead of per-item discounts.
   Ensure any future math uses: grandTotal = subtotal - (payload.discount_total || 0) + tax
*/
