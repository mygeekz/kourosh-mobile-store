import moment from "jalali-moment";
import { getDbInstance } from "../core/runtimeBindings";
import { fromShamsiStringToISO } from "../date";
import { allAsync, execAsync, getAsync, runAsync } from "../query";
import { resolvePhoneCostBasisAmount, syncPhoneCostBasisSnapshots } from "../phoneCostBasis";
import { addCustomerLedgerEntryInternal as addCustomerLedgerEntryInternalInRepo } from "./customers.db";
import {
  assertInstallmentReceiptDateOnOrAfterSale,
  getCheckRecoveryCollectedAmount,
  getInstallmentSaleReceivableState,
  normalizeInstallmentAccountingDate,
  removeInstallmentSaleCustomerLedger,
  syncCheckRecoveryLedgerForPayment,
  syncInstallmentCheckCustomerLedger,
} from "./installmentAccounting.db";
import {
  assertInstallmentCheckIsMutable,
  assertInstallmentPaymentIsMutable,
  getInstallmentCancellationRefundStateFromDb,
} from "./installmentCancellation.db";
import { normalizeCheckStatus } from "./installmentTypes";
import type {
  CheckStatus,
  InstallmentPaymentStatus,
  InstallmentSalePayload,
} from "./installmentTypes";
import type { InstallmentSale as FrontendInstallmentSale } from "../../../types";
import { updateSaleProfitSnapshotSourceStatus, snapshotInstallmentSaleProfitAllocations } from "./profitSnapshots.db";
import {
  _toNumber,
  assertInstallmentPaymentAmountIsValid,
  deleteInstallmentTransactionCustomerLedger,
  syncInstallmentTransactionCustomerLedger,
} from "./installmentLedger.db";
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

export const addInstallmentSaleToDb = async (
  saleData: InstallmentSalePayload,
): Promise<any> => {
  await getDbInstance();
  const {
    customerId,
    phoneId,
    actualSalePrice,
    downPayment,
    numberOfInstallments,
    installmentAmount,
    installmentsStartDate,
    saleDate,
    checks = [],
    notes,
  } = saleData as any;

  const saleType: "installment" | "check" =
    (saleData as any).saleType === "check" ? "check" : "installment";

  // اقلام جدید (با سازگاری عقب‌رو)
  const phonesPayload: any[] = Array.isArray((saleData as any).phones)
    ? (saleData as any).phones
    : [];
  const accessoryPayload: any[] = Array.isArray((saleData as any).accessories)
    ? (saleData as any).accessories
    : [];
  const servicesPayload: any[] = Array.isArray((saleData as any).services)
    ? (saleData as any).services
    : [];
  const explicitPhoneIds: number[] = Array.isArray((saleData as any).phoneIds)
    ? (saleData as any).phoneIds
        .map((x: any) => Number(x))
        .filter((n: any) => Number.isInteger(n) && n > 0)
    : [];

  const legacyPhoneId = Number(phoneId);
  const phoneIds: number[] = Array.from(
    new Set<number>([
      ...(Number.isInteger(legacyPhoneId) && legacyPhoneId > 0
        ? [legacyPhoneId]
        : []),
      ...phonesPayload
        .map((p: any) => Number(p.phoneId))
        .filter((n: any) => Number.isInteger(n) && n > 0),
      ...explicitPhoneIds,
    ]),
  );

  const hasAnyItems =
    phoneIds.length > 0 ||
    accessoryPayload.length > 0 ||
    servicesPayload.length > 0;
  if (!hasAnyItems)
    throw new Error(
      "حداقل یک قلم (موبایل/لوازم/خدمات) برای فروش اقساطی الزامی است.",
    );
  const normalizedActualSalePrice = Number(actualSalePrice);
  const normalizedDownPayment = Number(downPayment || 0);
  if (
    !Number.isFinite(normalizedActualSalePrice) ||
    normalizedActualSalePrice <= 0
  )
    throw new Error("مبلغ کل قرارداد نامعتبر است.");
  if (!Number.isFinite(normalizedDownPayment) || normalizedDownPayment < 0)
    throw new Error("پیش‌پرداخت نامعتبر است.");
  if (normalizedDownPayment > normalizedActualSalePrice)
    throw new Error("پیش‌پرداخت نمی‌تواند بیشتر از مبلغ کل قرارداد باشد.");
  if (saleType === "installment") {
    if (
      !Number.isInteger(Number(numberOfInstallments)) ||
      Number(numberOfInstallments) <= 0
    )
      throw new Error("تعداد اقساط باید عدد صحیح مثبت باشد.");
    if (
      !Number.isFinite(Number(installmentAmount)) ||
      Number(installmentAmount) <= 0
    )
      throw new Error("مبلغ هر قسط باید مثبت باشد.");
  }

  const itemsSummaryParts: string[] = [];

  try {
    await execAsync("BEGIN TRANSACTION;");

    // 1) اعتبارسنجی و آماده‌سازی اقلام
    // Phones
    const parseJalaliDbDate = (rawValue: any, label: string) => {
      const raw = String(rawValue || "").trim();
      const iso = fromShamsiStringToISO(raw);
      if (!iso) throw new Error(`${label} نامعتبر است.`);
      const parsed = moment(iso, "YYYY-MM-DD", true);
      if (!parsed?.isValid?.()) throw new Error(`${label} نامعتبر است.`);
      return parsed;
    };
    const installmentStartMoment = parseJalaliDbDate(
      installmentsStartDate,
      "تاریخ شروع اقساط",
    );
    const saleDateMoment = parseJalaliDbDate(
      saleDate || installmentsStartDate,
      "تاریخ خرید اقساطی",
    );
    const normalizedInstallmentsStartDate = installmentStartMoment
      .locale("fa")
      .format("jYYYY/jMM/jDD");
    const normalizedSaleDate = saleDateMoment
      .locale("fa")
      .format("jYYYY/jMM/jDD");
    if (saleDateMoment.clone().startOf("day").isAfter(moment().startOf("day"))) {
      throw new Error("تاریخ فروش نمی‌تواند در آینده باشد.");
    }
    if (saleType === "installment" && installmentStartMoment.clone().startOf("day").isBefore(saleDateMoment.clone().startOf("day"))) {
      throw new Error("تاریخ شروع اقساط نمی‌تواند قبل از تاریخ فروش باشد.");
    }
    const saleDateISO = saleDateMoment.locale("en").format("YYYY-MM-DD");
    for (const pid of phoneIds) {
      const ph = await getAsync(
        "SELECT id, model, imei, status, purchasePrice, currentPurchasePrice, salePrice FROM phones WHERE id = ?",
        [pid],
      );
      if (!ph) throw new Error("گوشی مورد نظر یافت نشد.");
      if (
        ph.status !== "موجود در انبار" &&
        ph.status !== "مرجوعی" &&
        ph.status !== "مرجوعی اقساطی"
      ) {
        throw new Error("این گوشی قبلاً فروخته شده یا در دسترس نیست.");
      }
      itemsSummaryParts.push(`${ph.model}${ph.imei ? ` (${ph.imei})` : ""}`);
    }

    // Inventory (accessories)
    for (const a of accessoryPayload) {
      const productId = Number(a.productId);
      const qty = Math.max(1, Number(a.qty || a.quantity || 1));
      if (!Number.isFinite(productId)) throw new Error("کالای نامعتبر است.");
      const pr = await getAsync(
        "SELECT id, name, stock_quantity, sellingPrice FROM products WHERE id = ?",
        [productId],
      );
      if (!pr) throw new Error("کالای مورد نظر یافت نشد.");
      if (Number(pr.stock_quantity) < qty)
        throw new Error(`موجودی کالای «${pr.name}» کافی نیست.`);
      itemsSummaryParts.push(`${pr.name} × ${qty}`);
    }

    // Services
    for (const s of servicesPayload) {
      const serviceId = Number(s.serviceId || s.id);
      const qty = Math.max(1, Number(s.qty || s.quantity || 1));
      if (!Number.isFinite(serviceId)) throw new Error("خدمت نامعتبر است.");
      const sv = await getAsync(
        "SELECT id, name, price FROM services WHERE id = ?",
        [serviceId],
      );
      if (!sv) throw new Error("خدمت مورد نظر یافت نشد.");
      itemsSummaryParts.push(`${sv.name} × ${qty}`);
    }

    // 2) ایجاد رکورد فروش
    const metaJson = (saleData as any).meta
      ? JSON.stringify((saleData as any).meta)
      : (saleData as any).metaJson
        ? String((saleData as any).metaJson)
        : null;
    const itemsSummary = itemsSummaryParts.join("، ");
    const mainPhoneId: number | null = phoneIds.length > 0 ? phoneIds[0] : null;
    const saleResult = await runAsync(
      `INSERT INTO installment_sales
        (customerId, phoneId, actualSalePrice, downPayment, numberOfInstallments, installmentAmount, installmentsStartDate, saleDate, saleDateISO, saleType, itemsSummary, metaJson, notes)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        customerId,
        mainPhoneId,
        normalizedActualSalePrice,
        normalizedDownPayment,
        Number(numberOfInstallments) || 0,
        Number(installmentAmount) || 0,
        normalizedInstallmentsStartDate,
        normalizedSaleDate,
        saleDateISO,
        saleType,
        itemsSummary,
        metaJson,
        notes || null,
      ],
    );
    const saleId = saleResult.lastID;

    // 3) اقلام فروش
    // Phones
    for (const pid of phoneIds) {
      const ph = await getAsync(
        "SELECT id, model, imei, purchasePrice, currentPurchasePrice, salePrice FROM phones WHERE id = ?",
        [pid],
      );
      const unit = Number(
        phonesPayload.find((x: any) => Number(x.phoneId) === pid)?.sellPrice ??
          ph?.salePrice ??
          0,
      );
      const phonePayload = phonesPayload.find(
        (x: any) => Number(x.phoneId) === pid,
      );
      const payloadBuyPrice = Number(phonePayload?.buyPrice || 0);
      const buy = resolvePhoneCostBasisAmount(ph, payloadBuyPrice);
      if (!Number.isFinite(unit) || unit <= 0)
        throw new Error(
          `قیمت فروش برای گوشی «${ph?.model || "موبایل"}» نامعتبر است.`,
        );
      if (!Number.isFinite(buy) || buy < 0)
        throw new Error(
          `قیمت خرید برای گوشی «${ph?.model || "موبایل"}» نامعتبر است.`,
        );
      const desc = `${ph?.model || "موبایل"}${ph?.imei ? ` (IMEI: ${ph.imei})` : ""}`;
      await runAsync(
        `INSERT INTO installment_sale_items (saleId, itemType, itemId, description, quantity, unitPrice, buyPrice, totalPrice)
         VALUES (?,?,?,?,?,?,?,?)`,
        [saleId, "phone", pid, desc, 1, unit, buy, unit],
      );
      await runAsync(
        "UPDATE phones SET currentPurchasePrice = ?, currentPurchasePriceUpdatedAt = (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')) WHERE id = ?",
        [buy, pid],
      );
      await syncPhoneCostBasisSnapshots(Number(pid), buy);
    }

    // Inventory
    for (const a of accessoryPayload) {
      const productId = Number(a.productId);
      const qty = Math.max(1, Number(a.qty || a.quantity || 1));
      const pr = await getAsync(
        "SELECT id, name, sellingPrice, purchasePrice FROM products WHERE id = ?",
        [productId],
      );
      const unit = Number(a.sellPrice ?? a.unitPrice ?? pr?.sellingPrice ?? 0);
      const buy = Number(a.buyPrice ?? pr?.purchasePrice ?? 0);
      const desc = String(a.name || pr?.name || "لوازم");
      if (!Number.isFinite(unit) || unit <= 0)
        throw new Error(`قیمت فروش کالای «${desc}» نامعتبر است.`);
      if (!Number.isFinite(buy) || buy < 0)
        throw new Error(`قیمت خرید کالای «${desc}» نامعتبر است.`);
      const total = unit * qty;
      await runAsync(
        `INSERT INTO installment_sale_items (saleId, itemType, itemId, description, quantity, unitPrice, buyPrice, totalPrice)
         VALUES (?,?,?,?,?,?,?,?)`,
        [saleId, "inventory", productId, desc, qty, unit, buy, total],
      );
      // کاهش موجودی باید اتمیک باشد تا ثبت هم‌زمان نتواند موجودی را منفی کند.
      const stockUpdate = await runAsync(
        "UPDATE products SET stock_quantity = stock_quantity - ?, saleCount = saleCount + ? WHERE id = ? AND stock_quantity >= ?",
        [qty, qty, productId, qty],
      );
      if (stockUpdate.changes !== 1) {
        throw new Error(`موجودی کالای «${desc}» در زمان ثبت تغییر کرده است؛ موجودی را تازه‌سازی و دوباره تلاش کنید.`);
      }
    }

    // Services
    for (const s of servicesPayload) {
      const serviceId = Number(s.serviceId || s.id);
      const qty = Math.max(1, Number(s.qty || s.quantity || 1));
      const sv = await getAsync(
        "SELECT id, name, price FROM services WHERE id = ?",
        [serviceId],
      );
      const unit = Number(s.sellPrice ?? s.unitPrice ?? sv?.price ?? 0);
      const desc = String(s.name || sv?.name || "خدمات");
      if (!Number.isFinite(unit) || unit <= 0)
        throw new Error(`قیمت خدمت «${desc}» نامعتبر است.`);
      const total = unit * qty;
      await runAsync(
        `INSERT INTO installment_sale_items (saleId, itemType, itemId, description, quantity, unitPrice, buyPrice, totalPrice)
         VALUES (?,?,?,?,?,?,?,?)`,
        [saleId, "service", serviceId, desc, qty, unit, 0, total],
      );
    }

    // 4) ایجاد اقساط
    const nInst = Number(numberOfInstallments) || 0;
    const instAmt = Number(installmentAmount) || 0;
    if (saleType === "installment" && nInst > 0 && instAmt > 0) {
      const remainingDebt = normalizedActualSalePrice - normalizedDownPayment;
      const finalInstallmentAmount = remainingDebt - (instAmt * Math.max(0, nInst - 1));
      if (!Number.isFinite(finalInstallmentAmount) || finalInstallmentAmount <= 0) {
        throw new Error("برنامه اقساط با مانده قرارداد سازگار نیست.");
      }
      let scheduledTotal = 0;
      let currentDueDate = moment(installmentsStartDate, "jYYYY/jMM/jDD");
      for (let i = 0; i < nInst; i++) {
        const amountDue = i === nInst - 1 ? finalInstallmentAmount : instAmt;
        scheduledTotal += amountDue;
        await runAsync(
          `INSERT INTO installment_payments (saleId, installmentNumber, dueDate, amountDue) VALUES (?, ?, ?, ?)`,
          [saleId, i + 1, currentDueDate.format("jYYYY/jMM/jDD"), amountDue],
        );
        currentDueDate.add(1, "jMonth");
      }
      if (Math.abs(scheduledTotal - remainingDebt) > 0.00001) {
        throw new Error("جمع برنامه اقساط با مانده قرارداد برابر نیست.");
      }
    }

    // 5) چک‌ها
    const seenCheckNumbers = new Set<string>();
    let checksTotal = 0;
    for (const check of checks) {
      const normalizedCheckNumber = String(check.checkNumber || "").trim();
      if (!normalizedCheckNumber) throw new Error("شماره چک الزامی است.");
      const normalizedCheckAmount = Number(check.amount);
      if (!Number.isFinite(normalizedCheckAmount) || normalizedCheckAmount <= 0) {
        throw new Error(`مبلغ چک «${normalizedCheckNumber}» نامعتبر است.`);
      }
      checksTotal += normalizedCheckAmount;
      if (seenCheckNumbers.has(normalizedCheckNumber)) {
        throw new Error(`شماره چک «${normalizedCheckNumber}» تکراری است.`);
      }
      seenCheckNumbers.add(normalizedCheckNumber);
      const checkDueMoment = parseJalaliDbDate(check.dueDate, "تاریخ سررسید چک");
      if (checkDueMoment.clone().startOf("day").isBefore(saleDateMoment.clone().startOf("day"))) {
        throw new Error("تاریخ سررسید چک نمی‌تواند قبل از تاریخ فروش باشد.");
      }
      await runAsync(
        `INSERT INTO installment_checks (saleId, checkNumber, bankName, dueDate, amount, status) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          saleId,
          normalizedCheckNumber,
          String(check.bankName || "").trim(),
          checkDueMoment.locale("fa").format("jYYYY/jMM/jDD"),
          normalizedCheckAmount,
          normalizeCheckStatus((check as any).status ?? "نزد فروشنده"),
        ],
      );
    }
    if (saleType === "check") {
      const expectedCheckDebt = normalizedActualSalePrice - normalizedDownPayment;
      if (Math.abs(checksTotal - expectedCheckDebt) > 0.00001) {
        throw new Error("جمع مبلغ چک‌ها باید دقیقاً با مانده قرارداد برابر باشد.");
      }
    }

    // 6) آپدیت وضعیت گوشی‌ها به‌صورت اتمیک؛ گوشی‌ای که هم‌زمان فروخته شده نباید دوباره مصرف شود.
    for (const pid of phoneIds) {
      const phoneUpdate = await runAsync(
        "UPDATE phones SET status = 'فروخته شده (قسطی)', saleDate = ? WHERE id = ? AND status IN ('موجود در انبار', 'مرجوعی', 'مرجوعی اقساطی')",
        [saleDateISO, pid],
      );
      if (phoneUpdate.changes !== 1) {
        throw new Error("وضعیت یکی از گوشی‌ها در زمان ثبت تغییر کرده است؛ فهرست موجودی را تازه‌سازی و دوباره تلاش کنید.");
      }
    }

    await snapshotInstallmentSaleProfitAllocations(Number(saleId));

    // 7) دفتر مشتری — بخشی از همان تراکنش اتمیک قرارداد است.
    // فروش بدون سند بدهی متناظر نباید Commit شود.
    const totalDebt = normalizedActualSalePrice - normalizedDownPayment;
    const ledgerDateIso = `${saleDateISO}T12:00:00.000Z`;
    if (totalDebt > 0) {
      const ledgerDescription = `خرید اقساطی (شناسه فروش: ${saleId})، موارد: ${itemsSummary || "—"}، مبلغ کل: ${normalizedActualSalePrice.toLocaleString("fa-IR")}، پیش پرداخت: ${normalizedDownPayment.toLocaleString("fa-IR")}`;
      await addCustomerLedgerEntryInternalInRepo(
        customerId,
        ledgerDescription,
        totalDebt,
        0,
        ledgerDateIso,
        { referenceType: "installment_charge", referenceId: Number(saleId) },
      );
    }

    await execAsync("COMMIT;");
    return await getInstallmentSaleByIdFromDb(saleId);
  } catch (err: any) {
    await execAsync("ROLLBACK;");
    console.error("DB Error (addInstallmentSaleToDb):", err);
    throw err;
  }
};

