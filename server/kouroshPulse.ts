import moment from "jalali-moment";
import type { Express } from "express";
import type { AuthorizeRole } from "./routes/intelligence/types";
import {
  readKouroshPulseSnapshot,
  type KouroshPulseReadSnapshot,
} from "./repositories/kouroshPulse.repo";
import type { InventoryMlAdvisory } from "./advisory/inventoryStockoutModel";

export type KouroshPulseSeverity = "low" | "medium" | "high";
export type KouroshPulseSignalStatus = "alert" | "stable" | "insufficient";

export type KouroshPulseAlert = {
  id: string;
  type: "inventory" | "sales" | "installments" | "customers";
  severity: KouroshPulseSeverity;
  title: string;
  reason: string;
  count: number;
  relatedModule: "inventory" | "sales" | "installments" | "customers";
  href?: string;
};

export type KouroshPulseSignal = {
  id: "low-stock" | "slow-moving" | "sales-attention" | "installment-follow-up";
  status: KouroshPulseSignalStatus;
  reason?: string;
};

export type KouroshPulseInventoryObservationItem = {
  id: string;
  kind: "product" | "phone-model";
  title: string;
  stockQuantity: number;
  ageDays: number | null;
  observation: "low-stock" | "slow-moving" | "low-stock-and-slow-moving";
  severity: "medium" | "high";
  reason: string;
  href: "/products" | "/mobile-phones";
};

export type KouroshPulseInventoryObservation = {
  mode: "read-only-inventory-shadow-observation";
  status: "attention" | "stable" | "insufficient";
  persistenceEnabled: false;
  mlRuntimeEnabled: false;
  modelExecutionEnabled: false;
  summary: {
    observedItems: number;
    totalStockedUnits: number;
    lowStockItems: number;
    agingItems: number;
    recentlySoldProducts: number;
  };
  dataCoverage: {
    inventoryAvailable: boolean;
    datedInventoryCoveragePct: number;
    recentSalesHistoryAvailable: boolean;
  };
  items: KouroshPulseInventoryObservationItem[];
};

export type KouroshPulseResponse = {
  productName: "Kourosh Pulse";
  displayName: "نبض کوروش";
  subtitle: "اعلان‌های هوشمند فروشگاه";
  mode: "read-only-rule-baseline";
  mlRuntimeEnabled: false;
  modelExecutionEnabled: false;
  generatedAt: string;
  analysisState: "alerts" | "stable" | "insufficient";
  summary: {
    totalAlerts: number;
    highestSeverity: KouroshPulseSeverity | null;
  };
  alerts: KouroshPulseAlert[];
  signals: KouroshPulseSignal[];
  inventoryObservation: KouroshPulseInventoryObservation;
  inventoryMlAdvisory?: InventoryMlAdvisory;
  limitations: string[];
};

export const KOUROSH_PULSE_POLICY = Object.freeze({
  lowStockThreshold: 2,
  slowMovingWindowDays: 30,
  installmentDueSoonDays: 7,
  salesComparisonWindowDays: 28,
  minimumSalesEventsForComparison: 14,
  maximumAlerts: 5,
  maximumInventoryObservationItems: 5,
});

const toEnglishDigits = (value: unknown): string =>
  String(value ?? "")
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .trim();

const parseStoreDate = (value: unknown): moment.Moment | null => {
  const normalized = toEnglishDigits(value);
  if (!normalized) return null;
  const formats = [
    moment.ISO_8601,
    "YYYY-MM-DD",
    "YYYY/MM/DD",
    "jYYYY/jMM/jDD",
    "jYYYY-jMM-jDD",
  ];
  for (const format of formats) {
    const parsed = moment(normalized, format as string, true);
    if (parsed.isValid()) return parsed.startOf("day");
  }
  return null;
};

const severityRank: Record<KouroshPulseSeverity, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

const addDays = (date: moment.Moment, days: number) => date.clone().add(days, "days");

