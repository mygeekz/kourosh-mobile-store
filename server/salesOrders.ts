/* ------------------------------------------------------------------
   salesOrders.ts  –  CRUD فروش چند‌قلمی + دادهٔ فاکتور + کوئری‌های کمکی
-------------------------------------------------------------------*/
import moment from 'jalali-moment';
import {
  getDbInstance,
  runAsync,
  getAsync,
  allAsync,
  execAsync,
  addCustomerLedgerEntryInternal,
  snapshotSalesOrderProfitAllocations,
  updateSaleProfitSnapshotSourceStatus,
  resolvePhoneCostBasisAmount,
  syncPhoneCostBasisSnapshots,
} from './database';

import type {
  SalesOrderPayload,
  FrontendInvoiceData,
  BusinessDetails,
  Customer,
  InvoiceLineItem,
  InvoiceFinancialSummary,
} from '../types';

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
const toNum = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/* ============================
   ثبت یک سفارش فروش
=============================*/
export async function createSalesOrder(
  orderPayload: SalesOrderPayload
): Promise<{ orderId: number }> {
  await getDbInstance();

  const { customerId, paymentMethod, discount, tax, notes, items, transactionDate } = orderPayload;
  if (!items?.length) throw new Error('سبد خرید خالی است.');

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

    const { lastID: orderId } = await runAsync(
      `INSERT INTO sales_orders
        (customerId, paymentMethod, discount, tax, subtotal, grandTotal, transactionDate, notes)
       VALUES (?,?,?,?,?,?,?,?)`,
      [
        customerId ?? null,
        paymentMethod,
        cleanGlobalDiscount,
        Number(tax) || 0,
        subtotal,
        grandTotal,
        isoTransDate,
        notes || '',
      ]
    );
    console.log('🆕  createSalesOrder → orderId =', orderId);

    for (const it of items) {
      let defaultBuyPrice = 0;
      let buyPrice = Math.max(0, Number((it as any).buyPrice) || 0);

      if (it.itemType === 'phone') {
        const phone = await getAsync('SELECT status, purchasePrice, currentPurchasePrice FROM phones WHERE id = ?', [it.itemId]);
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
        await syncPhoneCostBasisSnapshots(Number(it.itemId), buyPrice);
      } else if (it.itemType === 'inventory') {
        const pr = await getAsync('SELECT stock_quantity, purchasePrice FROM products WHERE id=?', [it.itemId]);
        if (!pr || pr.stock_quantity < it.quantity)
          throw new Error(`موجودی کالای ${it.itemId} کافی نیست.`);
        defaultBuyPrice = Number(pr?.purchasePrice) || 0;
        buyPrice = buyPrice || defaultBuyPrice;
        await runAsync(
          'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?',
          [it.quantity, it.itemId]
        );
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

    if (customerId && grandTotal > 0) {
      const isCredit = paymentMethod === 'credit';
      await addCustomerLedgerEntryInternal(
        customerId,
        isCredit ? `فاکتور فروش اعتباری شماره ${orderId}` : `فاکتور فروش نقدی شماره ${orderId}`,
        grandTotal,
        isCredit ? 0 : grandTotal,
        new Date().toISOString(),
        { referenceType: 'sales_order_charge', referenceId: Number(orderId) }
      );
    }

    await snapshotSalesOrderProfitAllocations(Number(orderId), isoTransDate);

    await execAsync('COMMIT;');
    return { orderId };
  } catch (err) {
    await execAsync('ROLLBACK;');
    console.error('❌  createSalesOrder failed →', err);
    throw err;
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

  const order = await getAsync(
    `SELECT so.*, c.fullName AS fullName, c.phoneNumber AS phoneNumber
       FROM sales_orders so
       LEFT JOIN customers c ON c.id = so.customerId
      WHERE so.id = ?`,
    [orderId]
  );
  console.log('   ↳ order row =', order);
  if (!order) return null;

  const items = await allAsync(
    'SELECT * FROM sales_order_items WHERE orderId = ? ORDER BY id',
    [orderId]
  );
  console.log('   ↳ items len =', items.length);

  const settingsRows = await allAsync('SELECT key,value FROM settings');
  const settings = Object.fromEntries(settingsRows.map((r: any) => [r.key, r.value]));

  const businessDetails: BusinessDetails = {
    name:          settings.store_name           ?? 'فروشگاه',
    addressLine1:  settings.store_address_line1  ?? '',
    cityStateZip:  settings.store_city_state_zip ?? '',
    phone:         settings.store_phone          ?? '',
    email:         settings.store_email          ?? '',
    logoUrl:       settings.store_logo_path ? `/uploads/${settings.store_logo_path}` : undefined,
  };

  const customerDetails: Partial<Customer> | null = order.customerId
    ? { id: order.customerId, fullName: order.fullName, phoneNumber: order.phoneNumber }
    : null;

  const lineItems: any[] = items.map((it: any) => ({
    itemType: it.itemType,
    itemId: it.itemId,
    id: it.id,
    description: it.description,
    quantity: it.quantity,
    unitPrice: it.unitPrice,
    discountPerItem: it.discountPerItem,
    totalPrice: it.totalPrice,
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
      status: (order as any).status || 'active',
      canceledAt: (order as any).canceledAt || null,
      cancelReason: (order as any).cancelReason || null,
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
export async function getAllSalesOrdersFromDb() {
  await getDbInstance();
  return await allAsync(`
    SELECT so.id,
           so.transactionDate,
           so.grandTotal,
           so.status,
           so.canceledAt,
           COALESCE(c.fullName,'مهمان') AS customerName
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
    const rows = await allAsync(
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
export async function getSalesOrdersBetween(startISO: string, endISO: string) {
  await getDbInstance();
  const start = toISOEn(startISO);
  const end   = toISOEn(endISO);

  return await allAsync(
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
export async function deleteSalesOrder(orderId: number): Promise<{ deleted: true } | null> {
  await getDbInstance();
  await execAsync('BEGIN;');
  try {
    const order = await getAsync(`SELECT * FROM sales_orders WHERE id = ?`, [orderId]);
    if (!order) { await execAsync('ROLLBACK;'); return null; }

    const items: Array<{ itemType: string; itemId: number; quantity: number }> =
      await allAsync(`SELECT itemType, itemId, quantity FROM sales_order_items WHERE orderId = ?`, [orderId]);

    // برگشت موجودی‌ها
    for (const it of items) {
      if (it.itemType === 'phone') {
        // For phone returns from a regular sale, do not reset the original purchase date. Instead, mark the
        // status as "مرجوعی", clear the saleDate and record the return date in Jalali (Shamsi) format. This
        // aligns with the requirement to keep purchaseDate unchanged while adding a new returnDate.
        const returnDateShamsi = moment().locale('fa').format('jYYYY/jMM/jDD');
        await runAsync(
          `UPDATE phones SET status='مرجوعی', saleDate=NULL, returnDate=? WHERE id=?`,
          [returnDateShamsi, it.itemId]
        );
      } else if (it.itemType === 'inventory') {
        await runAsync(`UPDATE products SET stock_quantity = stock_quantity + ? WHERE id=?`, [it.quantity, it.itemId]);
      }
    }

    // اصلاح دفتر مشتری در فروش اعتباری
    if (order.customerId && order.paymentMethod === 'credit' && Number(order.grandTotal) > 0) {
      await addCustomerLedgerEntryInternal(
        Number(order.customerId),
        `ابطال فاکتور فروش شماره ${orderId}`,
        0,                                // بدهکار
        Number(order.grandTotal),         // بستانکار (برگشت بدهی)
        new Date().toISOString()
      );
    }

    await updateSaleProfitSnapshotSourceStatus('sales_order', orderId, 'deleted');

    // حذف آیتم‌ها و خود فاکتور
    await runAsync(`DELETE FROM sales_order_items WHERE orderId=?`, [orderId]);
    await runAsync(`DELETE FROM sales_orders      WHERE id=?`,     [orderId]);

    await execAsync('COMMIT;');
    return { deleted: true };
  } catch (err) {
    await execAsync('ROLLBACK;');
    throw err;
  }
}




// =====================================================
// P0: Cancel Invoice (non-destructive) + Returns/Refunds
// =====================================================

export interface CancelSalesOrderPayload {
  reason?: string;
}

export async function cancelSalesOrder(orderId: number, payload?: CancelSalesOrderPayload): Promise<{ canceled: true } | null> {
  await getDbInstance();
  await execAsync('BEGIN;');
  try {
    const order = await getAsync(`SELECT * FROM sales_orders WHERE id = ?`, [orderId]);
    if (!order) { await execAsync('ROLLBACK;'); return null; }
    if (String(order.status || 'active') === 'canceled') { await execAsync('ROLLBACK;'); return { canceled: true }; }

    const items: Array<{ itemType: string; itemId: number; quantity: number }> =
      await allAsync(`SELECT itemType, itemId, quantity FROM sales_order_items WHERE orderId = ?`, [orderId]);

    // برگشت موجودی‌ها (مثل حذف، اما بدون پاک کردن رکورد فاکتور)
    for (const it of items) {
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
        `ابطال فاکتور فروش شماره ${orderId}`,
        0,                                // بدهکار
        Number(order.grandTotal),         // بستانکار (برگشت بدهی)
        new Date().toISOString()
      );
    }

    await runAsync(
      `UPDATE sales_orders SET status='canceled', canceledAt=?, cancelReason=? WHERE id=?`,
      [new Date().toISOString(), payload?.reason || null, orderId]
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

export async function createSalesReturn(orderId: number, payload: SalesReturnPayload) {
  await getDbInstance();
  if (!payload?.items?.length) throw new Error('لیست اقلام مرجوعی خالی است.');
  const refundAmount = Number(payload.refundAmount || 0);
  if (!Number.isFinite(refundAmount) || refundAmount < 0) throw new Error('مبلغ برگشتی نامعتبر است.');

  await execAsync('BEGIN;');
  try {
    const order = await getAsync(`SELECT * FROM sales_orders WHERE id = ?`, [orderId]);
    if (!order) throw new Error('فاکتور یافت نشد.');
    if (String(order.status || 'active') === 'canceled') throw new Error('این فاکتور قبلاً باطل شده است.');

    // Build a map of sold quantities by (itemType,itemId)
    const soldRows: Array<{ itemType: string; itemId: number; quantity: number; description: string; unitPrice: number }> =
      await allAsync(`SELECT itemType, itemId, quantity, description, unitPrice FROM sales_order_items WHERE orderId = ?`, [orderId]);
    const soldMap = new Map<string, any>();
    for (const r of soldRows) soldMap.set(`${r.itemType}:${r.itemId}`, r);

    // Calculate already returned quantities
    const returnedRows: Array<{ itemType: string; itemId: number; returnedQty: number }> =
      await allAsync(
        `SELECT sri.itemType as itemType, sri.itemId as itemId, SUM(sri.quantity) as returnedQty
           FROM sales_return_items sri
           JOIN sales_returns sr ON sr.id = sri.returnId
          WHERE sr.orderId = ?
       GROUP BY sri.itemType, sri.itemId`,
        [orderId]
      );
    const returnedMap = new Map<string, number>();
    for (const r of returnedRows) returnedMap.set(`${r.itemType}:${r.itemId}`, Number(r.returnedQty) || 0);

    // Validate items
    for (const it of payload.items) {
      const k = `${it.itemType}:${it.itemId}`;
      const sold = soldMap.get(k);
      if (!sold) throw new Error('آیتم انتخاب‌شده در این فاکتور وجود ندارد.');
      const soldQty = Number(sold.quantity) || 0;
      const already = returnedMap.get(k) || 0;
      const reqQty = Math.floor(Number(it.quantity));
      if (!Number.isFinite(reqQty) || reqQty <= 0) throw new Error('تعداد مرجوعی نامعتبر است.');
      if (reqQty > (soldQty - already)) throw new Error('تعداد مرجوعی بیشتر از مقدار قابل مرجوعی است.');
    }

    // Create return header
    const ins = await runAsync(
      `INSERT INTO sales_returns (orderId, customerId, type, reason, notes, refundAmount, createdAt, createdByUserId)
       VALUES (?,?,?,?,?,?,?,?)`,
      [
        orderId,
        order.customerId || null,
        payload.type || 'refund',
        payload.reason || null,
        payload.notes || null,
        refundAmount,
        new Date().toISOString(),
        payload.createdByUserId ?? null,
      ]
    );
    const returnId = ins.lastID as number;

    // Apply inventory changes + insert return items
    for (const it of payload.items) {
      const k = `${it.itemType}:${it.itemId}`;
      const sold = soldMap.get(k);
      const desc = it.description || sold.description || '';
      const unit = Number(it.unitPrice ?? sold.unitPrice ?? 0) || 0;
      const qty = Math.floor(Number(it.quantity));
      const lineTotal = unit * qty;

      await runAsync(
        `INSERT INTO sales_return_items (returnId, itemType, itemId, description, quantity, unitPrice, lineTotal)
         VALUES (?,?,?,?,?,?,?)`,
        [returnId, it.itemType, it.itemId, desc, qty, unit, lineTotal]
      );

      if (it.itemType === 'phone') {
        const returnDateShamsi = moment().locale('fa').format('jYYYY/jMM/jDD');
        await runAsync(
          `UPDATE phones SET status='مرجوعی', saleDate=NULL, returnDate=? WHERE id=?`,
          [returnDateShamsi, it.itemId]
        );
      } else if (it.itemType === 'inventory') {
        await runAsync(`UPDATE products SET stock_quantity = stock_quantity + ?, saleCount = CASE WHEN saleCount >= ? THEN saleCount - ? ELSE 0 END WHERE id=?`, [qty, qty, qty, it.itemId]);
      } else {
        // service: no stock change
      }
    }

    // Customer ledger entry for refund (both cash & credit if customerId exists)
    if (order.customerId && refundAmount > 0) {
      await addCustomerLedgerEntryInternal(
        Number(order.customerId),
        `مرجوعی فاکتور شماره ${orderId} (کد مرجوعی ${returnId})`,
        0,
        refundAmount,
        new Date().toISOString(),
        { referenceType: 'sales_order_refund', referenceId: Number(orderId) }
      );
    }

    await execAsync('COMMIT;');

    return await getAsync(`SELECT * FROM sales_returns WHERE id = ?`, [returnId]);
  } catch (err) {
    await execAsync('ROLLBACK;');
    throw err;
  }
}

export async function getSalesReturnsForOrder(orderId: number) {
  await getDbInstance();
  const returns = await allAsync(
    `SELECT * FROM sales_returns WHERE orderId = ? ORDER BY datetime(createdAt) DESC, id DESC`,
    [orderId]
  );
  for (const r of returns) {
    const items = await allAsync(
      `SELECT * FROM sales_return_items WHERE returnId = ? ORDER BY id ASC`,
      [r.id]
    );
    (r as any).items = items;
  }
  return returns;
}

/* GLOBAL DISCOUNT PATCH
   Apply a single invoice-level discount instead of per-item discounts.
   Ensure any future math uses: grandTotal = subtotal - (payload.discount_total || 0) + tax
*/