export const deleteInstallmentSaleFromDb = async (
  saleId: number,
): Promise<void> => {
  await getDbInstance();
  // پیدا کردن رکورد فروش
  const sale = await getAsync("SELECT * FROM installment_sales WHERE id = ?", [
    saleId,
  ]);
  if (!sale) throw new Error("فروش اقساطی یافت نشد.");
  if (String(sale.status || 'active').trim().toLowerCase() !== 'draft') {
    throw new Error("قرارداد نهایی اقساطی Hard Delete نمی‌شود؛ از عملیات فسخ قرارداد استفاده کنید.");
  }
  try {
    await execAsync("BEGIN TRANSACTION;");

    // اقلام را بخوان (برای بازگردانی موجودی/وضعیت)
    const items: any[] = await allAsync(
      "SELECT * FROM installment_sale_items WHERE saleId = ?",
      [saleId],
    ).catch(() => []);
    await updateSaleProfitSnapshotSourceStatus(
      "installment_sale",
      saleId,
      "deleted",
    );
    const phoneIds: number[] = Array.from(
      new Set<number>(
        (items || [])
          .filter((it: any) => it.itemType === "phone")
          .map((it: any) => Number(it.itemId))
          .filter((n: any) => Number.isInteger(n) && n > 0)
          .concat(
            Number.isInteger(Number(sale.phoneId)) && Number(sale.phoneId) > 0
              ? [Number(sale.phoneId)]
              : [],
          ),
      ),
    );

    // بازگردانی لوازم به موجودی
    for (const it of items || []) {
      if (it.itemType === "inventory") {
        const pid = Number(it.itemId);
        const qty = Math.max(1, Number(it.quantity || 1));
        if (Number.isFinite(pid) && Number.isFinite(qty)) {
          await runAsync(
            "UPDATE products SET stock_quantity = stock_quantity + ?, saleCount = CASE WHEN saleCount >= ? THEN saleCount - ? ELSE 0 END WHERE id = ?",
            [qty, qty, qty, pid],
          );
        }
      }
    }

    // بازگرداندن وضعیت گوشی‌ها (اگر وجود داشته باشند)
    const returnDateShamsi = moment().locale("fa").format("jYYYY/jMM/jDD");
    for (const pid of phoneIds) {
      const phoneRow = await getAsync(
        "SELECT purchaseDate FROM phones WHERE id = ?",
        [pid],
      );
      const existingPurchaseDate = phoneRow ? phoneRow.purchaseDate : null;
      await runAsync(
        "UPDATE phones SET status = 'مرجوعی اقساطی', saleDate = NULL, purchaseDate = ?, returnDate = ? WHERE id = ?",
        [existingPurchaseDate, returnDateShamsi, pid],
      );
    }

    // حذف اثرات دفتر مشتری باید قبل از حذف تراکنش‌ها/چک‌ها انجام شود تا referenceها قابل ردیابی بمانند.
    await removeInstallmentSaleCustomerLedger(saleId, Number(sale.customerId));

    // حذف اقساط
    await runAsync("DELETE FROM installment_payments WHERE saleId = ?", [
      saleId,
    ]);
    // حذف چک‌ها
    await runAsync("DELETE FROM installment_checks WHERE saleId = ?", [saleId]);
    // حذف اقلام
    await runAsync("DELETE FROM installment_sale_items WHERE saleId = ?", [
      saleId,
    ]).catch(() => {});
    // حذف خود فروش
    await runAsync("DELETE FROM installment_sales WHERE id = ?", [saleId]);
    await execAsync("COMMIT;");
  } catch (err) {
    await execAsync("ROLLBACK;");
    throw err;
  }
};