const buildInventoryObservation = (input: {
  snapshot: KouroshPulseReadSnapshot;
  now: moment.Moment;
  lowProducts: KouroshPulseReadSnapshot["products"];
  lowPhoneModels: KouroshPulseReadSnapshot["phoneModels"];
  slowMovingProducts: KouroshPulseReadSnapshot["products"];
  recentProductSaleIds: Set<number>;
}): KouroshPulseInventoryObservation => {
  const { snapshot, now, lowProducts, lowPhoneModels, slowMovingProducts, recentProductSaleIds } = input;
  const stockedProducts = snapshot.products.filter((row) => Number(row.stockQuantity) > 0);
  const observedItems = stockedProducts.length + snapshot.phoneModels.length;
  const totalStockedUnits = [...stockedProducts, ...snapshot.phoneModels]
    .reduce((total, row) => total + Math.max(0, Number(row.stockQuantity) || 0), 0);
  const lowProductIds = new Set(lowProducts.map((row) => Number(row.id)));
  const slowProductIds = new Set(slowMovingProducts.map((row) => Number(row.id)));

  const productItems: KouroshPulseInventoryObservationItem[] = stockedProducts
    .filter((row) => lowProductIds.has(Number(row.id)) || slowProductIds.has(Number(row.id)))
    .map((row) => {
      const low = lowProductIds.has(Number(row.id));
      const slow = slowProductIds.has(Number(row.id));
      const addedAt = parseStoreDate(row.dateAdded);
      const ageDays = addedAt ? Math.max(0, now.diff(addedAt, "days")) : null;
      const observation = low && slow
        ? "low-stock-and-slow-moving" as const
        : low
          ? "low-stock" as const
          : "slow-moving" as const;
      return {
        id: `product-${row.id}`,
        kind: "product" as const,
        title: row.name,
        stockQuantity: Number(row.stockQuantity) || 0,
        ageDays,
        observation,
        severity: low && slow ? "high" as const : low ? "high" as const : "medium" as const,
        reason: low && slow
          ? "موجودی کم است و در ۳۰ روز اخیر فروشی ثبت نشده است."
          : low
            ? "موجودی این کالا به آستانه بررسی رسیده است."
            : "با وجود موجودی، در ۳۰ روز اخیر فروشی ثبت نشده است.",
        href: "/products" as const,
      };
    });

  const phoneItems: KouroshPulseInventoryObservationItem[] = lowPhoneModels.map((row) => ({
    id: `phone-model-${row.model}`,
    kind: "phone-model",
    title: row.model,
    stockQuantity: Number(row.stockQuantity) || 0,
    ageDays: null,
    observation: "low-stock",
    severity: "high",
    reason: "تعداد موجود این مدل گوشی به آستانه بررسی رسیده است.",
    href: "/mobile-phones",
  }));

  const datedStockedProducts = stockedProducts.filter((row) => Boolean(parseStoreDate(row.dateAdded)));
  const datedInventoryCoveragePct = stockedProducts.length === 0
    ? 0
    : Math.round((datedStockedProducts.length / stockedProducts.length) * 100);
  const items = [...productItems, ...phoneItems]
    .sort((a, b) => severityRank[b.severity] - severityRank[a.severity]
      || a.stockQuantity - b.stockQuantity
      || a.id.localeCompare(b.id))
    .slice(0, KOUROSH_PULSE_POLICY.maximumInventoryObservationItems);

  return {
    mode: "read-only-inventory-shadow-observation",
    status: observedItems === 0 ? "insufficient" : items.length > 0 ? "attention" : "stable",
    persistenceEnabled: false,
    mlRuntimeEnabled: false,
    modelExecutionEnabled: false,
    summary: {
      observedItems,
      totalStockedUnits,
      lowStockItems: lowProducts.length + lowPhoneModels.length,
      agingItems: slowMovingProducts.length,
      recentlySoldProducts: recentProductSaleIds.size,
    },
    dataCoverage: {
      inventoryAvailable: observedItems > 0,
      datedInventoryCoveragePct,
      recentSalesHistoryAvailable: snapshot.sales.some((row) => Boolean(parseStoreDate(row.saleDate))),
    },
    items,
  };
};

