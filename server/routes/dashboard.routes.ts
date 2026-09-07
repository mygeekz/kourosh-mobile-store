import type { Express, RequestHandler } from "express";
import moment from "jalali-moment";
import {
  getDashboardKPIs,
  getDashboardSalesChartData,
  getDashboardRecentActivities,
  getUserDashboardLayoutFromDb,
  upsertUserDashboardLayoutInDb,
  deleteUserDashboardLayoutFromDb,
  getAllSalesTransactionsFromDb,
  getInvoiceDataById,
  getOverdueInstallmentsFromDb,
  getRepairsReadyForPickupFromDb,
} from "../database";
import {
  getAllSalesOrdersFromDb,
  getSalesOrderForInvoice,
} from "../salesOrders";
import { generatePurchaseSuggestions } from "../analysis";
import { inventoryService } from "../services/inventory.service";
import type { ActionItem } from "../../types";

type DashboardRouteDeps = {
  requireAuth: RequestHandler;
};

const faNum = (v: any) => Number(v ?? 0).toLocaleString("fa-IR");

// =====================================================
// 5) داشبورد
// =====================================================
// ---- Fallback chart builder: aggregate from legacy + new orders (via invoices) ----
type PeriodKey = "weekly" | "monthly" | "yearly";
const DATE_KEYS_ROW = [
  "transactionDate",
  "saleDate",
  "date",
  "createdAt",
  "created_at",
  "date_added",
  "timestamp",
  "invoiceDate",
  "orderDate",
  "dateTime",
  "datetime",
];
const DATE_KEYS_INV = [
  "transactionDate",
  "date",
  "orderDate",
  "invoiceDate",
  "createdAt",
  "created_at",
  "timestamp",
];
// === NEW: Date normalizers for strict string-key comparison ===
type DateKeyFmt = "YYYY-MM" | "YYYY-MM-DD";
/** تبدیل ورودی (ISO / جلالی / عدد یونیکس / YYYY/MM/DD) به کلید روز/ماهِ استاندارد */
const normalizeDateKey = (input: any, fmt: DateKeyFmt): string | undefined => {
  if (input == null) return undefined;
  // اعداد فارسی → انگلیسی و حذف فاصله اضافی
  const s = toEnDigits(String(input)).trim();
  // 1) ISO یا میلادی‌های رایج
  const mi = moment(
    s,
    [moment.ISO_8601, "YYYY-MM-DD", "YYYY/M/D", "YYYY/MM/DD"],
    true,
  );
  if (mi.isValid()) return mi.format(fmt);
  // 2) فرمت‌های جلالی
  const mj = moment(
    s,
    ["jYYYY/jM/jD", "jYYYY/jMM/jDD", "jYYYY-jM-jD", "jYYYY-jMM-jDD"],
    true,
  );
  if (mj.isValid()) return mj.format(fmt);
  // 3) یونیکس میلی‌ثانیه/ثانیه
  const mu = moment(Number(s));
  if (mu.isValid()) return mu.format(fmt);
  return undefined;
};
/** از هر آبجکت (فاکتور یا ردیف خلاصه)، اولین کلید تاریخ معتبر را به key استاندارد تبدیل می‌کند */
const extractAnyDateKey = (obj: any, fmt: DateKeyFmt): string | undefined => {
  if (!obj) return undefined;
  // اول از کلیدهای شناخته‌شده
  for (const k of [...DATE_KEYS_INV, ...DATE_KEYS_ROW]) {
    const key = normalizeDateKey((obj as any)[k], fmt);
    if (key) return key;
  }
  // محض احتیاط: هر فیلدی که اسمش بوی تاریخ/زمان بده
  try {
    for (const [k, v] of Object.entries(obj)) {
      if (!/date|time|created/i.test(k) || v == null) continue;
      const key = normalizeDateKey(v, fmt);
      if (key) return key;
    }
  } catch {}
  return undefined;
};
// --- helpers for amounts (digits/fa, commas, currency words) ---
// ارقام فارسی/عربی-indic → لاتین
const toEnDigits = (input: any): string => {
  const s = String(input ?? "");
  const fa = "۰۱۲۳۴۵۶۷۸۹";
  const ar = "٠١٢٣٤٥٦٧٨٩";
  return s
    .replace(/[۰-۹]/g, (d) => String(fa.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(ar.indexOf(d)));
};
// پارس هوشمند تاریخ (ISO/میلادی/جلالی/Epoch ثانیه/میلی‌ثانیه)
const parseSmartMoment = (raw: any): moment.Moment | null => {
  if (raw == null) return null;
  // نرمال‌سازی: ارقام لاتین، حذف کاراکترهای نامرئی، یکنواخت‌سازی جداکننده‌ها
  let s0 = toEnDigits(String(raw).trim())
    .replace(/[\u200e\u200f]/g, "") // LRM/RLM
    .replace(/[._]/g, "/")
    .replace(/\s+/g, " ");
  // Epoch: فقط اگر کاملاً عددی و 10 یا 13 رقمی است
  if (/^\d{10,13}$/.test(s0)) {
    const ms = s0.length === 10 ? Number(s0) * 1000 : Number(s0);
    const mu = moment(ms);
    return mu.isValid() ? mu : null;
  }
  // ISO سخت‌گیرانه (شامل 2025-09-29T12:34:56Z و ...)
  const mIso = moment(s0, moment.ISO_8601, true);
  if (mIso.isValid()) return mIso;
  // قالب‌های رایج میلادی (روزانه/ماهیانه، با و بی‌ساعت)
  const gFormats = [
    "YYYY-MM-DD",
    "YYYY/M/D",
    "YYYY/MM/DD",
    "YYYY-M-D",
    "YYYY-MM-DD HH:mm",
    "YYYY-MM-DD HH:mm:ss",
    "YYYY/MM/DD HH:mm",
    "YYYY/MM/DD HH:mm:ss",
    "YYYY-MM",
    "YYYY/MM",
  ];
  for (const f of gFormats) {
    const m = moment(s0, f, true);
    if (m.isValid()) return m;
  }
  // قالب‌های جلالی (روزانه/ماهیانه، با و بی‌ساعت)
  const jFormats = [
    "jYYYY/jMM/jDD",
    "jYYYY-jMM-jDD",
    "jYYYY/jM/jD",
    "jYYYY-jM-jD",
    "jYYYY/jMM jHH:mm",
    "jYYYY/jMM/jDD HH:mm",
    "jYYYY/jMM/jDD HH:mm:ss",
    "jYYYY/jMM",
    "jYYYY-jMM",
  ];
  for (const f of jFormats) {
    const m = moment(s0, f, true);
    if (m.isValid()) return m;
  }
  // آخرین تلاش منعطف
  const mLoose = moment(s0);
  return mLoose.isValid() ? mLoose : null;
};
// نرمال‌سازی مبلغ (پشتیبانی از منفی، اعشار فارسی/انگلیسی، جداکننده‌های هزارگان، پرانتزی)
const toAmount = (v: any): number => {
  if (v == null) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  let s = toEnDigits(String(v)).trim();
  // منفیِ پرانتزی: (1234) → -1234
  let negative = false;
  const paren = /^\s*\((.*)\)\s*$/.exec(s);
  if (paren) {
    negative = true;
    s = paren[1];
  }
  // حذف واحد پول و متن‌های اضافه
  s = s.replace(/(تومان|ريال|ریال|IRR|USD|TL| تومان| ریال)/gi, "");
  // یکسان‌سازی اعشار فارسی → '.'
  s = s.replace(/\u066B/g, "."); // '٫'
  // اگر نقطه وجود ندارد و فقط یک کاما داریم، همان را اعشار فرض کن؛
  // در غیر اینصورت، کاماها جداکنندهٔ هزارگان هستند و حذف می‌شوند.
  const hasDot = s.includes(".");
  const commaCount = (s.match(/,/g) || []).length;
  if (!hasDot && commaCount === 1) {
    s = s.replace(",", ".");
  }
  // حذف همهٔ جداکننده‌های هزارگان: کاما، «٬» U+066C، فاصلهٔ باریک/غیرشکست، اسپیس
  s = s.replace(/[,\u066C\u2009\u00A0\u202F\s]/g, "");
  // فقط ارقام، یک نقطهٔ اعشار و یک منفی ابتدای رشته را نگه دار
  s = s.replace(/[^0-9\.\-]/g, "");
  s = s.replace(/(?!^)-/g, ""); // منفی‌های اضافی حذف
  // اگر چند نقطه بود، فقط اولی را نگه داریم
  const firstDot = s.indexOf(".");
  if (firstDot !== -1) {
    s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, "");
  }
  let n = Number(s || "0");
  if (!Number.isFinite(n)) n = 0;
  if (negative) n = -Math.abs(n);
  return n;
};
// تاریخ از رکورد خلاصه (transactions/sales_orders)
const pickDate = (row: any): moment.Moment | null => {
  for (const k of DATE_KEYS_ROW) {
    const v = row?.[k];
    if (v == null) continue;
    const m = parseSmartMoment(v);
    if (m) return m;
  }
  return null;
};
// تاریخ از خودِ آبجکت فاکتور
const pickInvoiceMoment = (inv: any): moment.Moment | null => {
  // 1) کلیدهای شناخته‌شده
  for (const k of DATE_KEYS_INV) {
    const v = inv?.[k];
    if (v == null) continue;
    const m = parseSmartMoment(v);
    if (m) return m;
  }
  // 2) ساختارهای رایج جدید: invoiceMetadata.{transactionDate|date}
  {
    const md =
      inv?.invoiceMetadata?.transactionDate ?? inv?.invoiceMetadata?.date;
    const m = parseSmartMoment(md);
    if (m) return m;
  }
  // 3) جست‌وجوی سبک روی کلیدهای مشکوک (date|time|created|timestamp) در سطح اول
  try {
    for (const [k, v] of Object.entries(inv || {})) {
      if (!/date|time|created|timestamp/i.test(k) || v == null) continue;
      const m = parseSmartMoment(v);
      if (m) return m;
    }
  } catch {}
  return null;
};
const pickAmountTopLevel = (obj: any): number => {
  const keys = [
    "grandTotal",
    "grand_total",
    "total",
    "totalAmount",
    "finalAmount",
    "sum",
    "invoiceTotal",
    "subtotal",
  ];
  for (const k of keys) {
    const n = toAmount(obj?.[k]);
    if (Number.isFinite(n) && n !== 0) return n;
  }
  return 0;
};
const sumFromItems = (inv: any): number => {
  const container =
    inv?.items ||
    inv?.orderItems ||
    inv?.lines ||
    inv?.details ||
    inv?.invoiceItems ||
    [];
  if (!Array.isArray(container) || container.length === 0) return 0;
  const qtyKeys = ["qty", "quantity", "count", "amount"];
  const priceKeys = [
    "total",
    "lineTotal",
    "finalAmount",
    "amount",
    "totalPrice",
    "price",
    "unitPrice",
    "subtotal",
  ];
  const pickQty = (row: any) => {
    for (const k of qtyKeys) {
      const n = toAmount(row?.[k]);
      if (n) return n;
    }
    return 1;
  };
  const pickPrice = (row: any) => {
    for (const k of priceKeys) {
      const n = toAmount(row?.[k]);
      if (n) return n;
    }
    return 0;
  };
  // اگر خودِ سطر «total» دارد، از همان استفاده می‌کنیم؛
  // در غیر اینصورت price * qty.
  let sum = 0;
  for (const it of container) {
    const rowTotal = toAmount(it?.total) || toAmount(it?.lineTotal) || 0;
    if (rowTotal) {
      sum += rowTotal;
      continue;
    }
    const q = pickQty(it);
    const p = pickPrice(it);
    sum += p && q ? p * (q || 1) : 0;
  }
  return sum;
};
const buildBuckets = (period: PeriodKey) => {
  const now = moment().locale("en");
  if (period === "weekly") {
    const start = now.clone().startOf("day").subtract(6, "days");
    const buckets: { key: string; label: string }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = start.clone().add(i, "days");
      buckets.push({
        key: d.locale("en").format("YYYY-MM-DD"),
        label: d.locale("fa").format("jMM/jDD"),
      });
    }
    return {
      buckets,
      start,
      end: now.clone().endOf("day"),
      fmt: "YYYY-MM-DD" as const,
    };
  }
  if (period === "monthly") {
    const start = now.clone().startOf("day").subtract(29, "days");
    const buckets: { key: string; label: string }[] = [];
    for (let i = 0; i < 30; i++) {
      const d = start.clone().add(i, "days");
      buckets.push({
        key: d.locale("en").format("YYYY-MM-DD"),
        label: d.locale("fa").format("jMM/jDD"),
      });
    }
    return {
      buckets,
      start,
      end: now.clone().endOf("day"),
      fmt: "YYYY-MM-DD" as const,
    };
  }
  // yearly
  const start = now.clone().startOf("month").subtract(11, "months");
  const buckets: { key: string; label: string }[] = [];
  for (let i = 0; i < 12; i++) {
    const d = start.clone().add(i, "months");
    buckets.push({
      key: d.locale("en").format("YYYY-MM"),
      label: d.locale("fa").format("jYYYY jMMM"),
    });
  }
  return {
    buckets,
    start,
    end: now.clone().endOf("month"),
    fmt: "YYYY-MM" as const,
  };
};
const buildSalesChartDataFallback = async (period: PeriodKey) => {
  const { buckets, fmt } = buildBuckets(period);
  const map = new Map<string, number>();
  for (const b of buckets) map.set(b.key, 0);
  // منابع داده
  let legacy: any[] = [];
  let modern: any[] = [];
  try {
    legacy = await getAllSalesTransactionsFromDb();
  } catch (e) {
    console.warn("[fallback] legacy err", e);
  }
  try {
    modern = await getAllSalesOrdersFromDb();
  } catch (e) {
    console.warn("[fallback] modern err", e);
  }
  // ادغام رکوردهای خلاصه بر اساس شناسهٔ فاکتور (رکورد جدید ارجح است)
  const byId = new Map<number, any>();
  for (const r of [...legacy, ...modern]) {
    const sid = Number(
      r?.id ?? r?.saleId ?? r?.sale_id ?? r?.orderId ?? r?.invoiceId,
    );
    if (!sid) continue;
    byId.set(sid, { ...(byId.get(sid) || {}), ...r });
  }
  for (const [id, row] of Array.from(byId.entries())) {
    const status = String(row?.status || 'active').trim().toLowerCase();
    if (['canceled', 'cancelled', 'void', 'voided'].includes(status)) byId.delete(id);
  }
  const ids = Array.from(byId.keys());
  // برای دیباگ: اولین و آخرین کلیدهای باکت‌ها
  const firstBucketKey = buckets[0]?.key;
  const lastBucketKey = buckets[buckets.length - 1]?.key;
  console.log("[dash-summary] bucket window:", {
    fmt,
    firstBucketKey,
    lastBucketKey,
  });
  let used = 0,
    skippedNoDate = 0,
    skippedRange = 0;
  const debugAdds: any[] = [];
  for (const id of ids) {
    // تلاش برای یافتن آبجکت فاکتور: اول ساختار جدید، بعد قدیمی
    let inv: any = null;
    try {
      inv = await getSalesOrderForInvoice(id);
    } catch {}
    if (!inv) {
      try {
        inv = await getInvoiceDataById(id);
      } catch {}
    }
    if (!inv) {
      skippedNoDate++;
      continue;
    }
    // تاریخ فاکتور را انتخاب کن (از خود فاکتور، و در صورت لزوم از ردیف خلاصه)
    const m = pickInvoiceMoment(inv) || pickDate(byId.get(id));
    if (!m) {
      skippedNoDate++;
      continue;
    }
    // کلید تاریخ مطابق fmt و با ارقام انگلیسی تا با کلیدهای باکت یکی شود
    const key = toEnDigits(m.clone().locale("en").format(fmt));
    if (!map.has(key)) {
      skippedRange++;
      continue;
    }
    // مبلغ فاکتور: اول فیلدهای top-level، در غیراینصورت جمع خطوط
    let total = pickAmountTopLevel(inv);
    if (!total) total = sumFromItems(inv);
    const prev = map.get(key) || 0;
    const next = prev + (Number(total) || 0);
    map.set(key, next);
    used++;
    if (debugAdds.length < 8) {
      debugAdds.push({ id, key, add: Number(total) || 0, newSum: next });
    }
  }
  if (debugAdds.length)
    console.log("[dash-summary] fallback adds sample:", debugAdds);
  console.log(
    "[dash-summary] fallback stats → used=",
    used,
    "noDate=",
    skippedNoDate,
    "notInBuckets=",
    skippedRange,
  );
  // خروجی نهایی برای چارت
  return buckets.map((b) => ({ name: b.label, sales: map.get(b.key) || 0 }));
};