export type InstallmentDirectoryRiskFilter = "high" | "followup" | "due-soon" | "normal";
export type InstallmentDirectorySort =
  | "latest"
  | "remaining_desc"
  | "due_asc"
  | "risk_desc"
  | "last_collection_desc";

export type InstallmentDirectoryQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: FrontendInstallmentSale["overallStatus"] | "";
  risk?: InstallmentDirectoryRiskFilter | "";
  sort?: InstallmentDirectorySort;
  includeSummary?: boolean;
};

export type InstallmentDirectorySummary = {
  totalCount: number;
  totalAmountAll: number;
  totalRemainingAll: number;
  totalCollectedAll: number;
  overdueAll: number;
  activeAll: number;
  doneAll: number;
  canceledAll: number;
  nextDueSoon: number;
  highRiskAll: number;
};

export type InstallmentDirectoryResult = {
  items: FrontendInstallmentSale[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
  summary?: InstallmentDirectorySummary;
};

export type InstallmentCustomerDueOverview = {
  customerId: number;
  saleId: number;
  nextDueDate: string | null;
  openCount: number;
  overallStatus: FrontendInstallmentSale["overallStatus"];
};


const normalizeInstallmentDirectorySearch = (value: unknown): string =>
  String(value ?? "")
    .trim()
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/ۀ|ة/g, "ه")
    .replace(/\s+/g, " ");

const INSTALLMENT_DIRECTORY_STATUS_VALUES = new Set([
  "در حال پرداخت",
  "معوق",
  "تکمیل شده",
  "فسخ شده",
]);

const INSTALLMENT_DIRECTORY_RISK_VALUES = new Set<InstallmentDirectoryRiskFilter>([
  "high",
  "followup",
  "due-soon",
  "normal",
]);

const INSTALLMENT_DIRECTORY_SORTS: Record<InstallmentDirectorySort, string> = {
  latest: "saleDateISO DESC, id DESC",
  remaining_desc: "remainingAmount DESC, saleDateISO DESC, id DESC",
  due_asc: "CASE WHEN nextDueDate IS NULL THEN 1 ELSE 0 END ASC, nextDueDate ASC, saleDateISO DESC, id DESC",
  risk_desc: "riskRank DESC, overdueAmount DESC, CASE WHEN nextDueDate IS NULL THEN 1 ELSE 0 END ASC, nextDueDate ASC, id DESC",
  last_collection_desc: "CASE WHEN lastCollectionDate IS NULL THEN 1 ELSE 0 END ASC, lastCollectionDate DESC, id DESC",
};

