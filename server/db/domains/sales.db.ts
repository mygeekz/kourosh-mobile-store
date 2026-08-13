import moment from "jalali-moment";
import { getDbInstance } from "../core/runtimeBindings";
import {
  allAsync,
  allTypedAsync,
  execAsync,
  getAsync,
  getTypedAsync,
  runAsync,
  type SqliteBindValue,
} from "../query";
import { resolvePhoneCostBasisAmount, syncPhoneCostBasisSnapshots } from "../phoneCostBasis";
import type {
  InvoiceData as FrontendInvoiceData,
  InvoiceFinancialSummary,
  InvoiceLineItem,
} from "../../../types";
import { addCustomerLedgerEntryInternal } from "./customers.db";
import { getAllSettingsAsObject } from "./settings.db";
import { purgeProfitSnapshotsForSource, updateSaleProfitSnapshotSourceStatus, persistSaleProfitSnapshotItem, snapshotInstallmentSaleProfitAllocations, buildSaleProfitSnapshotResponse } from "./profitSnapshots.db";
import { safeJsonStringify, safeJsonParse, normalizeMoney } from "../core/json";

import type {
  ProductPayload,
  UpdateProductPayload,
  PhoneEntryPayload,
  PhoneEntryUpdatePayload,
  PhoneHistoryActor,
  PhoneInventoryEventPayload,
  SaleDataPayload,
  CustomerPayload,
  LedgerEntryPayload,
  PartnerPayload,
  OldMobilePhonePayload,
  CheckStatus,
  InstallmentPaymentStatus,
  InstallmentCheckInfo,
  InstallmentSalePayload,
  UserUpdatePayload,
  UserForDb,
  RfmItem,
  CohortRow,
  LedgerChangeHistoryEntry,
  RepairFinancialSummary,
  DashboardLayoutsPayload,
  OverallStatus,
  SavedFilterRow,
  InventoryTurnoverReport,
  DeadStockItem,
  AbcItem,
  AgingBucket,
  AgingReceivableRow,
  CashflowDay,
  CashflowReport,
  ShareInput,
  ProfitShareLine,
  ResolvedOwnershipContext,
  SaleProfitSnapshotItemInput,
} from "../core/types";

type SaleItemType = SaleDataPayload["itemType"];

export interface SaleProfitRow {
  saleId: number;
  profit: number | null;
}

export interface LegacySalesTransactionRow {
  id: number;
  transactionDate: string;
  itemType: SaleItemType;
  itemId: number;
  itemName: string;
  quantity: number;
  pricePerItem: number;
  totalPrice: number;
  notes: string | null;
  customerId: number | null;
  discount: number | null;
  paymentMethod: "cash" | "credit" | null;
  buyPrice: number | null;
  customerFullName: string | null;
  imei: string | null;
  phoneModel: string | null;
}

export interface LegacySalesOrderSummaryRow {
  id: number;
  transactionDate: string;
  grandTotal: number;
  totalPrice: number;
  paymentMethod: "cash" | "credit";
  customerId: number | null;
  customerFullName: string | null;
  itemName: string;
}

interface LegacyInvoiceSaleRow extends LegacySalesTransactionRow {
  customerFullName: string;
  customerPhone: string | null;
  customerAddress: string | null;
  phonePurchasePrice: number | null;
  phoneCurrentPurchasePrice: number | null;
  productPurchasePrice: number | null;
}

type LegacyInvoiceLineItem = InvoiceLineItem & {
  itemType: SaleItemType;
  itemId: number;
  buyPrice: number;
  currentPurchasePrice: number;
  originalPurchasePrice: number;
  costBasisSource: string;
};

