import type { ManagementPermission } from "../security/managementAccessPolicy";

export type ManagerNotificationSeverity = "info" | "success" | "warning" | "danger";
export type ManagerNotificationCategory = "sales" | "installments" | "repairs" | "customers" | "inventory" | "accounting" | "system";

export type ManagerNotificationDefinition = {
  key: string;
  label: string;
  category: ManagerNotificationCategory;
  severity: ManagerNotificationSeverity;
  requiredPermission: ManagementPermission;
  defaultTelegram: boolean;
  defaultInApp: boolean;
};

export const MANAGER_NOTIFICATION_CATALOG: readonly ManagerNotificationDefinition[] = [
  { key: "report.sales.nightly", label: "گزارش شبانه فروش", category: "sales", severity: "info", requiredPermission: "sales.read", defaultTelegram: false, defaultInApp: true },
  { key: "report.installments.morning", label: "گزارش صبح اقساط", category: "installments", severity: "info", requiredPermission: "installments.read", defaultTelegram: false, defaultInApp: true },
  { key: "event.sale.created", label: "ثبت فروش جدید", category: "sales", severity: "success", requiredPermission: "sales.read", defaultTelegram: false, defaultInApp: true },
  { key: "event.sale.cancelled", label: "لغو فروش", category: "sales", severity: "warning", requiredPermission: "sales.read", defaultTelegram: false, defaultInApp: true },
  { key: "event.sale.returned", label: "مرجوعی فروش", category: "sales", severity: "warning", requiredPermission: "sales.read", defaultTelegram: false, defaultInApp: true },
  { key: "event.sale.high_value", label: "فروش با مبلغ بالا", category: "sales", severity: "warning", requiredPermission: "sales.read", defaultTelegram: false, defaultInApp: true },
  { key: "event.installment.created", label: "فروش اقساطی جدید", category: "installments", severity: "info", requiredPermission: "installments.read", defaultTelegram: false, defaultInApp: true },
  { key: "event.installment.payment", label: "دریافت قسط", category: "installments", severity: "success", requiredPermission: "installments.read", defaultTelegram: false, defaultInApp: true },
  { key: "event.installment.settled", label: "تسویه فروش اقساطی", category: "installments", severity: "success", requiredPermission: "installments.read", defaultTelegram: false, defaultInApp: true },
  { key: "event.installment.due", label: "سررسید قسط", category: "installments", severity: "warning", requiredPermission: "installments.read", defaultTelegram: false, defaultInApp: true },
  { key: "event.installment.overdue", label: "قسط معوق", category: "installments", severity: "danger", requiredPermission: "installments.read", defaultTelegram: false, defaultInApp: true },
  { key: "event.check.failed", label: "چک برگشتی", category: "installments", severity: "danger", requiredPermission: "installments.read", defaultTelegram: false, defaultInApp: true },
  { key: "event.repair.received", label: "پذیرش تعمیر", category: "repairs", severity: "info", requiredPermission: "repairs.read", defaultTelegram: false, defaultInApp: true },
  { key: "event.repair.cost", label: "برآورد هزینه تعمیر", category: "repairs", severity: "info", requiredPermission: "repairs.read", defaultTelegram: false, defaultInApp: true },
  { key: "event.repair.status", label: "تغییر وضعیت تعمیر", category: "repairs", severity: "info", requiredPermission: "repairs.read", defaultTelegram: false, defaultInApp: true },
  { key: "event.repair.ready", label: "تعمیر آماده تحویل", category: "repairs", severity: "success", requiredPermission: "repairs.read", defaultTelegram: false, defaultInApp: true },
  { key: "event.repair.stale", label: "تعمیر بدون تغییر طولانی", category: "repairs", severity: "warning", requiredPermission: "repairs.read", defaultTelegram: false, defaultInApp: true },
  { key: "event.customer.balance", label: "تغییر وضعیت حساب مشتری", category: "customers", severity: "info", requiredPermission: "customers.ledger.read", defaultTelegram: false, defaultInApp: true },
  { key: "event.invoice.payment", label: "دریافت وجه فاکتور", category: "sales", severity: "success", requiredPermission: "sales.read", defaultTelegram: false, defaultInApp: true },
  { key: "event.inventory.critical", label: "موجودی بحرانی یا منفی", category: "inventory", severity: "danger", requiredPermission: "inventory.read", defaultTelegram: false, defaultInApp: true },
  { key: "event.transaction.unusual", label: "تراکنش غیرعادی", category: "accounting", severity: "warning", requiredPermission: "reports.read", defaultTelegram: false, defaultInApp: true },
  { key: "event.accounting.health_error", label: "خطای سلامت مالی", category: "accounting", severity: "danger", requiredPermission: "reports.read", defaultTelegram: false, defaultInApp: true },
  { key: "event.store.activity", label: "رویداد عمومی فروشگاه", category: "system", severity: "info", requiredPermission: "dashboard.read", defaultTelegram: false, defaultInApp: true },
] as const;