const buildInstallmentDirectoryCtes = (todayJalali: string, dueSoonJalali: string, highRiskCutoffJalali: string, scopeSql = "SELECT id FROM installment_sales", includeLatestCollection = true) => `
WITH
directory_scope(id) AS (
  ${scopeSql}
),
transaction_by_payment AS (
  SELECT
    it.installment_payment_id AS paymentId,
    COALESCE(SUM(it.amount_paid), 0) AS transactionPaid
  FROM installment_transactions it
  JOIN installment_payments scoped_payment ON scoped_payment.id = it.installment_payment_id
  JOIN directory_scope scoped_sale ON scoped_sale.id = scoped_payment.saleId
  GROUP BY installment_payment_id
),
payment_base AS (
  SELECT
    ip.id,
    ip.saleId,
    ip.installmentNumber,
    ip.dueDate,
    ip.amountDue,
    COALESCE(ip.sourceType, 'installment') AS sourceType,
    ip.sourceId,
    COALESCE(tp.transactionPaid, 0) AS transactionPaid
  FROM installment_payments ip
  JOIN directory_scope scoped_sale ON scoped_sale.id = ip.saleId
  LEFT JOIN transaction_by_payment tp ON tp.paymentId = ip.id
),
transaction_by_sale AS (
  SELECT
    saleId,
    COALESCE(SUM(transactionPaid), 0) AS transactionPaid,
    COALESCE(SUM(CASE WHEN sourceType = 'installment' THEN transactionPaid ELSE 0 END), 0) AS normalInstallmentPaid
  FROM payment_base
  GROUP BY saleId
),
check_recovery_by_check AS (
  SELECT
    sourceId AS checkId,
    COALESCE(SUM(transactionPaid), 0) AS recoveryPaid
  FROM payment_base
  WHERE sourceType = 'check_recovery' AND sourceId IS NOT NULL
  GROUP BY sourceId
),
check_rows AS (
  SELECT
    ic.id,
    ic.saleId,
    ic.dueDate,
    MAX(0, COALESCE(ic.amount, 0)) AS checkAmount,
    MIN(MAX(0, COALESCE(ic.amount, 0)), MAX(0, COALESCE(cr.recoveryPaid, 0))) AS recoveryPaid,
    CASE
      WHEN TRIM(COALESCE(ic.status,'')) IN ('نقد شد','نقدشده','وصول شده','پاس شده','تسویه شده','پرداخت شده','تکمیل شده','paid','Paid','cashed','Cashed') THEN 1
      ELSE 0
    END AS isCashed,
    CASE WHEN TRIM(COALESCE(ic.status,'')) IN ('برگشت خورد','برگشت خورده') THEN 1 ELSE 0 END AS isBounced
  FROM installment_checks ic
  JOIN directory_scope scoped_sale ON scoped_sale.id = ic.saleId
  LEFT JOIN check_recovery_by_check cr ON cr.checkId = ic.id
),
check_financial AS (
  SELECT
    cr.*,
    CASE WHEN cr.isCashed = 1 THEN 0 ELSE MAX(0, cr.checkAmount - cr.recoveryPaid) END AS cashRemaining,
    CASE WHEN cr.isCashed = 1 THEN MAX(0, cr.checkAmount - cr.recoveryPaid) ELSE 0 END AS cashedCheckRemainder
  FROM check_rows cr
),
check_rollup AS (
  SELECT
    saleId,
    COALESCE(SUM(cashedCheckRemainder), 0) AS cashedCheckRemainder,
    MAX(isBounced) AS hasBouncedCheck
  FROM check_financial
  GROUP BY saleId
),
sale_receivable AS (
  SELECT
    isale.id AS saleId,
    MAX(0, COALESCE(isale.actualSalePrice, 0) - COALESCE(isale.downPayment, 0)) AS contractDebt,
    MAX(0, COALESCE(ts.transactionPaid, 0)) AS transactionPaid,
    MAX(0, COALESCE(cr.cashedCheckRemainder, 0)) AS cashedCheckRemainder,
    MAX(0, COALESCE(ts.transactionPaid, 0) + COALESCE(cr.cashedCheckRemainder, 0)) AS collectedAfterDownPayment,
    CASE
      WHEN LOWER(TRIM(COALESCE(isale.status,''))) IN ('canceled','cancelled') THEN 0
      ELSE MAX(
        0,
        MAX(0, COALESCE(isale.actualSalePrice, 0) - COALESCE(isale.downPayment, 0))
          - MAX(0, COALESCE(ts.transactionPaid, 0) + COALESCE(cr.cashedCheckRemainder, 0))
      )
    END AS remainingAmount,
    MAX(
      0,
      MAX(0, COALESCE(ts.transactionPaid, 0) + COALESCE(cr.cashedCheckRemainder, 0))
        - MAX(0, COALESCE(isale.actualSalePrice, 0) - COALESCE(isale.downPayment, 0))
    ) AS overpaymentAmount,
    MAX(0, COALESCE(ts.normalInstallmentPaid, 0)) AS normalInstallmentPaid
  FROM installment_sales isale
  JOIN directory_scope scoped_sale ON scoped_sale.id = isale.id
  LEFT JOIN transaction_by_sale ts ON ts.saleId = isale.id
  LEFT JOIN check_rollup cr ON cr.saleId = isale.id
),
normal_payment_physical AS (
  SELECT
    pb.id,
    pb.saleId,
    pb.installmentNumber,
    pb.dueDate,
    MAX(0, COALESCE(pb.amountDue, 0) - COALESCE(pb.transactionPaid, 0)) AS physicalRemaining
  FROM payment_base pb
  WHERE pb.sourceType = 'installment'
),
normal_payment_window AS (
  SELECT
    np.*,
    COALESCE(
      SUM(np.physicalRemaining) OVER (
        PARTITION BY np.saleId
        ORDER BY np.installmentNumber ASC, np.id ASC
        ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
      ),
      0
    ) AS priorPhysicalRemaining
  FROM normal_payment_physical np
),
normal_payment_due AS (
  SELECT
    nw.*,
    MAX(
      0,
      nw.physicalRemaining - MAX(
        0,
        MAX(0, sr.collectedAfterDownPayment - sr.normalInstallmentPaid) - nw.priorPhysicalRemaining
      )
    ) AS paymentRemaining
  FROM normal_payment_window nw
  JOIN sale_receivable sr ON sr.saleId = nw.saleId
),
normal_payment_open_ranked AS (
  SELECT
    nd.*,
    ROW_NUMBER() OVER (
      PARTITION BY nd.saleId
      ORDER BY nd.installmentNumber ASC, nd.id ASC
    ) AS openRank
  FROM normal_payment_due nd
  WHERE nd.paymentRemaining > 0.00001
),
payment_schedule AS (
  SELECT
    saleId,
    MAX(CASE WHEN openRank = 1 THEN dueDate END) AS nextDueDate,
    MAX(CASE WHEN openRank = 1 THEN paymentRemaining ELSE 0 END) AS nextDueAmount,
    SUM(CASE WHEN dueDate < '${todayJalali}' THEN 1 ELSE 0 END) AS overdueInstallmentsCount,
    COALESCE(SUM(CASE WHEN dueDate < '${todayJalali}' THEN paymentRemaining ELSE 0 END), 0) AS overdueAmount
  FROM normal_payment_open_ranked
  GROUP BY saleId
),
check_open_ranked AS (
  SELECT
    cf.*,
    ROW_NUMBER() OVER (
      PARTITION BY cf.saleId
      ORDER BY cf.dueDate ASC, cf.id ASC
    ) AS openRank
  FROM check_financial cf
  WHERE cf.cashRemaining > 0.00001
),
check_schedule AS (
  SELECT
    cor.saleId,
    MAX(CASE WHEN cor.openRank = 1 THEN cor.dueDate END) AS nextDueDate,
    MAX(CASE WHEN cor.openRank = 1 THEN cor.cashRemaining ELSE 0 END) AS nextDueAmount,
    SUM(CASE WHEN cor.dueDate < '${todayJalali}' THEN 1 ELSE 0 END) AS overdueInstallmentsCount,
    COALESCE(SUM(CASE WHEN cor.dueDate < '${todayJalali}' THEN cor.cashRemaining ELSE 0 END), 0) AS overdueAmount,
    COALESCE(MAX(cr.hasBouncedCheck), 0) AS hasBouncedCheck
  FROM check_open_ranked cor
  LEFT JOIN check_rollup cr ON cr.saleId = cor.saleId
  GROUP BY cor.saleId
),
${includeLatestCollection ? `
latest_collection_events AS (
  SELECT
    ip.saleId AS saleId,
    it.id AS eventId,
    it.amount_paid AS amount,
    it.payment_date AS eventDate,
    CASE
      WHEN COALESCE(ip.sourceType, 'installment') = 'check_recovery' THEN 'check_recovery'
      ELSE 'installment'
    END AS source
  FROM installment_transactions it
  JOIN installment_payments ip ON ip.id = it.installment_payment_id
  JOIN directory_scope scoped_sale ON scoped_sale.id = ip.saleId

  UNION ALL

  SELECT
    ic.saleId AS saleId,
    -cl.id AS eventId,
    cl.credit AS amount,
    cl.transactionDate AS eventDate,
    'check_cashed' AS source
  FROM customer_ledger cl
  JOIN installment_checks ic ON ic.id = cl.referenceId
  JOIN directory_scope scoped_sale ON scoped_sale.id = ic.saleId
  WHERE cl.referenceType = 'installment_check_cashed'
    AND COALESCE(cl.credit, 0) > 0
),
latest_collection_ranked AS (
  SELECT
    lce.*,
    ROW_NUMBER() OVER (
      PARTITION BY lce.saleId
      ORDER BY lce.eventDate DESC, lce.eventId DESC
    ) AS eventRank
  FROM latest_collection_events lce
),
latest_collection AS (
  SELECT saleId, amount, eventDate, source
  FROM latest_collection_ranked
  WHERE eventRank = 1
),
` : `
latest_collection AS (
  SELECT
    CAST(NULL AS INTEGER) AS saleId,
    CAST(NULL AS REAL) AS amount,
    CAST(NULL AS TEXT) AS eventDate,
    CAST(NULL AS TEXT) AS source
  WHERE 0
),
`}
directory_base AS (
  SELECT
    isale.*,
    c.fullName AS customerFullName,
    p.model AS phoneModel,
    p.imei AS phoneImei,
    p.purchaseDate AS phonePurchaseDate,
    p.registerDate AS phoneRegisterDate,
    p.saleDate AS phoneSaleDate,
    isale.actualSalePrice AS totalInstallmentPrice,
    COALESCE(NULLIF(isale.saleDateISO,''), isale.dateCreated) AS directorySortDate,
    sr.remainingAmount,
    MAX(0, COALESCE(isale.downPayment, 0) + sr.collectedAfterDownPayment) AS collectedAmount,
    sr.overpaymentAmount,
    CASE WHEN isale.saleType = 'check' OR COALESCE(isale.numberOfInstallments, 0) = 0 THEN 1 ELSE 0 END AS isCheckSale,
    CASE
      WHEN isale.saleType = 'check' OR COALESCE(isale.numberOfInstallments, 0) = 0 THEN cs.nextDueDate
      ELSE ps.nextDueDate
    END AS rawNextDueDate,
    CASE
      WHEN isale.saleType = 'check' OR COALESCE(isale.numberOfInstallments, 0) = 0 THEN COALESCE(cs.nextDueAmount, 0)
      ELSE COALESCE(ps.nextDueAmount, 0)
    END AS rawNextDueAmount,
    CASE
      WHEN isale.saleType = 'check' OR COALESCE(isale.numberOfInstallments, 0) = 0 THEN COALESCE(cs.overdueInstallmentsCount, 0)
      ELSE COALESCE(ps.overdueInstallmentsCount, 0)
    END AS rawOverdueInstallmentsCount,
    CASE
      WHEN isale.saleType = 'check' OR COALESCE(isale.numberOfInstallments, 0) = 0 THEN COALESCE(cs.overdueAmount, 0)
      ELSE COALESCE(ps.overdueAmount, 0)
    END AS rawOverdueAmount,
    CASE
      WHEN isale.saleType = 'check' OR COALESCE(isale.numberOfInstallments, 0) = 0 THEN COALESCE(cs.hasBouncedCheck, cr.hasBouncedCheck, 0)
      ELSE 0
    END AS rawHasBouncedCheck,
    lc.eventDate AS latestEventDate,
    lc.amount AS latestEventAmount,
    lc.source AS latestEventSource
  FROM installment_sales isale
  JOIN directory_scope scoped_sale ON scoped_sale.id = isale.id
  JOIN customers c ON c.id = isale.customerId
  LEFT JOIN phones p ON p.id = isale.phoneId
  JOIN sale_receivable sr ON sr.saleId = isale.id
  LEFT JOIN payment_schedule ps ON ps.saleId = isale.id
  LEFT JOIN check_schedule cs ON cs.saleId = isale.id
  LEFT JOIN check_rollup cr ON cr.saleId = isale.id
  LEFT JOIN latest_collection lc ON lc.saleId = isale.id
),
directory_status AS (
  SELECT
    db.*,
    CASE
      WHEN LOWER(TRIM(COALESCE(db.status,''))) IN ('canceled','cancelled') THEN 'فسخ شده'
      WHEN db.remainingAmount <= 0.00001 THEN 'تکمیل شده'
      WHEN db.rawHasBouncedCheck = 1 OR db.rawOverdueInstallmentsCount > 0 THEN 'معوق'
      ELSE 'در حال پرداخت'
    END AS overallStatus,
    CASE
      WHEN LOWER(TRIM(COALESCE(db.status,''))) IN ('canceled','cancelled') OR db.remainingAmount <= 0.00001 THEN NULL
      ELSE db.rawNextDueDate
    END AS nextDueDate,
    CASE
      WHEN LOWER(TRIM(COALESCE(db.status,''))) IN ('canceled','cancelled') OR db.remainingAmount <= 0.00001 THEN 0
      ELSE db.rawNextDueAmount
    END AS nextDueAmount,
    CASE
      WHEN LOWER(TRIM(COALESCE(db.status,''))) IN ('canceled','cancelled') OR db.remainingAmount <= 0.00001 THEN 0
      ELSE db.rawOverdueInstallmentsCount
    END AS overdueInstallmentsCount,
    CASE
      WHEN LOWER(TRIM(COALESCE(db.status,''))) IN ('canceled','cancelled') OR db.remainingAmount <= 0.00001 THEN 0
      ELSE db.rawOverdueAmount
    END AS overdueAmount,
    CASE
      WHEN LOWER(TRIM(COALESCE(db.status,''))) IN ('canceled','cancelled') THEN 0
      ELSE db.rawHasBouncedCheck
    END AS hasBouncedCheck,
    COALESCE(db.latestEventDate, CASE WHEN COALESCE(db.downPayment, 0) > 0 THEN COALESCE(NULLIF(db.saleDateISO,''), db.saleDate, db.dateCreated) END) AS lastCollectionDate,
    MAX(0, COALESCE(db.latestEventAmount, CASE WHEN COALESCE(db.downPayment, 0) > 0 THEN db.downPayment ELSE 0 END)) AS lastCollectionAmount,
    COALESCE(db.latestEventSource, CASE WHEN COALESCE(db.downPayment, 0) > 0 THEN 'down_payment' END) AS lastCollectionSource
  FROM directory_base db
),
directory_enriched AS (
  SELECT
    ds.*,
    CASE
      WHEN ds.overallStatus = 'فسخ شده' THEN 'inactive'
      WHEN ds.overallStatus = 'تکمیل شده' OR ds.remainingAmount <= 0.00001 THEN 'settled'
      WHEN ds.hasBouncedCheck = 1 THEN 'high'
      WHEN ds.overdueInstallmentsCount >= 2 THEN 'high'
      WHEN ds.nextDueDate IS NOT NULL AND ds.nextDueDate <= '${highRiskCutoffJalali}' THEN 'high'
      WHEN ds.overallStatus = 'معوق' OR ds.overdueInstallmentsCount > 0 OR (ds.nextDueDate IS NOT NULL AND ds.nextDueDate < '${todayJalali}') THEN 'followup'
      WHEN ds.nextDueDate IS NOT NULL AND ds.nextDueDate >= '${todayJalali}' AND ds.nextDueDate <= '${dueSoonJalali}' THEN 'due-soon'
      ELSE 'normal'
    END AS collectionRisk,
    CASE
      WHEN ds.overallStatus = 'فسخ شده' THEN 0
      WHEN ds.overallStatus = 'تکمیل شده' OR ds.remainingAmount <= 0.00001 THEN 0
      WHEN ds.hasBouncedCheck = 1 THEN 4
      WHEN ds.overdueInstallmentsCount >= 2 THEN 4
      WHEN ds.nextDueDate IS NOT NULL AND ds.nextDueDate <= '${highRiskCutoffJalali}' THEN 4
      WHEN ds.overallStatus = 'معوق' OR ds.overdueInstallmentsCount > 0 OR (ds.nextDueDate IS NOT NULL AND ds.nextDueDate < '${todayJalali}') THEN 3
      WHEN ds.nextDueDate IS NOT NULL AND ds.nextDueDate >= '${todayJalali}' AND ds.nextDueDate <= '${dueSoonJalali}' THEN 2
      ELSE 1
    END AS riskRank
  FROM directory_status ds
)
`;

const mapInstallmentDirectoryRowToFrontend = (row: any): FrontendInstallmentSale => {
  const {
    __total,
    collectionRisk,
    riskRank,
    directorySortDate,
    isCheckSale,
    rawNextDueDate,
    rawNextDueAmount,
    rawOverdueInstallmentsCount,
    rawOverdueAmount,
    rawHasBouncedCheck,
    latestEventDate,
    latestEventAmount,
    latestEventSource,
    contractDebt,
    transactionPaid,
    cashedCheckRemainder,
    collectedAfterDownPayment,
    normalInstallmentPaid,
    ...sale
  } = row || {};

  return {
    ...sale,
    payments: [],
    checks: [],
    remainingAmount: Math.max(0, Number(sale.remainingAmount || 0)),
    collectedAmount: Math.max(0, Number(sale.collectedAmount || 0)),
    nextDueAmount: Math.max(0, Number(sale.nextDueAmount || 0)),
    overdueInstallmentsCount: Math.max(0, Number(sale.overdueInstallmentsCount || 0)),
    overdueAmount: Math.max(0, Number(sale.overdueAmount || 0)),
    hasBouncedCheck: Boolean(Number(sale.hasBouncedCheck || 0)),
    overpaymentAmount: Math.max(0, Number(sale.overpaymentAmount || 0)),
    lastCollectionAmount: Math.max(0, Number(sale.lastCollectionAmount || 0)),
  } as FrontendInstallmentSale;
};

export const listInstallmentSalesForCustomerFromDb = async (
  customerId: number,
): Promise<FrontendInstallmentSale[]> => {
  await getDbInstance();
  const safeCustomerId = Math.floor(Number(customerId || 0));
  if (!Number.isInteger(safeCustomerId) || safeCustomerId <= 0) return [];

  const now = moment();
  const todayJalali = now.clone().locale("en").format("jYYYY/jMM/jDD");
  const dueSoonJalali = now.clone().add(7, "days").locale("en").format("jYYYY/jMM/jDD");
  const highRiskCutoffJalali = now.clone().subtract(30, "days").locale("en").format("jYYYY/jMM/jDD");
  const scopedCtes = buildInstallmentDirectoryCtes(
    todayJalali,
    dueSoonJalali,
    highRiskCutoffJalali,
    "SELECT id FROM installment_sales WHERE customerId = ?",
  );

  const rows = await allAsync(
    `${scopedCtes}
     SELECT de.*
       FROM directory_enriched de
      ORDER BY saleDateISO DESC, id DESC`,
    [safeCustomerId],
  );

  return (rows || []).map(mapInstallmentDirectoryRowToFrontend);
};