type LegacyInvoiceFinancialSummary = InvoiceFinancialSummary & {
  discountAmount: number;
};

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export const getProfitPerSaleMapFromDb = async (
  ids: number[],
): Promise<Map<number, number>> => {
  await getDbInstance();
  if (!ids.length) return new Map<number, number>();
  const ph = ids.map(() => "?").join(",");
  const rows = await allTypedAsync<SaleProfitRow>(
    `
    SELECT st.id AS saleId,
           SUM(st.totalPrice - CASE
             WHEN st.itemType='inventory' THEN COALESCE(p.purchasePrice,0)*st.quantity
             WHEN st.itemType='phone'     THEN COALESCE(NULLIF(ph.currentPurchasePrice,0), NULLIF(st.buyPrice,0), ph.purchasePrice,0)*st.quantity
             ELSE 0 END) AS profit
    FROM sales_transactions st
    LEFT JOIN products p ON st.itemType='inventory' AND st.itemId=p.id
    LEFT JOIN phones   ph ON st.itemType='phone'     AND st.itemId=ph.id
    WHERE st.id IN (${ph})
    GROUP BY st.id
  `,
    ids,
  );
  const map = new Map<number, number>();
  rows.forEach((row) =>
    map.set(Number(row.saleId), Number(row.profit) || 0),
  );
  return map;
};

export const getAllSalesTransactionsFromDb = async (
  customerIdFilter: number | null = null,
): Promise<LegacySalesTransactionRow[]> => {
  await getDbInstance();
  let sql = `
    SELECT st.*, c.fullName as customerFullName,
           CASE WHEN st.itemType = 'phone' THEN ph.imei ELSE NULL END as imei,
           CASE WHEN st.itemType = 'phone' THEN ph.model ELSE NULL END as phoneModel
    FROM sales_transactions st
    LEFT JOIN customers c ON st.customerId = c.id
    LEFT JOIN phones ph ON st.itemType = 'phone' AND st.itemId = ph.id
  `;
  const params: SqliteBindValue[] = [];
  if (customerIdFilter) {
    sql += " WHERE st.customerId = ?";
    params.push(customerIdFilter);
  }
  sql += " ORDER BY st.id DESC";

  try {
    return await allTypedAsync<LegacySalesTransactionRow>(sql, params);
  } catch (error: unknown) {
    console.error("DB Error (getAllSalesTransactionsFromDb):", error);
    throw new Error(
      `خطا در عملیاتی پایگاه داده: ${getErrorMessage(error)}`,
    );
  }
};

export const getAllSalesOrdersFromDb = async (): Promise<
  LegacySalesOrderSummaryRow[]
> => {
  await getDbInstance();
  return await allTypedAsync<LegacySalesOrderSummaryRow>(`
    SELECT
        so.id,
        so.transactionDate,
        so.grandTotal,
        so.grandTotal            AS totalPrice,
        so.paymentMethod,
        so.customerId,
        so.status,
        c.fullName               AS customerFullName,
        COALESCE(
          (SELECT description
             FROM sales_order_items
            WHERE orderId = so.id
            LIMIT 1),
          '—'
        )                        AS itemName
    FROM   sales_orders  AS so
    LEFT  JOIN customers  AS c  ON c.id = so.customerId
    ORDER BY so.id DESC
  `);
};