const BY_KEY = new Map(MANAGER_NOTIFICATION_CATALOG.map((item) => [item.key, item]));

export const getManagerNotificationDefinition = (key: string): ManagerNotificationDefinition | null =>
  BY_KEY.get(String(key || "").trim()) || null;

export const isManagerNotificationKey = (key: unknown): key is string =>
  typeof key === "string" && BY_KEY.has(key);

const stripAudienceSuffix = (value: string): string => value.replace(/_(?:MANAGER|PARTNER)$/i, "");

export const mapSourceEventToManagerNotificationKey = (
  topic: "reports" | "installments" | "sales" | "notifications",
  sourceEventType: string,
): string | null => {
  if (topic === "reports") {
    const reportType = String(sourceEventType || "").trim().toUpperCase();
    if (reportType === "MANAGER_REPORT_NIGHTLY_SALES") return "report.sales.nightly";
    if (reportType === "MANAGER_REPORT_MORNING_INSTALLMENTS") return "report.installments.morning";
    return null;
  }
  const raw = String(sourceEventType || "").trim().toUpperCase();
  if (!raw || raw.endsWith("_PARTNER")) return null;
  const type = stripAudienceSuffix(raw);

  if (type === "SALES_ORDER_CREATED" || type === "INVOICE_CREATED") return "event.sale.created";
  if (type === "SALES_ORDER_CANCELLED") return "event.sale.cancelled";
  if (type === "SALES_ORDER_RETURN_CREATED") return "event.sale.returned";
  if (type === "SALE_HIGH_VALUE") return "event.sale.high_value";
  if (type === "INSTALLMENT_SALE_CREATED") return "event.installment.created";
  if (type === "INSTALLMENT_PAYMENT_RECEIVED") return "event.installment.payment";
  if (type === "INSTALLMENT_SETTLED" || type === "INSTALLMENT_COMPLETED") return "event.installment.settled";
  if (type === "INSTALLMENT_OVERDUE_NOTICE") return "event.installment.overdue";
  if (type.startsWith("INSTALLMENT_DUE_") || type === "INSTALLMENT_DUE_NOTICE" || type === "INSTALLMENT_REMINDER") return "event.installment.due";
  if (type === "CHECK_FAILED") return "event.check.failed";
  if (type === "REPAIR_RECEIVED_CONFIRMATION" || type === "REPAIR_RECEIVED") return "event.repair.received";
  if (type === "REPAIR_COST_ESTIMATED") return "event.repair.cost";
  if (type === "REPAIR_READY_FOR_PICKUP") return "event.repair.ready";
  if (type === "REPAIR_DELIVERED") return "event.repair.status";
  if (type === "REPAIR_STATUS_UPDATED") return "event.repair.status";
  if (type === "REPAIR_STALE") return "event.repair.stale";
  if (type === "ACCOUNT_BALANCE_STATUS") return "event.customer.balance";
  if (type === "INVOICE_PAYMENT_RECEIVED") return "event.invoice.payment";
  if (type === "INVENTORY_CRITICAL" || type === "INVENTORY_NEGATIVE") return "event.inventory.critical";
  if (type === "TRANSACTION_UNUSUAL") return "event.transaction.unusual";
  if (type === "ACCOUNTING_HEALTH_ERROR") return "event.accounting.health_error";
  if (topic === "sales") return "event.store.activity";
  if (topic === "installments") return "event.installment.due";
  if (topic === "notifications") return "event.store.activity";
  return null;
};
