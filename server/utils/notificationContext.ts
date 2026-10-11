import { MELI_PAYAMAK_PATTERN_DEFINITIONS } from "../../shared/messages";

// Observability only: never use this object to authorize, calculate or send a message.
export type NotificationContext = {
  schemaVersion: 1;
  eventType: string | null;
  ruleId: number | null;
  sourceType: string | null;
  sourceId: number | null;
  customerId: number | null;
  contractId: number | null;
  installmentId: number | null;
  transactionId: number | null;
  checkId: number | null;
  invoiceId: number | null;
  amount: { value: string | number | null; meaning: string | null; currency: "toman" | null };
  templateKey: string | null;
  templateVersion: string | null;
  createdBy: { userId: number | null; username: string | null } | null;
  createdAt: string | null;
};

const id = (value: unknown): number | null =>
  typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : null;
const text = (value: unknown): string | null => typeof value === "string" && value.length > 0 ? value : null;

export function notificationAmountMeaning(eventType?: string | null): string | null {
  if (eventType === "INSTALLMENT_PAYMENT_RECEIVED") return "payment_received";
  if (eventType === "INVOICE_PAYMENT_RECEIVED") return "invoice_payment_received";
  if (eventType === "ACCOUNT_BALANCE_STATUS") return "customer_balance_absolute";
  if (eventType === "INVOICE_CREATED") return "invoice_total";
  if (["INSTALLMENT_SALE_CREATED", "INSTALLMENT_SETTLED", "INSTALLMENT_COMPLETED"].includes(eventType || "")) return "contract_total";
  if (/^INSTALLMENT_(DUE_(NOTICE|TODAY|3|7)|OVERDUE_NOTICE|REMINDER)$/.test(eventType || "")) return "installment_original_amount";
  if (/^CHECK_(FAILED|DUE_(TODAY|3|7))$/.test(eventType || "")) return "check_amount";
  return null;
}

// Only use an explicitly selected catalog key; never guess positions from token count or body ID.
export function notificationTemplateAmount(eventType: string, templateKey: string, tokens: unknown[]) {
  const definition = MELI_PAYAMAK_PATTERN_DEFINITIONS.find(item => item.key === templateKey);
  const index = definition?.tokenKeys.findIndex(key => key === "amount" || key === "total") ?? -1;
  const value = index >= 0 && tokens.length === definition?.tokenKeys.length ? tokens[index] : null;
  return {
    value: typeof value === "string" || (typeof value === "number" && Number.isFinite(value)) ? value : null,
    meaning: index >= 0 ? notificationAmountMeaning(eventType) : null,
    currency: index >= 0 ? "toman" as const : null,
  };
}

export function buildNotificationContext(row: any = {}, payload: any = {}, supplied: any = {}): NotificationContext {
  const saved = supplied || {};
  const eventType = text(row.eventType) ?? text(saved.eventType);
  const entityId = id(row.entityId);
  const installmentId = row.entityType === "installment_payment" ? entityId : id(saved.installmentId);
  const contractId = row.entityType === "installment_sale" ? entityId : id(saved.contractId);
  const customerId = row.entityType === "customer" ? entityId : id(saved.customerId) ?? id(payload?.capCustomerId) ?? id(payload?.meta?.capCustomerId);
  const invoiceId = row.entityType === "sales_order" ? entityId : id(saved.invoiceId);
  const checkId = row.entityType === "installment_check" ? entityId : id(saved.checkId);
  // A descriptive context must not manufacture a reference absent from the authoritative payload.
  const transactionId = id(payload?.sourceTransactionId);
  let sourceType: string | null = null;
  let sourceId: number | null = null;
  if (eventType === "INSTALLMENT_PAYMENT_RECEIVED") { sourceType = "installment_transactions"; sourceId = transactionId; }
  else if (eventType === "INVOICE_PAYMENT_RECEIVED") { sourceType = "customer_ledger"; sourceId = transactionId; }
  else if (row.entityType === "installment_payment") { sourceType = "installment_payments"; sourceId = installmentId; }
  else if (row.entityType === "installment_sale") { sourceType = "installment_sales"; sourceId = contractId; }
  else if (row.entityType === "customer") { sourceType = "customers"; sourceId = customerId; }
  else if (row.entityType === "installment_check") { sourceType = "installment_checks"; sourceId = checkId; }
  else if (row.entityType === "sales_order") { sourceType = "sales_orders"; sourceId = invoiceId; }
  const rawAmount = saved.amount?.value;
  return {
    schemaVersion: 1, eventType, ruleId: id(saved.ruleId) ?? id(payload?.meta?.ruleId), sourceType, sourceId,
    customerId, contractId, installmentId, transactionId, checkId, invoiceId,
    amount: {
      // Preserve the producer's exact display value, including Persian digits. No conversions or calculations.
      value: typeof rawAmount === "string" || (typeof rawAmount === "number" && Number.isFinite(rawAmount)) ? rawAmount : null,
      meaning: text(saved.amount?.meaning), currency: saved.amount?.currency === "toman" ? "toman" : null,
    },
    templateKey: text(saved.templateKey), templateVersion: text(saved.templateVersion),
    createdBy: saved.createdBy ? { userId: id(saved.createdBy.userId), username: text(saved.createdBy.username) } : null,
    createdAt: text(saved.createdAt) ?? text(row.createdAt),
  };
}

// Allowlist diagnostic fields. Never copy requests, credentials, raw provider bodies or arbitrary objects.
export function notificationValidationSummary(validation: any) {
  if (!validation) return null;
  const keys = ["reason", "issue", "notificationId", "eventType", "customerId", "sourceTransactionId", "expectedAmount", "payloadAmount", "payloadAmountFieldName", "createdAt", "checkedAt", "expiredAt", "migrationAt"];
  return Object.fromEntries(keys.filter(key => validation[key] == null || ["string", "number", "boolean"].includes(typeof validation[key]))
    .map(key => [key, validation[key] ?? null]));
}