export const listInstallmentCustomerDueOverviewFromDb = async (customerIds: number[] = []): Promise<
  InstallmentCustomerDueOverview[]
> => {
  await getDbInstance();

  const now = moment();
  const todayJalali = now.clone().locale("en").format("jYYYY/jMM/jDD");
  const dueSoonJalali = now.clone().add(7, "days").locale("en").format("jYYYY/jMM/jDD");
  const highRiskCutoffJalali = now.clone().subtract(30, "days").locale("en").format("jYYYY/jMM/jDD");
  const safeCustomerIds = [...new Set((customerIds || []).map(Number).filter((id) => Number.isInteger(id) && id > 0))].slice(0, 100);
  const customerScopeSql = safeCustomerIds.length
    ? ` AND customerId IN (${safeCustomerIds.map(() => '?').join(',')})`
    : '';
  const activeScopeSql = `
    SELECT id
      FROM installment_sales
     WHERE LOWER(TRIM(COALESCE(status,''))) NOT IN ('canceled','cancelled')
       ${customerScopeSql}
  `;
  const scopedCtes = buildInstallmentDirectoryCtes(
    todayJalali,
    dueSoonJalali,
    highRiskCutoffJalali,
    activeScopeSql,
    false,
  );

  const rows = await allAsync(`${scopedCtes},
    customer_due_ranked AS (
      SELECT
        customerId,
        id AS saleId,
        nextDueDate,
        overallStatus,
        COUNT(*) OVER (PARTITION BY customerId) AS openCount,
        ROW_NUMBER() OVER (
          PARTITION BY customerId
          ORDER BY nextDueDate ASC, id DESC
        ) AS dueRank
      FROM directory_enriched
      WHERE overallStatus NOT IN ('تکمیل شده','فسخ شده')
        AND nextDueDate IS NOT NULL
    )
    SELECT customerId, saleId, nextDueDate, overallStatus, openCount
      FROM customer_due_ranked
     WHERE dueRank = 1
     ORDER BY customerId ASC`, safeCustomerIds);

  return (rows || []).map((row: any) => ({
    customerId: Math.max(0, Number(row?.customerId || 0)),
    saleId: Math.max(0, Number(row?.saleId || 0)),
    nextDueDate: row?.nextDueDate ? String(row.nextDueDate) : null,
    openCount: Math.max(0, Number(row?.openCount || 0)),
    overallStatus: row?.overallStatus as FrontendInstallmentSale["overallStatus"],
  }));
};

export const listInstallmentSalesDirectoryFromDb = async (
  query: InstallmentDirectoryQuery = {},
): Promise<InstallmentDirectoryResult> => {
  await getDbInstance();

  const page = Math.max(1, Math.floor(Number(query.page || 1)));
  const pageSize = Math.min(100, Math.max(10, Math.floor(Number(query.pageSize || 30))));
  const search = normalizeInstallmentDirectorySearch(query.search);
  const status = INSTALLMENT_DIRECTORY_STATUS_VALUES.has(String(query.status || ""))
    ? String(query.status)
    : "";
  const risk = INSTALLMENT_DIRECTORY_RISK_VALUES.has(query.risk as InstallmentDirectoryRiskFilter)
    ? String(query.risk)
    : "";
  const sort: InstallmentDirectorySort = Object.prototype.hasOwnProperty.call(
    INSTALLMENT_DIRECTORY_SORTS,
    query.sort,
  )
    ? (query.sort as InstallmentDirectorySort)
    : "latest";

  const now = moment();
  const todayJalali = now.clone().locale("en").format("jYYYY/jMM/jDD");
  const dueSoonJalali = now.clone().add(7, "days").locale("en").format("jYYYY/jMM/jDD");
  const highRiskCutoffJalali = now.clone().subtract(30, "days").locale("en").format("jYYYY/jMM/jDD");
  const fullCtes = buildInstallmentDirectoryCtes(todayJalali, dueSoonJalali, highRiskCutoffJalali);
  const normalizedSqlText = (column: string) =>
    `REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(${column},''),'ي','ی'),'ك','ک'),'ۀ','ه'),'ة','ه')`;
  const offset = (page - 1) * pageSize;
  const orderSql = INSTALLMENT_DIRECTORY_SORTS[sort];
  const fastLatestPath = sort === "latest" && !status && !risk;

  let rows: any[] = [];
  let total = 0;

  if (fastLatestPath) {
    // The default directory path is deliberately two-stage: first resolve just
    // the requested sale IDs using cheap base columns/indexes, then run the
    // financial CTEs only for that page. This prevents every page navigation or
    // search keystroke from re-aggregating the entire payment/check history.
    const baseFilters: string[] = [];
    const baseParams: Array<string | number> = [];
    if (search) {
      const pattern = `%${search}%`;
      const compactPattern = `%${search.replace(/[\s-]+/g, "")}%`;
      baseFilters.push(`(
        CAST(isale.id AS TEXT) LIKE ?
        OR ${normalizedSqlText("c.fullName")} LIKE ?
        OR ${normalizedSqlText("isale.itemsSummary")} LIKE ?
        OR ${normalizedSqlText("p.model")} LIKE ?
        OR REPLACE(REPLACE(COALESCE(p.imei,''), ' ', ''), '-', '') LIKE ?
      )`);
      baseParams.push(pattern, pattern, pattern, pattern, compactPattern);
    }
    const baseWhereSql = baseFilters.length ? `WHERE ${baseFilters.join(" AND ")}` : "";
    if (search) {
      const totalRow = await getAsync(
        `SELECT COUNT(*) AS total
           FROM installment_sales isale
           JOIN customers c ON c.id = isale.customerId
           LEFT JOIN phones p ON p.id = isale.phoneId
           ${baseWhereSql}`,
        baseParams,
      );
      total = Math.max(0, Number(totalRow?.total || 0));
    } else {
      const totalRow = await getAsync("SELECT COUNT(*) AS total FROM installment_sales");
      total = Math.max(0, Number(totalRow?.total || 0));
    }

    const idRows = total > 0
      ? await allAsync(
          search
            ? `SELECT isale.id
                 FROM installment_sales isale
                 JOIN customers c ON c.id = isale.customerId
                 LEFT JOIN phones p ON p.id = isale.phoneId
                 ${baseWhereSql}
                ORDER BY isale.saleDateISO DESC, isale.id DESC
                LIMIT ? OFFSET ?`
            : `SELECT id
                 FROM installment_sales
                ORDER BY saleDateISO DESC, id DESC
                LIMIT ? OFFSET ?`,
          search ? [...baseParams, pageSize, offset] : [pageSize, offset],
        )
      : [];
    const pageIds = (idRows || [])
      .map((row: any) => Number(row?.id || 0))
      .filter((id: number) => Number.isInteger(id) && id > 0);

    if (pageIds.length > 0) {
      const scopeSql = `VALUES ${pageIds.map((id) => `(${id})`).join(",")}`;
      const scopedCtes = buildInstallmentDirectoryCtes(
        todayJalali,
        dueSoonJalali,
        highRiskCutoffJalali,
        scopeSql,
      );
      rows = await allAsync(
        `${scopedCtes}
         SELECT de.*, ? AS __total
         FROM directory_enriched de
         ORDER BY saleDateISO DESC, id DESC`,
        [total],
      );
    }
  } else {
    const filters: string[] = [];
    const params: Array<string | number> = [];
    if (search) {
      const pattern = `%${search}%`;
      filters.push(`(
        CAST(id AS TEXT) LIKE ?
        OR ${normalizedSqlText("customerFullName")} LIKE ?
        OR ${normalizedSqlText("itemsSummary")} LIKE ?
        OR ${normalizedSqlText("phoneModel")} LIKE ?
        OR REPLACE(REPLACE(COALESCE(phoneImei,''), ' ', ''), '-', '') LIKE ?
      )`);
      const compactPattern = `%${search.replace(/[\s-]+/g, "")}%`;
      params.push(pattern, pattern, pattern, pattern, compactPattern);
    }
    if (status) {
      filters.push("overallStatus = ?");
      params.push(status);
    }
    if (risk) {
      filters.push("collectionRisk = ?");
      params.push(risk);
    }

    const whereSql = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    rows = await allAsync(
      `${fullCtes},
      filtered_directory AS (
        SELECT * FROM directory_enriched
        ${whereSql}
      ),
      directory_meta AS (
        SELECT COUNT(*) AS total FROM filtered_directory
      ),
      paged_directory AS (
        SELECT * FROM filtered_directory
        ORDER BY ${orderSql}
        LIMIT ? OFFSET ?
      )
      SELECT pd.*, dm.total AS __total
      FROM directory_meta dm
      LEFT JOIN paged_directory pd ON 1 = 1
      ORDER BY ${orderSql}`,
      [...params, pageSize, offset],
    );
    total = Math.max(0, Number(rows?.[0]?.__total || 0));
  }

  const items: FrontendInstallmentSale[] = (rows || [])
    .filter((row: any) => row?.id != null)
    .map(mapInstallmentDirectoryRowToFrontend);

  let summary: InstallmentDirectorySummary | undefined;
  if (query.includeSummary) {
    const summaryRow = await getAsync(`${fullCtes}
      SELECT
        COUNT(*) AS totalCount,
        COALESCE(SUM(CASE WHEN overallStatus <> 'فسخ شده' THEN totalInstallmentPrice ELSE 0 END), 0) AS totalAmountAll,
        COALESCE(SUM(CASE WHEN overallStatus <> 'فسخ شده' THEN remainingAmount ELSE 0 END), 0) AS totalRemainingAll,
        COALESCE(SUM(CASE WHEN overallStatus <> 'فسخ شده' THEN collectedAmount ELSE 0 END), 0) AS totalCollectedAll,
        COALESCE(SUM(CASE WHEN overallStatus = 'معوق' THEN 1 ELSE 0 END), 0) AS overdueAll,
        COALESCE(SUM(CASE WHEN overallStatus = 'در حال پرداخت' THEN 1 ELSE 0 END), 0) AS activeAll,
        COALESCE(SUM(CASE WHEN overallStatus = 'تکمیل شده' THEN 1 ELSE 0 END), 0) AS doneAll,
        COALESCE(SUM(CASE WHEN overallStatus = 'فسخ شده' THEN 1 ELSE 0 END), 0) AS canceledAll,
        COALESCE(SUM(CASE WHEN overallStatus NOT IN ('تکمیل شده','فسخ شده') AND nextDueDate >= ? AND nextDueDate <= ? THEN 1 ELSE 0 END), 0) AS nextDueSoon,
        COALESCE(SUM(CASE WHEN collectionRisk = 'high' THEN 1 ELSE 0 END), 0) AS highRiskAll
      FROM directory_enriched`, [todayJalali, dueSoonJalali]);
    summary = {
      totalCount: Math.max(0, Number(summaryRow?.totalCount || 0)),
      totalAmountAll: Math.max(0, Number(summaryRow?.totalAmountAll || 0)),
      totalRemainingAll: Math.max(0, Number(summaryRow?.totalRemainingAll || 0)),
      totalCollectedAll: Math.max(0, Number(summaryRow?.totalCollectedAll || 0)),
      overdueAll: Math.max(0, Number(summaryRow?.overdueAll || 0)),
      activeAll: Math.max(0, Number(summaryRow?.activeAll || 0)),
      doneAll: Math.max(0, Number(summaryRow?.doneAll || 0)),
      canceledAll: Math.max(0, Number(summaryRow?.canceledAll || 0)),
      nextDueSoon: Math.max(0, Number(summaryRow?.nextDueSoon || 0)),
      highRiskAll: Math.max(0, Number(summaryRow?.highRiskAll || 0)),
    };
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return {
    items,
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
      hasMore: page < totalPages,
    },
    ...(summary ? { summary } : {}),
  };
};