export const registerDashboardRoutes = (
  app: Express,
  { requireAuth }: DashboardRouteDeps,
): void => {
  // ---- روت داشبورد با فالبک امن ----
  app.get("/api/dashboard/summary", async (req, res, next) => {
    try {
      const period = (req.query.period as string) || "monthly";
      const [kpis, salesChartDataRaw, recentActivities] = await Promise.all([
        getDashboardKPIs(),
        getDashboardSalesChartData(period),
        getDashboardRecentActivities(),
      ]);
      console.log("[dash-summary] period=", period);
      let salesChartData: any[] = Array.isArray(salesChartDataRaw)
        ? salesChartDataRaw
        : [];
      if (!Array.isArray(salesChartData) || salesChartData.length === 0) {
        console.warn(
          "[dash-summary] salesChartData empty → using fallback aggregator (invoices)",
        );
        const safePeriod: PeriodKey = (
          ["weekly", "monthly", "yearly"] as PeriodKey[]
        ).includes(period as any)
          ? (period as PeriodKey)
          : "monthly";
        salesChartData = await buildSalesChartDataFallback(safePeriod);
        console.log(
          "[dash-summary] fallback sample=",
          salesChartData.slice(0, 3),
        );
      } else {
        if (Array.isArray(salesChartDataRaw)) {
          console.log(
            "[dash-summary] sample rows:",
            salesChartDataRaw.slice(0, 3),
          );
        } else if (salesChartDataRaw && typeof salesChartDataRaw === "object") {
          console.log(
            "[dash-summary] sample entries:",
            Object.entries(salesChartDataRaw).slice(0, 3),
          );
        }
      }
      res.json({
        success: true,
        data: { kpis, salesChartData, recentActivities },
      });
    } catch (e) {
      next(e as any);
    }
  });
  // ===================== Dashboard Layout (per-user) =====================
  app.get("/api/dashboard/layout", requireAuth, async (req: any, res: any) => {
    try {
      const userId = req.user?.id;
      if (!userId)
        return res.status(401).json({ success: false, message: "Unauthorized" });
      const layouts = await getUserDashboardLayoutFromDb(userId);
      return res.json({ success: true, data: layouts ? { layouts } : null });
    } catch (error: any) {
      console.error("Error fetching dashboard layout:", error);
      return res
        .status(500)
        .json({ success: false, message: "خطا در دریافت چیدمان داشبورد" });
    }
  });
  app.put("/api/dashboard/layout", requireAuth, async (req: any, res: any) => {
    try {
      const userId = req.user?.id;
      if (!userId)
        return res.status(401).json({ success: false, message: "Unauthorized" });
      const body = req.body ?? {};
      const layouts = body.layouts ?? body;
      await upsertUserDashboardLayoutInDb(userId, layouts);
      return res.json({ success: true });
    } catch (error: any) {
      console.error("Error saving dashboard layout:", error);
      const msg =
        typeof error?.message === "string"
          ? error.message
          : "خطا در ذخیره چیدمان داشبورد";
      return res.status(500).json({ success: false, message: msg });
    }
  });
  app.delete("/api/dashboard/layout", requireAuth, async (req: any, res: any) => {
    try {
      const userId = req.user?.id;
      if (!userId)
        return res.status(401).json({ success: false, message: "Unauthorized" });
      await deleteUserDashboardLayoutFromDb(userId);
      return res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting dashboard layout:", error);
      return res
        .status(500)
        .json({ success: false, message: "خطا در حذف چیدمان داشبورد" });
    }
  });
  app.get("/api/dashboard/action-center", async (_req, res, next) => {
    try {
      const actionItems: ActionItem[] = [];
      const summary = {
        overdueReceivablesCount: 0,
        stagnantStockCount: 0,
        stagnantStockValue: 0,
      };
      // پیشنهاد خرید / کمبود موجودی
      try {
        const suggestions = await generatePurchaseSuggestions();
        (suggestions || []).forEach((item) => {
          actionItems.push({
            id: `stock-alert-${item.itemId}`,
            type: "StockAlert",
            priority: "High",
            title: `موجودی کم: ${item.itemName ?? "کالا"}`,
            description: `موجودی فعلی: ${faNum(item.currentStock)}. موجودی برای ${faNum(item.daysOfStockLeft)} روز آینده کافیست.`,
            actionText: "بررسی پیشنهاد خرید",
            actionLink: "/reports/analysis/suggestions",
          });
        });
      } catch (e) {
        console.warn("generatePurchaseSuggestions failed:", e);
      }
      // اقساط معوق
      try {
        const allUnpaid = await getOverdueInstallmentsFromDb();
        const overdueAll = (allUnpaid || []).filter((p) => {
            const j = moment(p?.dueDate, "jYYYY/jMM/jDD", true);
            const m = j.isValid() ? j : moment(p?.dueDate);
            return m.isBefore(moment(), "day");
          });
        summary.overdueReceivablesCount = overdueAll.length;
        const overdue = overdueAll.slice(0, 5);
        overdue.forEach((item) => {
          actionItems.push({
            id: `overdue-payment-${item.id}`,
            type: "OverdueInstallment",
            priority: "High",
            title: `قسط معوق: ${item.customerFullName ?? ""}`,
            description: `قسط به مبلغ ${faNum(item.amountDue)} تومان با سررسید ${item.dueDate} پرداخت نشده است.`,
            actionText: "مشاهده پرونده",
            actionLink: `/installment-sales/${item.saleId}`,
          });
        });
      } catch (e) {
        console.warn("getOverdueInstallmentsFromDb failed:", e);
      }
      // کالاهای راکد مهم؛ همان موتور رسمی گزارش موجودی و بدون Query موازی.
      try {
        const stagnantAll = (await inventoryService.getDeadStockReport(60)) || [];
        summary.stagnantStockCount = stagnantAll.length;
        summary.stagnantStockValue = stagnantAll.reduce((sum, item) => sum + Number(item.value || 0), 0);
        const stagnant = stagnantAll.slice(0, 5);
        stagnant.forEach((item) => {
          const daysText = item.daysSinceLastSale == null
            ? "بدون فروش ثبت‌شده"
            : `${faNum(item.daysSinceLastSale)} روز بدون فروش`;
          actionItems.push({
            id: `stagnant-stock-${item.productId}`,
            type: "StagnantStock",
            priority: "Medium",
            title: `کالای راکد: ${item.name}`,
            description: `${daysText} • موجودی: ${faNum(item.stock)} • سرمایه راکد: ${faNum(item.value)} تومان`,
            actionText: "مشاهده گزارش موجودی",
            actionLink: "/reports/dead-stock",
            meta: {
              productId: item.productId,
              stock: item.stock,
              value: item.value,
              daysSinceLastSale: item.daysSinceLastSale,
            },
          });
        });
      } catch (e) {
        console.warn("getDeadStockReport failed:", e);
      }
      // تعمیرات آماده تحویل
      try {
        const ready = ((await getRepairsReadyForPickupFromDb()) || []).slice(
          0,
          5,
        );
        ready.forEach((item) => {
          actionItems.push({
            id: `repair-ready-${item.id}`,
            type: "RepairReady",
            priority: "Medium",
            title: `تعمیر آماده تحویل: ${item.deviceModel ?? ""}`,
            description: `دستگاه آقای/خانم ${item.customerFullName ?? ""} به مبلغ نهایی ${faNum(item.finalCost)} تومان آماده تحویل است.`,
            actionText: "مشاهده جزئیات",
            actionLink: `/repairs/${item.id}`,
          });
        });
      } catch (e) {
        console.warn("getRepairsReadyForPickupFromDb failed:", e);
      }
      res.json({ success: true, data: actionItems, summary });
    } catch (e) {
      next(e);
    }
  });
};