export const buildKouroshPulseResponse = (
  snapshot: KouroshPulseReadSnapshot,
  options: { now?: Date | string } = {},
): KouroshPulseResponse => {
  const generatedAt = new Date(options.now ?? Date.now()).toISOString();
  const now = moment(generatedAt).startOf("day");
  const alerts: KouroshPulseAlert[] = [];
  const signals: KouroshPulseSignal[] = [];

  const lowProducts = snapshot.products.filter(
    (row) => Number(row.stockQuantity) > 0 && Number(row.stockQuantity) <= KOUROSH_PULSE_POLICY.lowStockThreshold,
  );
  const lowPhoneModels = snapshot.phoneModels.filter(
    (row) => Number(row.stockQuantity) > 0 && Number(row.stockQuantity) <= KOUROSH_PULSE_POLICY.lowStockThreshold,
  );
  const inventoryRecordCount = snapshot.products.length + snapshot.phoneModels.length;
  const lowStockCount = lowProducts.length + lowPhoneModels.length;
  if (inventoryRecordCount === 0) {
    signals.push({ id: "low-stock", status: "insufficient", reason: "داده موجودی ثبت نشده است." });
  } else if (lowStockCount > 0) {
    signals.push({ id: "low-stock", status: "alert" });
    alerts.push({
      id: "low-stock-inventory",
      type: "inventory",
      severity: "high",
      title: "موجودی کم",
      reason: `${lowStockCount.toLocaleString("fa-IR")} قلم یا مدل موجودی پایینی دارند.`,
      count: lowStockCount,
      relatedModule: "inventory",
      href: lowPhoneModels.length > lowProducts.length ? "/mobile-phones" : "/products",
    });
  } else {
    signals.push({ id: "low-stock", status: "stable" });
  }

  const recentProductSaleIds = new Set(
    snapshot.sales
      .filter((row) => {
        const date = parseStoreDate(row.saleDate);
        return date && date.isSameOrAfter(addDays(now, -KOUROSH_PULSE_POLICY.slowMovingWindowDays));
      })
      .map((row) => Number(row.productId))
      .filter((id) => Number.isFinite(id) && id > 0),
  );
  const stockedDatedProducts = snapshot.products.filter(
    (row) => Number(row.stockQuantity) > 0 && Boolean(parseStoreDate(row.dateAdded)),
  );
  const slowMovingProducts = stockedDatedProducts.filter((row) => {
    const addedAt = parseStoreDate(row.dateAdded);
    return Boolean(
      addedAt &&
      addedAt.isSameOrBefore(addDays(now, -KOUROSH_PULSE_POLICY.slowMovingWindowDays)) &&
      !recentProductSaleIds.has(Number(row.id)),
    );
  });
  if (snapshot.products.length === 0 || stockedDatedProducts.length === 0) {
    signals.push({ id: "slow-moving", status: "insufficient", reason: "تاریخچه کافی کالا و موجودی در دسترس نیست." });
  } else if (slowMovingProducts.length > 0) {
    signals.push({ id: "slow-moving", status: "alert" });
    alerts.push({
      id: "slow-moving-products",
      type: "inventory",
      severity: "medium",
      title: "کالای کندفروش",
      reason: `${slowMovingProducts.length.toLocaleString("fa-IR")} کالا بیش از ۳۰ روز بدون فروش مانده‌اند.`,
      count: slowMovingProducts.length,
      relatedModule: "inventory",
      href: "/products",
    });
  } else {
    signals.push({ id: "slow-moving", status: "stable" });
  }

  const dueSoonCutoff = addDays(now, KOUROSH_PULSE_POLICY.installmentDueSoonDays);
  const dueInstallments = snapshot.installments
    .map((row) => ({ row, dueDate: parseStoreDate(row.dueDate) }))
    .filter(({ dueDate }) => dueDate && dueDate.isSameOrBefore(dueSoonCutoff));
  const overdueCount = dueInstallments.filter(({ dueDate }) => dueDate && dueDate.isBefore(now)).length;
  if (snapshot.installmentDatasetCount === 0) {
    signals.push({ id: "installment-follow-up", status: "insufficient", reason: "داده اقساطی برای ارزیابی ثبت نشده است." });
  } else if (dueInstallments.length > 0) {
    signals.push({ id: "installment-follow-up", status: "alert" });
    alerts.push({
      id: "installment-follow-up",
      type: "installments",
      severity: overdueCount > 0 ? "high" : "medium",
      title: "پیگیری اقساط",
      reason: overdueCount > 0
        ? `${overdueCount.toLocaleString("fa-IR")} قسط از موعد گذشته و نیازمند بررسی است.`
        : `${dueInstallments.length.toLocaleString("fa-IR")} قسط تا ۷ روز آینده سررسید می‌شود.`,
      count: dueInstallments.length,
      relatedModule: "installments",
      href: "/reports/installments-calendar",
    });
  } else {
    signals.push({ id: "installment-follow-up", status: "stable" });
  }

  const datedSales = snapshot.sales
    .map((row) => parseStoreDate(row.saleDate))
    .filter((date): date is moment.Moment => Boolean(date))
    .filter((date) => date.isAfter(addDays(now, -KOUROSH_PULSE_POLICY.salesComparisonWindowDays)) && date.isSameOrBefore(now));
  if (datedSales.length < KOUROSH_PULSE_POLICY.minimumSalesEventsForComparison) {
    signals.push({ id: "sales-attention", status: "insufficient", reason: "تاریخچه فروش ۲۸ روزه برای مقایسه کافی نیست." });
  } else {
    const recentStart = addDays(now, -6);
    const recentCount = datedSales.filter((date) => date.isSameOrAfter(recentStart)).length;
    const priorCount = datedSales.length - recentCount;
    const priorWeeklyAverage = priorCount / 3;
    if (priorCount >= 6 && recentCount <= priorWeeklyAverage * 0.5) {
      signals.push({ id: "sales-attention", status: "alert" });
      alerts.push({
        id: "sales-attention",
        type: "sales",
        severity: "medium",
        title: "نیازمند بررسی فروش",
        reason: "فعالیت فروش ۷ روز اخیر نسبت به سه هفته قبل کاهش محسوسی داشته است.",
        count: recentCount,
        relatedModule: "sales",
        href: "/reports/sales-summary",
      });
    } else {
      signals.push({ id: "sales-attention", status: "stable" });
    }
  }

  const orderedAlerts = alerts
    .sort((a, b) => severityRank[b.severity] - severityRank[a.severity] || a.id.localeCompare(b.id))
    .slice(0, KOUROSH_PULSE_POLICY.maximumAlerts);
  const usableSignalCount = signals.filter((signal) => signal.status !== "insufficient").length;
  const analysisState = orderedAlerts.length > 0 ? "alerts" : usableSignalCount >= 2 ? "stable" : "insufficient";
  const inventoryObservation = buildInventoryObservation({
    snapshot,
    now,
    lowProducts,
    lowPhoneModels,
    slowMovingProducts,
    recentProductSaleIds,
  });

  return {
    productName: "Kourosh Pulse",
    displayName: "نبض کوروش",
    subtitle: "اعلان‌های هوشمند فروشگاه",
    mode: "read-only-rule-baseline",
    mlRuntimeEnabled: false,
    modelExecutionEnabled: false,
    generatedAt,
    analysisState,
    summary: {
      totalAlerts: orderedAlerts.length,
      highestSeverity: orderedAlerts[0]?.severity ?? null,
    },
    alerts: orderedAlerts,
    signals,
    inventoryObservation,
    limitations: [
      "این نسخه از مدل ML واقعی استفاده نمی‌کند.",
      "خروجی‌ها بر اساس قوانین خواندنی و داده‌های موجود هستند.",
      "مشاهده موجودی در پایگاه داده ذخیره نمی‌شود و هیچ اقدام خودکاری انجام نمی‌دهد.",
    ],
  };
};

export const getKouroshPulseDashboardAlerts = async (): Promise<KouroshPulseResponse> => {
  const [snapshot, advisory] = await Promise.all([
    readKouroshPulseSnapshot(),
    import("./kouroshAdvisor").then(({ getInventoryMlAdvisory }) => getInventoryMlAdvisory()).catch(() => undefined),
  ]);
  return { ...buildKouroshPulseResponse(snapshot), inventoryMlAdvisory: advisory };
};

export const registerKouroshPulseDashboardRoute = (
  app: Express,
  authorizeRole: AuthorizeRole,
): void => {
  app.get(
    "/api/intelligence/kourosh-pulse/dashboard-alerts",
    authorizeRole(["Admin", "Manager", "Salesperson", "Marketer"]),
    async (_req, res, next) => {
      try {
        const data = await getKouroshPulseDashboardAlerts();
        res.json({ success: true, data });
      } catch (error) {
        next(error);
      }
    },
  );
};