export const getAllInstallmentSalesFromDb = async (): Promise<
  FrontendInstallmentSale[]
> => {
  await getDbInstance();

  // Legacy compatibility endpoint: keep the historical array shape, but never
  // fall back to per-sale/per-payment queries. The same batch CTE used by the
  // paginated directory computes receivables, due dates, check state and latest
  // collection for the complete result set in one database round-trip.
  const now = moment();
  const todayJalali = now.clone().locale("en").format("jYYYY/jMM/jDD");
  const dueSoonJalali = now.clone().add(7, "days").locale("en").format("jYYYY/jMM/jDD");
  const highRiskCutoffJalali = now.clone().subtract(30, "days").locale("en").format("jYYYY/jMM/jDD");
  const fullCtes = buildInstallmentDirectoryCtes(
    todayJalali,
    dueSoonJalali,
    highRiskCutoffJalali,
  );

  const rows = await allAsync(
    `${fullCtes}
     SELECT de.*
       FROM directory_enriched de
      ORDER BY COALESCE(NULLIF(saleDateISO,''), dateCreated) DESC, id DESC`,
  );

  return (rows || []).map(mapInstallmentDirectoryRowToFrontend);
};

export const getInstallmentSaleByIdFromDb = async (
  saleId: number,
): Promise<FrontendInstallmentSale | null> => {
  await getDbInstance();

  const saleDb = await getAsync(
    `
    SELECT 
        isale.*, 
        c.fullName as customerFullName, 
        p.model as phoneModel, 
        p.imei as phoneImei,
        p.purchaseDate as phonePurchaseDate,
        p.registerDate as phoneRegisterDate,
        p.saleDate as phoneSaleDate,
        isale.actualSalePrice as totalInstallmentPrice
    FROM installment_sales isale
    JOIN customers c ON isale.customerId = c.id
    LEFT JOIN phones p ON isale.phoneId = p.id
    WHERE isale.id = ?
  `,
    [saleId],
  );

  if (!saleDb) return null;

  const cancellation = await getAsync(
    `SELECT id, saleId, mode, reason, returnPhysicalItems, returnUnusedChecks,
            contractDebt, downPayment, collectedAfterDownPayment, remainingBeforeCancellation,
            overpaymentBeforeCancellation, expectedRefundDue, ledgerReversalCredit,
            downPaymentRefundCredit, settlementStatus, reconciliationIssueCount, createdAt
       FROM installment_sale_cancellations
      WHERE saleId = ? LIMIT 1`,
    [saleDb.id],
  ).catch(() => null as any);

  // اقساط و چک‌ها
  const payments: any[] = await allAsync(
    "SELECT * FROM installment_payments WHERE saleId = ? ORDER BY installmentNumber ASC",
    [saleDb.id],
  );
  const checksRaw: any[] = await allAsync(
    "SELECT * FROM installment_checks WHERE saleId = ? ORDER BY dueDate ASC",
    [saleDb.id],
  );
  const checks = (checksRaw || []).map((c: any) => ({
    ...c,
    status: normalizeCheckStatus(c.status),
  }));

  // اقلام (گوشی/لوازم/خدمات) - برای نمایش در جزئیات
  const items: any[] = await allAsync(
    `SELECT isi.itemType, isi.itemId, isi.description, isi.quantity, isi.unitPrice, isi.buyPrice, isi.totalPrice,
            ph.currentPurchasePrice AS phoneCurrentPurchasePrice,
            ph.purchasePrice AS phonePurchasePrice,
            CASE
              WHEN isi.itemType = 'phone' AND COALESCE(NULLIF(ph.currentPurchasePrice, 0), 0) > 0 THEN 'currentPurchasePrice'
              WHEN COALESCE(NULLIF(isi.buyPrice, 0), 0) > 0 THEN 'documentBuyPrice'
              WHEN isi.itemType = 'phone' AND COALESCE(NULLIF(ph.purchasePrice, 0), 0) > 0 THEN 'purchasePrice'
              ELSE 'unknown'
            END AS costBasisSource
       FROM installment_sale_items isi
       LEFT JOIN phones ph ON isi.itemType = 'phone' AND ph.id = isi.itemId
      WHERE isi.saleId = ?
      ORDER BY isi.id ASC`,
    [saleDb.id],
  ).catch(() => []);

  const receivableState = await getInstallmentSaleReceivableState(Number(saleDb.id));
  let nextDueDate: string | null = null;
  let overallStatus: OverallStatus = "در حال پرداخت";
  let normalInstallmentTransactionPaid = 0;

  // تراکنش‌ها روی همه paymentها خوانده می‌شوند؛ check_recovery فقط برای تاریخچه چک است
  // و در برنامه اقساط به‌عنوان «قسط صفر» نمایش داده نمی‌شود.
  for (const p of payments) {
    let txs: any[] = [];
    try {
      txs = await allAsync(
        `SELECT id, installment_payment_id, amount_paid, payment_date, notes
         FROM installment_transactions
         WHERE installment_payment_id = ?
         ORDER BY payment_date ASC, id ASC`,
        [p.id],
      );
    } catch (_e) {
      txs = [];
    }

    (p as any).transactions = txs;
    const physicalPaid = txs.reduce(
      (sum: number, t: any) => sum + Number(t.amount_paid || 0),
      0,
    );
    (p as any).computedPaid = physicalPaid;
    (p as any).computedRemaining = Math.max(
      0,
      Number(p.amountDue || 0) - physicalPaid,
    );
    if (String((p as any).sourceType || "installment") !== "check_recovery") {
      normalInstallmentTransactionPaid += physicalPaid;
    }
  }

  const checkRecoveryByCheckId = new Map<
    number,
    { paid: number; remaining: number; paymentId: number; transactions: any[] }
  >();
  for (const p of payments) {
    if ((p as any).sourceType !== "check_recovery" || !(p as any).sourceId)
      continue;
    const paid = Number((p as any).computedPaid || 0);
    checkRecoveryByCheckId.set(Number((p as any).sourceId), {
      paid,
      remaining: Math.max(0, Number((p as any).amountDue || 0) - paid),
      paymentId: Number((p as any).id),
      transactions: (p as any).transactions || [],
    });
  }
  const checkLedgerRows = await allAsync(
    `SELECT referenceId AS checkId, credit, transactionDate
       FROM customer_ledger
      WHERE referenceType = 'installment_check_cashed'
        AND referenceId IN (SELECT id FROM installment_checks WHERE saleId = ?)`,
    [saleDb.id],
  ).catch(() => [] as any[]);
  const checkLedgerByCheckId = new Map<number, any>();
  for (const row of checkLedgerRows || []) {
    checkLedgerByCheckId.set(Number(row?.checkId || 0), row);
  }

  for (const c of checks) {
    const recovery = checkRecoveryByCheckId.get(Number((c as any).id));
    const cashLedger = checkLedgerByCheckId.get(Number((c as any).id));
    (c as any).cashPaid = recovery?.paid || 0;
    const cashOutstandingBeforeStatus = Math.max(
      0,
      Number((c as any).amount || 0) - Number((c as any).cashPaid || 0),
    );
    (c as any).cashedRemainder =
      c.status === "نقد شد" ? cashOutstandingBeforeStatus : 0;
    (c as any).cashRemaining =
      c.status === "نقد شد" ? 0 : cashOutstandingBeforeStatus;
    (c as any).cashPaymentId = recovery?.paymentId || null;
    (c as any).cashTransactions = recovery?.transactions || [];
    (c as any).cashedLedgerAmount = Math.max(0, Number(cashLedger?.credit || 0));
    (c as any).cashedLedgerDate = cashLedger?.transactionDate || null;
  }

  const scheduledPayments = payments.filter(
    (p: any) => String(p?.sourceType || "installment") !== "check_recovery",
  );

  // وصول از مسیر چک یک دریافت واقعی قرارداد است. برای نمایش برنامه اقساط،
  // این دریافت به‌صورت FIFO روی قدیمی‌ترین مانده‌ها اعمال می‌شود بدون ساخت تراکنش جعلی.
  let externalCollectionToAllocate = Math.max(
    0,
    receivableState.collectedAfterDownPayment - normalInstallmentTransactionPaid,
  );
  for (const p of scheduledPayments) {
    const physicalPaid = Number((p as any).computedPaid || 0);
    const physicalRemaining = Math.max(
      0,
      Number(p.amountDue || 0) - physicalPaid,
    );
    const externalCovered = Math.min(physicalRemaining, externalCollectionToAllocate);
    externalCollectionToAllocate = Math.max(
      0,
      externalCollectionToAllocate - externalCovered,
    );
    const effectivePaid = physicalPaid + externalCovered;
    const effectiveRemaining = Math.max(0, Number(p.amountDue || 0) - effectivePaid);
    (p as any).externalCovered = externalCovered;
    (p as any).computedPaid = effectivePaid;
    (p as any).computedRemaining = effectiveRemaining;
    (p as any).persistedStatus = p.status;
    p.status =
      effectiveRemaining <= 0.00001
        ? "پرداخت شده"
        : effectivePaid > 0.00001
          ? "پرداخت جزئی"
          : p.status;
  }

  const remainingAmount = receivableState.remaining;
  const isCheckSale =
    saleDb.saleType === "check" ||
    Number(saleDb.numberOfInstallments || 0) === 0;

  const saleCanceled = ["canceled", "cancelled"].includes(String(saleDb.status || "").trim().toLowerCase());
  if (saleCanceled) {
    overallStatus = "فسخ شده";
    nextDueDate = null;
  } else if (isCheckSale) {
    const unsettled = checks.filter(
      (c: any) =>
        c.status !== "نقد شد" &&
        Number((c as any).cashRemaining ?? c.amount ?? 0) > 0.00001,
    );
    nextDueDate = remainingAmount <= 0.00001 ? null : unsettled[0]?.dueDate ?? null;
    const hasBounced = checks.some((c: any) => c.status === "برگشت خورد");
    const hasOverdueChecks = unsettled.some((c: any) => {
      try {
        return moment(c.dueDate, "jYYYY/jMM/jDD").isBefore(moment(), "day");
      } catch {
        return false;
      }
    });
    overallStatus =
      remainingAmount <= 0.00001
        ? "تکمیل شده"
        : hasBounced || hasOverdueChecks
          ? "معوق"
          : "در حال پرداخت";
  } else {
    const unpaidSchedule = scheduledPayments.filter(
      (p: any) => Number(p.computedRemaining || 0) > 0.00001,
    );
    nextDueDate = remainingAmount <= 0.00001 ? null : unpaidSchedule[0]?.dueDate ?? null;
    const hasOverdue = unpaidSchedule.some((p: any) => {
      try {
        return moment(p.dueDate, "jYYYY/jMM/jDD").isBefore(moment(), "day");
      } catch {
        return false;
      }
    });
    overallStatus =
      remainingAmount <= 0.00001
        ? "تکمیل شده"
        : hasOverdue
          ? "معوق"
          : "در حال پرداخت";
  }

  const cancellationRefund = cancellation?.id
    ? await getInstallmentCancellationRefundStateFromDb(Number(saleDb.id))
    : null;

  return {
    ...saleDb,
    items,
    payments: scheduledPayments,
    checks,
    cancellation: cancellation || null,
    cancellationRefund,
    remainingAmount,
    overpaymentAmount: receivableState.overpayment,
    nextDueDate,
    overallStatus,
  };
};