export const recordSaleTransactionInDb = async (
  saleData: SaleDataPayload,
): Promise<any> => {
  await getDbInstance();
  // transactionDate is expected as Shamsi 'YYYY/MM/DD' from frontend
  const {
    itemType,
    itemId,
    quantity,
    transactionDate: shamsiTransactionDate,
    customerId,
    notes,
    discount = 0,
    paymentMethod,
  } = saleData;
  const normalizedQuantity = Number(quantity);
  const normalizedDiscount = Number(discount || 0);
  if (!["phone", "inventory", "service"].includes(String(itemType)))
    throw new Error("نوع قلم فروش نامعتبر است.");
  if (!Number.isInteger(Number(itemId)) || Number(itemId) <= 0)
    throw new Error("شناسه قلم فروش نامعتبر است.");
  if (!Number.isFinite(normalizedQuantity) || normalizedQuantity <= 0)
    throw new Error("تعداد فروش نامعتبر است.");
  if (!Number.isFinite(normalizedDiscount) || normalizedDiscount < 0)
    throw new Error("مبلغ تخفیف نامعتبر است.");
  if (paymentMethod !== "cash" && paymentMethod !== "credit")
    throw new Error("روش پرداخت نامعتبر است.");

  // Convert Shamsi date to ISO YYYY-MM-DD for storage and for phone's saleDate
  const isoTransactionDate = moment(
    shamsiTransactionDate,
    "jYYYY/jMM/jDD",
  ).format("YYYY-MM-DD");
  if (!moment(isoTransactionDate, "YYYY-MM-DD", true).isValid()) {
    throw new Error(
      "تاریخ تراکنش ارائه شده پس از تبدیل به میلادی، نامعتبر است.",
    );
  }

  try {
    await execAsync("BEGIN TRANSACTION;");
    let itemName: string;
    let pricePerItem: number;
    let purchasePriceOfItem = 0; // For profit calculation

    if (itemType === "phone") {
      if (normalizedQuantity !== 1)
        throw new Error("تعداد برای فروش گوشی باید ۱ باشد.");
      const phone = await getAsync(
        "SELECT model, imei, salePrice, purchasePrice, currentPurchasePrice, status FROM phones WHERE id = ?",
        [itemId],
      );
      if (!phone) throw new Error("گوشی مورد نظر برای فروش یافت نشد.");
      // گوشی باید یا در انبار موجود باشد یا به عنوان مرجوعی برگشته باشد (از فروش نقدی یا اقساطی)
      if (
        phone.status !== "موجود در انبار" &&
        phone.status !== "مرجوعی" &&
        phone.status !== "مرجوعی اقساطی"
      ) {
        throw new Error(
          `گوشی "${phone.model} (IMEI: ${phone.imei})" در وضعیت "${phone.status}" قرار دارد و قابل فروش نیست.`,
        );
      }
      if (
        phone.salePrice === null ||
        typeof phone.salePrice !== "number" ||
        phone.salePrice <= 0
      )
        throw new Error(
          `قیمت فروش برای گوشی "${phone.model} (IMEI: ${phone.imei})" مشخص نشده یا نامعتبر است.`,
        );

      itemName = `${phone.model} (IMEI: ${phone.imei})`;
      pricePerItem = phone.salePrice;
      purchasePriceOfItem = resolvePhoneCostBasisAmount(phone);
      // هنگام فروش مجدد گوشی، وضعیت را به «فروخته شده» تغییر می‌دهیم و تاریخ فروش را ثبت می‌کنیم. همچنین اگر گوشی
      // قبلاً مرجوع شده باشد، تاریخ مرجوعی (returnDate) را پاک می‌کنیم تا در نمایش مجدد فروش، به اشتباه باقی نماند.
      await runAsync(
        "UPDATE phones SET status = 'فروخته شده', saleDate = ?, currentPurchasePrice = ?, currentPurchasePriceUpdatedAt = (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')), returnDate = NULL WHERE id = ?",
        [isoTransactionDate, purchasePriceOfItem, itemId],
      );
      await syncPhoneCostBasisSnapshots(Number(itemId), purchasePriceOfItem);
    } else if (itemType === "inventory") {
      const product = await getAsync(
        "SELECT name, sellingPrice, purchasePrice, stock_quantity FROM products WHERE id = ?",
        [itemId],
      );
      if (!product) throw new Error("کالای مورد نظر در انبار یافت نشد.");
      if (Number(product.stock_quantity) < normalizedQuantity)
        throw new Error(
          `موجودی کالا (${product.name}: ${product.stock_quantity} عدد) برای فروش کافی نیست (درخواست: ${normalizedQuantity} عدد).`,
        );
      if (
        product.sellingPrice === null ||
        typeof product.sellingPrice !== "number" ||
        product.sellingPrice <= 0
      )
        throw new Error(
          `قیمت فروش برای کالا "${product.name}" مشخص نشده یا نامعتبر است.`,
        );

      itemName = product.name;
      pricePerItem = product.sellingPrice;
      purchasePriceOfItem = product.purchasePrice;
      await runAsync(
        "UPDATE products SET stock_quantity = stock_quantity - ?, saleCount = saleCount + ? WHERE id = ?",
        [normalizedQuantity, normalizedQuantity, itemId],
      );
    } else if (itemType === "service") {
      const service = await getAsync(
        "SELECT name, price FROM services WHERE id = ?",
        [itemId],
      );
      if (!service) throw new Error("خدمت مورد نظر یافت نشد.");
      if (normalizedQuantity !== 1)
        throw new Error("تعداد برای فروش خدمت باید ۱ باشد.");

      itemName = service.name;
      pricePerItem = service.price;
      // No stock update, no purchase price for services
    } else {
      throw new Error("نوع کالای نامعتبر برای فروش.");
    }

    const subTotal = normalizedQuantity * pricePerItem;
    if (normalizedDiscount > subTotal)
      throw new Error("مبلغ تخفیف نمی‌تواند بیشتر از قیمت کل کالا باشد.");
    const totalPrice = subTotal - normalizedDiscount;
    if (totalPrice < 0)
      throw new Error("قیمت نهایی پس از تخفیف نمی‌تواند منفی باشد.");

    const saleResult = await runAsync(
      `INSERT INTO sales_transactions (transactionDate, itemType, itemId, itemName, quantity, pricePerItem, totalPrice, notes, customerId, discount, paymentMethod, buyPrice)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        isoTransactionDate,
        itemType,
        itemId,
        itemName,
        normalizedQuantity,
        pricePerItem,
        totalPrice,
        notes,
        customerId,
        normalizedDiscount,
        paymentMethod,
        purchasePriceOfItem,
      ],
    );

    if (customerId && totalPrice > 0) {
      const ledgerDescription =
        paymentMethod === "credit"
          ? `خرید اعتباری: ${itemName} (شناسه فروش: ${saleResult.lastID})`
          : `خرید نقدی: ${itemName} (شناسه فروش: ${saleResult.lastID})`;
      // برای خرید نقدی هم رکورد متوازن ثبت می‌کنیم تا در دفتر حساب و تاریخچه دیده شود ولی مانده تغییر نکند.
      await addCustomerLedgerEntryInternal(
        customerId,
        ledgerDescription,
        totalPrice,
        paymentMethod === "credit" ? 0 : totalPrice,
        new Date().toISOString(),
      );
    }

    await execAsync("COMMIT;");
    return await getAsync("SELECT * FROM sales_transactions WHERE id = ?", [
      saleResult.lastID,
    ]);
  } catch (err: any) {
    await execAsync("ROLLBACK;");
    console.error("DB Error (recordSaleTransactionInDb):", err);
    throw err;
  }
};

export const getInvoiceDataById = async (
  saleId: number,
): Promise<FrontendInvoiceData | null> => {
  await getDbInstance();

  const sale = await getTypedAsync<LegacyInvoiceSaleRow>(
    `SELECT st.*, c.fullName  as customerFullName,
            c.phoneNumber    as customerPhone,
            c.address        as customerAddress,
            ph.purchasePrice AS phonePurchasePrice,
            ph.currentPurchasePrice AS phoneCurrentPurchasePrice,
            pr.purchasePrice AS productPurchasePrice
       FROM sales_transactions st
       LEFT JOIN customers c ON st.customerId = c.id
       LEFT JOIN phones ph ON st.itemType = 'phone' AND st.itemId = ph.id
       LEFT JOIN products pr ON st.itemType = 'inventory' AND st.itemId = pr.id
      WHERE st.id = ?`,
    [saleId],
  );
  if (!sale) return null;

  /* تنظیمات فروشگاه */
  const settings = await getAllSettingsAsObject();
  const businessDetails = {
    name: settings.store_name || "فروشگاه شما",
    addressLine1: settings.store_address_line1 || "",
    addressLine2: settings.store_address_line2 || "",
    cityStateZip: settings.store_city_state_zip || "",
    phone: settings.store_phone || "",
    email: settings.store_email || "",
    logoUrl: settings.store_logo_path
      ? `/uploads/${settings.store_logo_path}`
      : '/kourosh-logo.svg',
  };

  /* مشخصات مشتری */
  const customerDetails = sale.customerId
    ? {
        id: sale.customerId,
        fullName: sale.customerFullName,
        phoneNumber: sale.customerPhone,
        address: sale.customerAddress,
      }
    : null;

  /* قلم فاکتور (totalPrice is net price for the line) */
  const lineItems: LegacyInvoiceLineItem[] = [
    {
      id: 1,
      itemType: sale.itemType,
      itemId: sale.itemId,
      description: sale.itemName,
      quantity: sale.quantity,
      unitPrice: sale.pricePerItem,
      discountPerItem: Number(sale.discount ?? 0),
      totalPrice: sale.totalPrice, // Net price from DB: (qty * price) - discount
      buyPrice:
        sale.itemType === "phone"
          ? resolvePhoneCostBasisAmount(
              {
                currentPurchasePrice: sale.phoneCurrentPurchasePrice,
                purchasePrice: sale.phonePurchasePrice,
              },
              sale.buyPrice,
            )
          : Number(sale.buyPrice || sale.productPurchasePrice || 0),
      currentPurchasePrice: Number(sale.phoneCurrentPurchasePrice || 0),
      originalPurchasePrice: Number(
        sale.phonePurchasePrice || sale.productPurchasePrice || 0,
      ),
      costBasisSource: (() => {
        const buy = Number(sale.buyPrice || 0);
        const current = Number(sale.phoneCurrentPurchasePrice || 0);
        const original = Number(
          sale.phonePurchasePrice || sale.productPurchasePrice || 0,
        );
        if (sale.itemType === "phone" && current > 0)
          return "current_purchase_price";
        if (buy > 0) return "sale_item_buy_price";
        if (sale.itemType === "phone" && original > 0)
          return "original_purchase_price";
        if (sale.itemType === "inventory" && original > 0)
          return "product_purchase_price";
        return "";
      })(),
    },
  ];

  /* محاسبات برای خلاصه فاکتور */
  // Subtotal is the sum of gross prices (before discount)
  const subtotal = sale.quantity * sale.pricePerItem;
  const discountAmount = sale.discount ?? 0;
  // Grand total is the final net price
  const grandTotal = subtotal - discountAmount;

  // Sanity check: grandTotal should equal the net price from the database
  if (grandTotal !== sale.totalPrice) {
    console.warn(
      `Invoice ${sale.id} grandTotal mismatch! Calculated: ${grandTotal}, DB: ${sale.totalPrice}`,
    );
  }

  const financialSummary: LegacyInvoiceFinancialSummary = {
    subtotal,
    discountAmount,
    itemsDiscount: discountAmount,
    globalDiscount: 0,
    taxableAmount: grandTotal,
    taxPercentage: 0,
    taxAmount: 0,
    grandTotal,
  };

  return {
    businessDetails,
    customerDetails,
    invoiceMetadata: {
      invoiceNumber: String(sale.id),
      transactionDate: moment(sale.transactionDate, "YYYY-MM-DD")
        .locale("fa")
        .format("jYYYY/jMM/jDD"),
    },
    lineItems,
    financialSummary,
    notes: sale.notes,
  };
};

export const getInvoiceDataForSaleIds = async (
  saleIds: number[],
): Promise<FrontendInvoiceData | null> => {
  await getDbInstance();
  if (saleIds.length === 0) return null;

  const previews = saleIds.map(() => "?").join(",");
  const sales = await allTypedAsync<LegacyInvoiceSaleRow>(
    `SELECT st.*, c.fullName  as customerFullName,
            c.phoneNumber    as customerPhone,
            c.address        as customerAddress,
            ph.purchasePrice AS phonePurchasePrice,
            ph.currentPurchasePrice AS phoneCurrentPurchasePrice,
            pr.purchasePrice AS productPurchasePrice
       FROM sales_transactions st
       LEFT JOIN customers c ON st.customerId = c.id
       LEFT JOIN phones ph ON st.itemType = 'phone' AND st.itemId = ph.id
       LEFT JOIN products pr ON st.itemType = 'inventory' AND st.itemId = pr.id
      WHERE st.id IN (${previews})
      ORDER BY st.id ASC`, // Consistent ordering
    saleIds,
  );
  if (sales.length === 0) return null;

  /* تنظیمات فروشگاه */
  const settings = await getAllSettingsAsObject();
  const businessDetails = {
    name: settings.store_name || "فروشگاه شما",
    addressLine1: settings.store_address_line1 || "",
    cityStateZip: settings.store_city_state_zip || "",
    phone: settings.store_phone || "",
    email: settings.store_email || "",
    logoUrl: settings.store_logo_path
      ? `/uploads/${settings.store_logo_path}`
      : '/kourosh-logo.svg',
  };

  /* مشخصات مشتری (از اولین فروش) */
  const firstSale = sales[0];
  const customerDetails = firstSale.customerId
    ? {
        id: firstSale.customerId,
        fullName: firstSale.customerFullName,
        phoneNumber: firstSale.customerPhone,
        address: firstSale.customerAddress,
      }
    : null;

  /* اقلام فاکتور (totalPrice is net price for the line) */
  const lineItems: LegacyInvoiceLineItem[] = sales.map((s, idx) => ({
    id: idx + 1,
    itemType: s.itemType,
    itemId: s.itemId,
    description: s.itemName,
    quantity: s.quantity,
    unitPrice: s.pricePerItem,
    discountPerItem: Number(s.discount ?? 0),
    totalPrice: s.totalPrice, // Net price from DB: (qty * price) - discount
    buyPrice:
      s.itemType === "phone"
        ? resolvePhoneCostBasisAmount(
            {
              currentPurchasePrice: s.phoneCurrentPurchasePrice,
              purchasePrice: s.phonePurchasePrice,
            },
            s.buyPrice,
          )
        : Number(s.buyPrice || s.productPurchasePrice || 0),
    currentPurchasePrice: Number(s.phoneCurrentPurchasePrice || 0),
    originalPurchasePrice: Number(
      s.phonePurchasePrice || s.productPurchasePrice || 0,
    ),
    costBasisSource: (() => {
      const buy = Number(s.buyPrice || 0);
      const current = Number(s.phoneCurrentPurchasePrice || 0);
      const original = Number(
        s.phonePurchasePrice || s.productPurchasePrice || 0,
      );
      if (s.itemType === "phone" && current > 0)
        return "current_purchase_price";
      if (buy > 0) return "sale_item_buy_price";
      if (s.itemType === "phone" && original > 0)
        return "original_purchase_price";
      if (s.itemType === "inventory" && original > 0)
        return "product_purchase_price";
      return "";
    })(),
  }));

  /* محاسبات برای خلاصه فاکتور */
  // Subtotal is the sum of gross prices (before discount)
  const subtotal = sales.reduce(
    (sum, s) => sum + s.quantity * s.pricePerItem,
    0,
  );
  // Discount is the sum of all individual discounts
  const discountAmount = sales.reduce((sum, s) => sum + (s.discount || 0), 0);
  // Grand total is the final net price
  const grandTotal = subtotal - discountAmount;

  // Sanity check: grandTotal should equal the sum of net prices from the database
  const grandTotalCheck = sales.reduce((sum, s) => sum + s.totalPrice, 0);
  if (Math.abs(grandTotal - grandTotalCheck) > 0.001) {
    // Use tolerance for float comparison
    console.warn(
      `Invoice ${saleIds.join(",")} grandTotal mismatch! Calculated: ${grandTotal}, DB Sum: ${grandTotalCheck}`,
    );
  }

  // Use notes from all sales, combined.
  const notes = sales
    .map((s) => s.notes)
    .filter(Boolean)
    .join("\n---\n");

  const financialSummary: LegacyInvoiceFinancialSummary = {
    subtotal,
    discountAmount,
    itemsDiscount: discountAmount,
    globalDiscount: 0,
    taxableAmount: grandTotal,
    taxPercentage: 0,
    taxAmount: 0,
    grandTotal,
  };

  return {
    businessDetails,
    customerDetails,
    invoiceMetadata: {
      invoiceNumber: saleIds.join(", "), // «مرجع» فاکتور
      transactionDate: moment(firstSale.transactionDate, "YYYY-MM-DD")
        .locale("fa")
        .format("jYYYY/jMM/jDD"),
    },
    lineItems,
    financialSummary,
    notes,
  };
};

export async function createInvoice(invoiceData: any): Promise<number> {
  await getDbInstance(); // اطمینان از اتصال
  const subtotal = invoiceData.lineItems.reduce(
    (sum: number, item: any) =>
      sum + (item.unitPrice || 0) * (item.quantity || 0),
    0,
  );
  const discount = invoiceData.financialSummary?.discountAmount || 0;
  const grandTotal = subtotal - discount;

  const result = await runAsync(
    `INSERT INTO invoices 
      (invoiceNumber, customerId, date, subtotal, discountAmount, grandTotal, notes) 
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      invoiceData.invoiceNumber || `INV-${Date.now()}`, // شماره فاکتور یکتا
      invoiceData.customerId || null,
      invoiceData.date,
      subtotal,
      discount,
      grandTotal,
      invoiceData.notes || "",
    ],
  );

  const invoiceId = result.lastID;

  for (const item of invoiceData.lineItems) {
    await runAsync(
      `INSERT INTO invoice_items 
        (invoiceId, description, quantity, unitPrice, totalPrice, itemType, itemId) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        invoiceId,
        item.description,
        item.quantity,
        item.unitPrice,
        (item.unitPrice || 0) * (item.quantity || 0),
        item.itemType || null,
        item.itemId || null,
      ],
    );
  }

  return invoiceId;
}

export const snapshotSalesOrderProfitAllocations = async (
  orderId: number,
  saleDate?: string | null,
): Promise<void> => {
  await purgeProfitSnapshotsForSource("sales_order", orderId);
  const rows = await allAsync(
    `SELECT soi.id as sourceItemId, soi.orderId as sourceId, soi.itemType, soi.itemId, soi.description,
            soi.quantity, soi.unitPrice, soi.discountPerItem, soi.buyPrice, soi.totalPrice,
            ph.purchasePrice as phonePurchasePrice, ph.ownershipProfileId as phoneOwnershipProfileId,
            pr.purchasePrice as productPurchasePrice, pr.ownershipProfileId as productOwnershipProfileId
       FROM sales_order_items soi
       LEFT JOIN phones ph ON soi.itemType = 'phone' AND ph.id = soi.itemId
       LEFT JOIN products pr ON soi.itemType = 'inventory' AND pr.id = soi.itemId
      WHERE soi.orderId = ?
      ORDER BY soi.id ASC`,
    [orderId],
  );

  for (const row of rows as any[]) {
    const initialCostPerUnit =
      row.itemType === "phone"
        ? Number(row.phonePurchasePrice) || 0
        : row.itemType === "inventory"
          ? Number(row.productPurchasePrice) || 0
          : 0;
    const ownershipProfileId =
      row.itemType === "phone"
        ? Number(row.phoneOwnershipProfileId) || null
        : row.itemType === "inventory"
          ? Number(row.productOwnershipProfileId) || null
          : null;
    await persistSaleProfitSnapshotItem({
      sourceKind: "sales_order",
      sourceId: Number(row.sourceId),
      sourceItemRefType: "sales_order_item",
      sourceItemId: Number(row.sourceItemId),
      saleDate: saleDate || null,
      itemType: row.itemType,
      itemId: Number(row.itemId) || null,
      itemDescription:
        String(row.description || "").trim() || `آیتم ${row.sourceItemId}`,
      quantity: Number(row.quantity) || 0,
      saleUnitPrice: Number(row.unitPrice) || 0,
      itemDiscount: Number(row.discountPerItem) || 0,
      saleAmount: Number(row.totalPrice) || 0,
      initialCostPerUnit,
      marketCostPerUnit: Number(row.buyPrice) || initialCostPerUnit || 0,
      ownershipProfileId,
      fallbackNotes: ownershipProfileId
        ? null
        : "مالکیت مشخص نبود؛ تلاش شد پروفایل پیش‌فرض اعمال شود.",
    });
  }
};

export const getSalesOrderProfitSnapshotFromDb = async (
  orderId: number,
): Promise<any> => {
  return buildSaleProfitSnapshotResponse("sales_order", orderId);
};

export const getInstallmentSaleProfitSnapshotFromDb = async (
  saleId: number,
): Promise<any> => {
  return buildSaleProfitSnapshotResponse("installment_sale", saleId);
};

export {
  updateSaleProfitSnapshotSourceStatus,
  snapshotInstallmentSaleProfitAllocations,
} from "./profitSnapshots.db";