export const updateInstallmentPaymentStatusInDb = async (
  paymentId: number,
  paid: boolean,
  paymentDateShamsi?: string,
): Promise<boolean> => {
  await getDbInstance();
  await assertInstallmentPaymentIsMutable(paymentId);
  const status = paid ? "پرداخت شده" : "پرداخت نشده";
  const paymentDate = paid && paymentDateShamsi ? paymentDateShamsi : null;

  const result = await runAsync(
    "UPDATE installment_payments SET status = ?, paymentDate = ? WHERE id = ?",
    [status, paymentDate, paymentId],
  );
  return result.changes > 0;
};

export const updateCheckStatusInDb = async (
  checkId: number,
  status: CheckStatus,
): Promise<boolean> => {
  await getDbInstance();
  await assertInstallmentCheckIsMutable(checkId);
  await execAsync("BEGIN TRANSACTION;");
  try {
    const normalizedStatus = normalizeCheckStatus(status);
    const eventDateIso = new Date().toISOString();
    const result = await runAsync(
      `UPDATE installment_checks
          SET status = ?,
              cashedAt = CASE
                WHEN ? = 'نقد شد' THEN COALESCE(cashedAt, ?)
                ELSE NULL
              END
        WHERE id = ?`,
      [normalizedStatus, normalizedStatus, eventDateIso, checkId],
    );
    if (result.changes > 0) {
      const stored = await getAsync(
        "SELECT cashedAt FROM installment_checks WHERE id = ?",
        [checkId],
      );
      await syncInstallmentCheckCustomerLedger(
        checkId,
        normalizedStatus,
        normalizedStatus === "نقد شد" ? String(stored?.cashedAt || eventDateIso) : null,
      );
    }
    await execAsync("COMMIT;");
    return result.changes > 0;
  } catch (error) {
    await execAsync("ROLLBACK;");
    throw error;
  }
};

export const addCheckRecoveryPaymentToDb = async (
  checkId: number,
  amount: number,
  isoDate: string,
  notes?: string,
) => {
  await execAsync("BEGIN TRANSACTION;");
  try {
    const check = await getAsync(
      `SELECT ic.*, isale.customerId, isale.id as saleId, isale.saleDateISO, isale.saleDate, isale.dateCreated, isale.status AS saleStatus
         FROM installment_checks ic
         JOIN installment_sales isale ON isale.id = ic.saleId
        WHERE ic.id = ?`,
      [checkId],
    );
    if (!check) throw new Error("چک مورد نظر برای ثبت دریافت نقدی یافت نشد.");
    if (["canceled", "cancelled"].includes(String(check.saleStatus || "").trim().toLowerCase())) {
      throw new Error("این قرارداد فسخ شده است و ثبت دریافت جدید برای چک‌های آن مجاز نیست.");
    }

    const normalizedStatus = normalizeCheckStatus(check.status);
    if (!["برگشت خورد", "به مشتری برگشت داده شده"].includes(normalizedStatus)) {
      throw new Error(
        "دریافت نقدی فقط برای چک برگشت‌خورده یا چک برگشت‌داده‌شده به مشتری فعال است.",
      );
    }

    const normalizedAmount = Number(amount);
    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      throw new Error("مبلغ دریافت نقدی باید عدد مثبت باشد.");
    }
    const normalizedReceiptDate = normalizeInstallmentAccountingDate(isoDate);
    if (!normalizedReceiptDate) throw new Error("تاریخ دریافت نامعتبر است.");
    const receiptDay = moment(normalizedReceiptDate, "YYYY-MM-DD", true);
    if (!receiptDay?.isValid?.()) throw new Error("تاریخ دریافت نامعتبر است.");
    if (receiptDay.clone().startOf("day").isAfter(moment().startOf("day"))) {
      throw new Error("تاریخ دریافت نمی‌تواند در آینده باشد.");
    }
    const saleAccountingDate =
      String(check.saleDateISO || "").trim() ||
      normalizeInstallmentAccountingDate(check.saleDate, check.dateCreated);
    if (saleAccountingDate) {
      const saleAccountingDay = moment(saleAccountingDate, "YYYY-MM-DD", true);
      if (saleAccountingDay?.isValid?.() && receiptDay.isBefore(saleAccountingDay, "day")) {
        throw new Error("تاریخ دریافت نمی‌تواند قبل از تاریخ فروش باشد.");
      }
    }

    let payment = await getAsync(
      `SELECT * FROM installment_payments WHERE saleId = ? AND sourceType = 'check_recovery' AND sourceId = ? LIMIT 1`,
      [check.saleId, checkId],
    );

    if (!payment) {
      const countRow = await getAsync(
        `SELECT COALESCE(MAX(installmentNumber), 0) as maxNo FROM installment_payments WHERE saleId = ?`,
        [check.saleId],
      );
      const installmentNumber = Number(countRow?.maxNo || 0) + 1;
      const result = await runAsync(
        `INSERT INTO installment_payments (saleId, installmentNumber, dueDate, amountDue, paymentDate, status, sourceType, sourceId)
         VALUES (?, ?, ?, ?, NULL, 'پرداخت نشده', 'check_recovery', ?)`,
        [
          check.saleId,
          installmentNumber,
          check.dueDate,
          Number(check.amount || 0),
          checkId,
        ],
      );
      payment = await getAsync(
        `SELECT * FROM installment_payments WHERE id = ?`,
        [result.lastID],
      );
    }

    await assertInstallmentPaymentAmountIsValid(
      Number(payment.id),
      normalizedAmount,
    );

    const txNotes =
      String(notes || "").trim() ||
      `دریافت نقدی بابت چک شماره ${check.checkNumber}`;
    const result = await runAsync(
      `INSERT INTO installment_transactions (installment_payment_id, amount_paid, payment_date, notes) VALUES (?, ?, ?, ?)`,
      [payment.id, normalizedAmount, isoDate, txNotes],
    );

    const sumResult = await getAsync(
      `SELECT COALESCE(SUM(amount_paid), 0) as totalPaid FROM installment_transactions WHERE installment_payment_id = ?`,
      [payment.id],
    );
    const totalPaid = Number(sumResult?.totalPaid || 0);
    const amountDue = Number(payment.amountDue || check.amount || 0);
    const newStatus: InstallmentPaymentStatus =
      totalPaid >= amountDue
        ? "پرداخت شده"
        : totalPaid > 0
          ? "پرداخت جزئی"
          : "پرداخت نشده";
    const dateToUpdate =
      newStatus === "پرداخت شده" || newStatus === "پرداخت جزئی"
        ? isoDate
        : null;

    await runAsync(
      `UPDATE installment_payments SET status = ?, paymentDate = ? WHERE id = ?`,
      [newStatus, dateToUpdate, payment.id],
    );

    const insertedTx = await getAsync(
      "SELECT * FROM installment_transactions WHERE id = ?",
      [result.lastID],
    );
    await syncInstallmentTransactionCustomerLedger(
      Number(result.lastID),
      Number(payment.id),
      normalizedAmount,
      isoDate,
      txNotes,
    );
    await syncCheckRecoveryLedgerForPayment(Number(payment.id));

    await execAsync("COMMIT;");
    return {
      transaction: insertedTx,
      paymentId: Number(payment.id),
      status: newStatus,
    };
  } catch (error) {
    await execAsync("ROLLBACK;");
    throw error;
  }
};

export const getInstallmentSaleDetailsForSms = async (
  saleId: number,
): Promise<any> => {
  await getDbInstance();
  const query = `
        SELECT
            isale.id as saleId,
            isale.actualSalePrice as totalPrice,
            c.fullName as customerFullName,
            c.phoneNumber as customerPhoneNumber
        FROM installment_sales isale
        JOIN customers c ON isale.customerId = c.id
        WHERE isale.id = ?
    `;
  return await getAsync(query, [saleId]);
};

export const getInstallmentCheckDetailsForSms = async (
  checkId: number,
): Promise<any> => {
  await getDbInstance();
  const query = `
        SELECT
            ic.id as checkId,
            ic.checkNumber,
            ic.dueDate,
            ic.amount,
            c.fullName as customerFullName,
            c.phoneNumber as customerPhoneNumber
        FROM installment_checks ic
        JOIN installment_sales isale ON ic.saleId = isale.id
        JOIN customers c ON isale.customerId = c.id
        WHERE ic.id = ?
    `;
  return await getAsync(query, [checkId]);
};

const applySaleLevelReceiptsToInstallmentRows = async (rows: any[]): Promise<any[]> => {
  const grouped = new Map<number, any[]>();
  for (const row of rows || []) {
    const saleId = Number(row?.saleId || 0);
    if (!saleId) continue;
    const list = grouped.get(saleId) || [];
    list.push(row);
    grouped.set(saleId, list);
  }

  const result: any[] = [];
  for (const [saleId, saleRows] of grouped.entries()) {
    saleRows.sort((a, b) =>
      String(a?.dueDate || "").localeCompare(String(b?.dueDate || "")),
    );
    const state = await getInstallmentSaleReceivableState(saleId);
    const normalTransactionPaid = saleRows.reduce(
      (sum, row) =>
        sum +
        Math.max(
          0,
          Number(row?.originalAmountDue || 0) - Number(row?.physicalRemaining || 0),
        ),
      0,
    );
    let externalCollectionToAllocate = Math.max(
      0,
      state.collectedAfterDownPayment - normalTransactionPaid,
    );

    for (const row of saleRows) {
      const physicalRemaining = Math.max(0, Number(row?.physicalRemaining || 0));
      const externalCovered = Math.min(physicalRemaining, externalCollectionToAllocate);
      externalCollectionToAllocate = Math.max(
        0,
        externalCollectionToAllocate - externalCovered,
      );
      const effectiveRemaining = Math.max(0, physicalRemaining - externalCovered);
      if (effectiveRemaining <= 0.00001 || state.remaining <= 0.00001) continue;
      result.push({
        ...row,
        amountDue: effectiveRemaining,
        externalCovered,
        effectiveRemaining,
      });
    }
  }
  return result;
};

export const getOverdueInstallmentsFromDb = async (): Promise<any[]> => {
  await getDbInstance();
  // This function fetches all unpaid installments. The caller will filter by date
  // as date logic in JS with moment.js is easier and more reliable than in SQLite.
  const query = `
SELECT
    ip.id,
    ip.saleId,
    isale.customerId as customerId,
    ip.dueDate,
    ip.amountDue AS originalAmountDue,
    MAX(0, COALESCE(ip.amountDue,0) - COALESCE((
      SELECT SUM(it.amount_paid)
        FROM installment_transactions it
       WHERE it.installment_payment_id = ip.id
    ),0)) AS physicalRemaining,
    c.fullName as customerFullName,
    c.phoneNumber as customerPhoneNumber,
    c.telegram_chat_id as telegramChatId,
    c.telegram_opted_out as telegramOptedOut,
    c.telegram_invalid as telegramInvalid
FROM installment_payments ip
JOIN installment_sales isale ON ip.saleId = isale.id
JOIN customers c ON isale.customerId = c.id
WHERE COALESCE(ip.sourceType,'installment') = 'installment'
  AND COALESCE(isale.status,'active') = 'active'
  AND COALESCE(ip.amountDue, 0) > 0
ORDER BY ip.saleId ASC, ip.dueDate ASC
    `;
  const rows = await allAsync(query);
  return applySaleLevelReceiptsToInstallmentRows(rows);
};

export const getPendingInstallmentPaymentsWithCustomer = async (): Promise<
  any[]
> => {
  await getDbInstance();
  const query = `
        SELECT
            ip.id AS paymentId,
            ip.saleId,
            ip.dueDate,
            ip.amountDue AS originalAmountDue,
            MAX(0, COALESCE(ip.amountDue,0) - COALESCE((
              SELECT SUM(it.amount_paid)
                FROM installment_transactions it
               WHERE it.installment_payment_id = ip.id
            ),0)) AS physicalRemaining,
            ip.status AS paymentStatus,
            isale.customerId,
            c.fullName AS customerFullName,
            c.phoneNumber AS customerPhone
        FROM installment_payments ip
        JOIN installment_sales isale ON ip.saleId = isale.id
        JOIN customers c ON isale.customerId = c.id
        WHERE COALESCE(ip.sourceType,'installment') = 'installment'
          AND COALESCE(isale.status,'active') = 'active'
          AND COALESCE(ip.amountDue, 0) > 0
        ORDER BY ip.saleId ASC, ip.dueDate ASC
    `;
  const rows = await allAsync(query);
  return applySaleLevelReceiptsToInstallmentRows(rows);
};

export const getPendingInstallmentChecksWithCustomer = async (): Promise<
  any[]
> => {
  await getDbInstance();
  const query = `
        SELECT
            ic.id AS checkId,
            ic.saleId,
            ic.checkNumber,
            ic.bankName,
            ic.dueDate,
            ic.amount,
            ic.status AS checkStatus,
            isale.customerId,
            c.fullName AS customerFullName,
            c.phoneNumber AS customerPhoneNumber,
            c.telegram_chat_id AS telegramChatId,
            c.telegram_opted_out AS telegramOptedOut,
            c.telegram_invalid AS telegramInvalid
        FROM installment_checks ic
        JOIN installment_sales isale ON ic.saleId = isale.id
        JOIN customers c ON isale.customerId = c.id
        WHERE COALESCE(isale.status,'active') = 'active'
          AND COALESCE(ic.amount, 0) > 0
          AND TRIM(COALESCE(ic.status, '')) NOT IN ('نقد شد','نقدشده','وصول شده','پاس شده','تسویه شده','پرداخت شده','تکمیل شده','paid','Paid','cashed','Cashed','برگشت خورد','برگشت خورده','به مشتری برگشت داده شده','باطل شده')
        ORDER BY ic.saleId ASC, ic.dueDate ASC
    `;
  const rows = await allAsync(query);
  const grouped = new Map<number, any[]>();
  for (const row of rows || []) {
    const saleId = Number(row?.saleId || 0);
    if (!saleId) continue;
    const list = grouped.get(saleId) || [];
    list.push(row);
    grouped.set(saleId, list);
  }
  const result: any[] = [];
  for (const [saleId, checkRows] of grouped.entries()) {
    const state = await getInstallmentSaleReceivableState(saleId);
    let remainingToAllocate = state.remaining;
    if (remainingToAllocate <= 0.00001) continue;
    for (const row of checkRows) {
      const effectiveAmount = Math.min(
        Math.max(0, Number(row?.amount || 0)),
        remainingToAllocate,
      );
      if (effectiveAmount <= 0.00001) continue;
      remainingToAllocate = Math.max(0, remainingToAllocate - effectiveAmount);
      result.push({ ...row, amount: effectiveAmount, originalAmount: Number(row?.amount || 0) });
      if (remainingToAllocate <= 0.00001) break;
    }
  }
  return result;
};

export const addInstallmentTransactionToDb = async (
  paymentId: number,
  amount: number,
  isoDate: string,
  notes?: string,
) => {
  await execAsync("BEGIN TRANSACTION;");
  try {
    const payment = await getAsync(
      "SELECT * FROM installment_payments WHERE id = ?",
      [paymentId],
    );
    if (!payment) {
      throw new Error("قسط مورد نظر برای ثبت پرداخت یافت نشد.");
    }
    await assertInstallmentPaymentIsMutable(paymentId);
    await assertInstallmentReceiptDateOnOrAfterSale(paymentId, isoDate);
    await assertInstallmentPaymentAmountIsValid(paymentId, amount);

    // 1. Insert the partial payment transaction
    const result = await runAsync(
      `INSERT INTO installment_transactions (installment_payment_id, amount_paid, payment_date, notes) VALUES (?, ?, ?, ?)`,
      [paymentId, amount, isoDate, notes],
    );

    // 2. Get sum of all payments for this installment
    const sumResult = await getAsync(
      `SELECT SUM(amount_paid) as totalPaid FROM installment_transactions WHERE installment_payment_id = ?`,
      [paymentId],
    );
    const totalPaid = sumResult.totalPaid || 0;

    // 3. Update the parent installment's status based on the total paid amount
    let newStatus: InstallmentPaymentStatus = payment.status;
    if (totalPaid >= payment.amountDue) {
      newStatus = "پرداخت شده";
    } else if (totalPaid > 0) {
      newStatus = "پرداخت جزئی"; // New status for partially paid installments
    } else {
      newStatus = "پرداخت نشده";
    }

    // Only update paymentDate if the status is changing to a form of paid
    const dateToUpdate =
      newStatus === "پرداخت شده" || newStatus === "پرداخت جزئی"
        ? isoDate
        : null;

    await runAsync(
      `UPDATE installment_payments SET status = ?, paymentDate = ? WHERE id = ?`,
      [newStatus, dateToUpdate, paymentId],
    );

    const insertedTx = await getAsync(
      "SELECT * FROM installment_transactions WHERE id = ?",
      [result.lastID],
    );
    await syncInstallmentTransactionCustomerLedger(
      Number(result.lastID),
      paymentId,
      amount,
      isoDate,
      notes,
    );
    await syncCheckRecoveryLedgerForPayment(paymentId);

    await execAsync("COMMIT;");
    return insertedTx;
  } catch (error) {
    await execAsync("ROLLBACK;");
    throw error;
  }
};

export const getPaymentIdByTransactionIdFromDb = async (
  txId: number,
): Promise<number | null> => {
  await getDbInstance();
  const row = await getAsync(
    "SELECT installment_payment_id FROM installment_transactions WHERE id = ?",
    [txId],
  );
  return row ? (row.installment_payment_id as number) : null;
};

export const recalcInstallmentPaymentStatusInDb = async (
  paymentId: number,
): Promise<void> => {
  await getDbInstance();
  const p = await getAsync(
    "SELECT id, amountDue FROM installment_payments WHERE id = ?",
    [paymentId],
  );
  if (!p) return;

  const rows = await allAsync(
    "SELECT amount_paid, payment_date FROM installment_transactions WHERE installment_payment_id = ? ORDER BY payment_date ASC, id ASC",
    [paymentId],
  );
  const totalPaid = rows.reduce(
    (s: number, r: any) => s + _toNumber(r.amount_paid),
    0,
  );
  const amountDue = _toNumber(p.amountDue);

  // حالت سه‌گانه وضعیت
  let status: InstallmentPaymentStatus = "پرداخت نشده";
  let paymentDate: string | null = null;

  if (totalPaid >= amountDue && amountDue > 0) {
    status = "پرداخت شده";
    // در صورت تسویه کامل، تاریخ آخرین تراکنش را به‌عنوان paymentDate می‌گذاریم
    if (rows.length) paymentDate = rows[rows.length - 1].payment_date ?? null;
  } else if (totalPaid > 0) {
    status = "پرداخت جزئی";
    paymentDate = null; // برای پرداخت جزئی تاریخ نهایی نگذار
  }

  await runAsync(
    "UPDATE installment_payments SET status = ?, paymentDate = ? WHERE id = ?",
    [status, paymentDate, paymentId],
  );
};

export const updateInstallmentTransactionInDb = async (
  txId: number,
  amount: number,
  isoDate: string,
  notes?: string,
) => {
  await execAsync("BEGIN TRANSACTION;");
  try {
    const paymentId = await getPaymentIdByTransactionIdFromDb(txId);
    if (!paymentId) throw new Error("تراکنش مورد نظر یافت نشد.");
    await assertInstallmentPaymentIsMutable(paymentId);
    await assertInstallmentReceiptDateOnOrAfterSale(paymentId, isoDate);
    await assertInstallmentPaymentAmountIsValid(paymentId, amount, txId);

    await runAsync(
      "UPDATE installment_transactions SET amount_paid = ?, payment_date = ?, notes = ? WHERE id = ?",
      [amount, isoDate, notes ?? null, txId],
    );

    await recalcInstallmentPaymentStatusInDb(paymentId);
    const updatedTx = await getAsync(
      "SELECT * FROM installment_transactions WHERE id = ?",
      [txId],
    );
    await syncInstallmentTransactionCustomerLedger(
      txId,
      paymentId,
      amount,
      isoDate,
      notes,
    );
    await syncCheckRecoveryLedgerForPayment(paymentId);
    await execAsync("COMMIT;");
    return updatedTx;
  } catch (error) {
    await execAsync("ROLLBACK;");
    throw error;
  }
};

export const deleteInstallmentTransactionFromDb = async (
  txId: number,
): Promise<boolean> => {
  await execAsync("BEGIN TRANSACTION;");
  try {
    const paymentId = await getPaymentIdByTransactionIdFromDb(txId);
    if (!paymentId) throw new Error("تراکنش مورد نظر یافت نشد.");
    await assertInstallmentPaymentIsMutable(paymentId);

    await deleteInstallmentTransactionCustomerLedger(txId, paymentId);
    const result = await runAsync(
      "DELETE FROM installment_transactions WHERE id = ?",
      [txId],
    );

    // نکتهٔ حیاتی: بعد از حذف، وضعیت قسط را بازمحاسبه کن
    await recalcInstallmentPaymentStatusInDb(paymentId);
    await syncCheckRecoveryLedgerForPayment(paymentId);

    await execAsync("COMMIT;");
    return result.changes > 0;
  } catch (error) {
    await execAsync("ROLLBACK;");
    throw error;
  }
};

