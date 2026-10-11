import { MELI_PAYAMAK_PATTERN_DEFINITIONS } from "../../shared/messages";

type GetAsync = (sql: string, params?: any[]) => Promise<any>;
// Fixed UTC boundary for this source-reference migration, never process startup.
export const FINANCIAL_SMS_SOURCE_MIGRATION_AT = "2026-09-14T07:52:44.000Z";
export type FinancialSmsContext = {
  id?: number; eventType?: string | null; entityType?: string | null;
  entityId?: number | null; createdAt?: string | null;
};
const patterns: Record<string, string> = {
  INSTALLMENT_PAYMENT_RECEIVED: "payment_confirmation",
  INSTALLMENT_SALE_CREATED: "installment_sale_created",
  INSTALLMENT_SETTLED: "installment_settlement",
  ACCOUNT_BALANCE_STATUS: "account_balance",
  INSTALLMENT_DUE_NOTICE: "installment_due_notice",
  INSTALLMENT_OVERDUE_NOTICE: "installment_overdue",
  INSTALLMENT_DUE_TODAY: "installment_due_today",
  INSTALLMENT_DUE_3: "installment_due_3", INSTALLMENT_DUE_7: "installment_due_7",
  CHECK_FAILED: "check_failed", INVOICE_PAYMENT_RECEIVED: "invoice_payment_received",
  INVOICE_CREATED: "invoice_created", INSTALLMENT_REMINDER: "installment_reminder",
  INSTALLMENT_COMPLETED: "installment_completed",
  CHECK_DUE_TODAY: "check_due_today", CHECK_DUE_3: "check_due_3", CHECK_DUE_7: "check_due_7",
};
export function financialSmsEntityType(event: string): string | undefined {
  if (!Object.prototype.hasOwnProperty.call(patterns, event)) return undefined;
  if (event.startsWith("CHECK_")) return "installment_check";
  if (["ACCOUNT_BALANCE_STATUS", "INVOICE_PAYMENT_RECEIVED"].includes(event)) return "customer";
  if (event === "INVOICE_CREATED") return "sales_order";
  if (["INSTALLMENT_SETTLED", "INSTALLMENT_COMPLETED", "INSTALLMENT_SALE_CREATED"].includes(event)) return "installment_sale";
  return "installment_payment";
}
function amount(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string") return null;
  const text = String(value).trim()
    .replace(/[۰-۹]/g, d => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, d => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[\u200e\u200f\u061c\u2066-\u2069]/g, "")
    .replace(/−/g, "-").replace(/٫/g, ".");
  if (!/^[+-]?(?:\d+|\d{1,3}(?:[,٬]\d{3})+)(?:\.\d+)?$/.test(text)) return null;
  const result = Number(text.replace(/[,٬]/g, ""));
  return Number.isFinite(result) ? result : null;
}
function timestamp(value: unknown) {
  const text = String(value || "").trim().replace(" ", "T");
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/.test(text)) return NaN;
  return Date.parse(/(?:Z|[+-]\d{2}:\d{2})$/.test(text) ? text : text + "Z");
}

export function legacyPaymentSourceRejection(row: FinancialSmsContext, payload: any, checkedAt = new Date().toISOString()) {
  if (row.eventType !== "INSTALLMENT_PAYMENT_RECEIVED" || payload?.sourceTransactionId != null
    || !(timestamp(row.createdAt) < Date.parse(FINANCIAL_SMS_SOURCE_MIGRATION_AT))) return null;
  return {
    reason: "LEGACY_SOURCE_UNAVAILABLE", issue: "PRE_MIGRATION_TRANSACTION_REFERENCE_MISSING",
    notificationId: row.id ?? null, eventType: row.eventType, createdAt: row.createdAt,
    migrationAt: FINANCIAL_SMS_SOURCE_MIGRATION_AT, checkedAt,
  };
}

// Use the actual configured provider template, never a historical token count.
// No template definitions are modified here.
function contract(event: string, provider: string, settings: Record<string, any>) {
  let suffix = patterns[event];
  if (provider === "meli_payamak") {
    if (["INSTALLMENT_DUE_TODAY", "INSTALLMENT_REMINDER"].includes(event) && settings.meli_payamak_installment_due_notice_pattern_id) suffix = "installment_due_notice";
    if (["INSTALLMENT_COMPLETED", "INSTALLMENT_SETTLED"].includes(event)) suffix = settings.meli_payamak_installment_settlement_pattern_id ? "installment_settlement" : "installment_completed";
    const key = "meli_payamak_" + suffix + "_pattern_id";
    const definition = MELI_PAYAMAK_PATTERN_DEFINITIONS.find(item => item.key === key);
    const keys = definition?.tokenKeys || (event.startsWith("CHECK_DUE_") ? ["name", "checkNumber", "dueDate", "amount"]
      : suffix === "installment_completed" ? ["name", "saleId", "total"] : ["name", "amount", "dueDate"]);
    return { id: String(settings[key] || (event === "INSTALLMENT_REMINDER" ? 341283 : "")), keys };
  }
  if (["INSTALLMENT_COMPLETED", "INSTALLMENT_SETTLED"].includes(event)) suffix = "installment_completed";
  if (event === "INSTALLMENT_REMINDER") suffix = "installment";
  const key = provider === "kavenegar" ? "kavenegar_" + suffix + "_template"
    : provider === "sms_ir" ? "sms_ir_" + suffix + "_template_id" : "ippanel_" + suffix + "_pattern_code";
  const definition = MELI_PAYAMAK_PATTERN_DEFINITIONS.find(item => item.key === "meli_payamak_" + suffix + "_pattern_id");
  const keys = suffix === "installment_completed" ? ["name", "saleId", "total"]
    : event.startsWith("CHECK_DUE_") ? ["name", "checkNumber", "dueDate", "amount"]
    : ["INSTALLMENT_DUE_TODAY", "INSTALLMENT_DUE_3", "INSTALLMENT_DUE_7", "INSTALLMENT_REMINDER"].includes(event) ? ["name", "amount", "dueDate"]
    : definition?.tokenKeys || [];
  return { id: String(settings[key] || ""), keys };
}

// One read-only validator for queue, scheduled sends and manual retries.
// Transaction references are authoritative IDs, never searches by amount.
export async function validateFinancialSms(
  row: FinancialSmsContext, payload: any, getAsync: GetAsync,
  settings: Record<string, any>, checkedAt = new Date().toISOString(),
) {
  const eventType = row.eventType || "";
  const legacy = legacyPaymentSourceRejection(row, payload, checkedAt);
  if (legacy) return legacy;
  const provider = String(payload?.provider || settings.sms_provider || "meli_payamak").toLowerCase();
  const patternId = String(provider === "meli_payamak" ? payload?.meliBodyId || ""
    : provider === "kavenegar" ? payload?.kavenegarTemplate || ""
    : provider === "sms_ir" ? payload?.smsIrTemplateId || "" : payload?.ippanelPatternCode || "");
  if (!financialSmsEntityType(eventType)) {
    const financialPattern = Object.keys(patterns).some(event => contract(event, provider, settings).id === patternId && patternId !== "");
    if (!financialPattern) return null;
  }
  const createdAtMs = timestamp(row.createdAt);
  const diagnostic: any = { notificationId: row.id ?? null, eventType, customerId: null,
    sourceTransactionId: payload?.sourceTransactionId ?? null, expectedAmount: null, payloadAmount: null,
    createdAt: row.createdAt ?? null, checkedAt,
    expiredAt: Number.isFinite(createdAtMs) ? new Date(createdAtMs + 7 * 86400000).toISOString() : null };
  const fail = (reason: string, issue: string) => ({ ...diagnostic, reason, issue });
  const entityType = financialSmsEntityType(eventType);
  if (!entityType || row.entityType !== entityType || !Number.isSafeInteger(row.entityId) || Number(row.entityId) <= 0)
    return fail("VALIDATION_SOURCE_MISSING", "ENTITY_REFERENCE_MISSING");
  const transactionEvent = ["INSTALLMENT_PAYMENT_RECEIVED", "INVOICE_PAYMENT_RECEIVED"].includes(eventType);
  if (transactionEvent && (!Number.isSafeInteger(payload?.sourceTransactionId) || payload.sourceTransactionId <= 0))
    return fail("VALIDATION_SOURCE_MISSING", "TRANSACTION_REFERENCE_MISSING");
  if (!Number.isFinite(createdAtMs)) return fail("VALIDATION_SOURCE_MISSING", "CREATED_AT_MISSING");
  if (timestamp(checkedAt) - createdAtMs > 7 * 86400000) return fail("NOTIFICATION_EXPIRED", "OLDER_THAN_SEVEN_DAYS");
  let source: any;
  if (eventType === "INSTALLMENT_PAYMENT_RECEIVED") {
    source = await getAsync(`SELECT t.amount_paid AS amount, s.customerId
      FROM installment_transactions t JOIN installment_payments p ON p.id=t.installment_payment_id
      JOIN installment_sales s ON s.id=p.saleId WHERE t.id=? AND t.installment_payment_id=?`,
      [payload.sourceTransactionId, row.entityId]);
  } else if (eventType === "INVOICE_PAYMENT_RECEIVED") {
    source = await getAsync(`SELECT customerId, credit, debit FROM customer_ledger WHERE id=? AND customerId=?`, [payload.sourceTransactionId, row.entityId]);
    if (source) source.amount = Number(source.credit) || Number(source.debit);
  } else if (entityType === "installment_payment") {
    source = await getAsync(`SELECT s.customerId, p.amountDue AS amount FROM installment_payments p JOIN installment_sales s ON s.id=p.saleId WHERE p.id=?`, [row.entityId]);
  } else if (entityType === "installment_sale") {
    source = await getAsync(`SELECT customerId, actualSalePrice AS amount FROM installment_sales WHERE id=?`, [row.entityId]);
  } else if (entityType === "installment_check") {
    source = await getAsync(`SELECT s.customerId, c.amount FROM installment_checks c JOIN installment_sales s ON s.id=c.saleId WHERE c.id=?`, [row.entityId]);
  } else if (entityType === "sales_order") {
    source = await getAsync(`SELECT customerId, grandTotal AS amount FROM sales_orders WHERE id=?`, [row.entityId]);
  } else {
    source = await getAsync(`SELECT c.id AS customerId, COALESCE(eb.currentBalance,0) AS balance FROM customers c LEFT JOIN v_customer_effective_balance eb ON eb.customerId=c.id WHERE c.id=?`, [row.entityId]);
    if (source) source.amount = Math.abs(Number(source.balance));
  }
  if (!source) return fail("VALIDATION_SOURCE_MISSING", "SOURCE_NOT_FOUND_OR_UNRELATED");
  diagnostic.customerId = source.customerId;
  diagnostic.expectedAmount = amount(source.amount);
  const expected = contract(eventType, provider, settings);
  const tokens = Array.isArray(payload?.tokens) ? payload.tokens : [];
  if (!expected.id || patternId !== expected.id || tokens.length !== expected.keys.length || tokens.some((token: any) => typeof token !== "string" || token.includes(";")))
    return fail("VALIDATION_TEMPLATE_MISMATCH", "UNVERIFIED_TOKEN_CONTRACT");
  const index = expected.keys.findIndex(key => key === "amount" || key === "total");
  diagnostic.payloadAmountFieldName = index >= 0 ? "tokens[" + index + "]" : null;
  if (index < 0) return null; // Current settlement template deliberately has no amount.
  diagnostic.payloadAmount = amount(tokens[index]);
  if (diagnostic.payloadAmount === null || diagnostic.expectedAmount === null || diagnostic.payloadAmount < 0 || diagnostic.expectedAmount < 0)
    return fail("AMOUNT_MISMATCH", "MISSING_OR_INVALID_AMOUNT");
  if (diagnostic.payloadAmount !== diagnostic.expectedAmount)
    return fail("AMOUNT_MISMATCH", "SOURCE_AMOUNT_DIFFERENT");
  if (eventType === "ACCOUNT_BALANCE_STATUS") {
    const statusIndex = expected.keys.indexOf("status");
    const expectedStatus = source.balance > 0 ? "بدهی" : source.balance < 0 ? "طلب" : "تسویه";
    if (statusIndex >= 0 && tokens[statusIndex] !== expectedStatus) return fail("AMOUNT_MISMATCH", "BALANCE_DIRECTION_DIFFERENT");
  }
  return null;
}

export async function sendValidatedFinancialSms(
  row: FinancialSmsContext, payload: any,
  deps: { getAsync: GetAsync; settings: Record<string, any>; checkedAt?: string },
  send: () => Promise<any>,
) {
  const validation = await validateFinancialSms(row, payload, deps.getAsync, deps.settings, deps.checkedAt);
  if (validation) {
    console.warn("FINANCIAL_SMS_VALIDATION_REJECTED", validation);
    return { success: false, message: validation.reason, validation };
  }
  return send();
}

// Reuse the original source and creation time across any number of manual retries.
// Legacy payment logs have no transaction ID and consequently fail closed.
export function financialSmsFromLog(log: any) {
  let request: any = {};
  try { request = JSON.parse(log.requestJson || "{}"); } catch {}
  const saved = request.financialSms;
  const providerRequest = request?.providerRequest && typeof request.providerRequest === "object"
    ? request.providerRequest
    : {};
  const provider = String(log.provider || providerRequest.provider || "meli_payamak").toLowerCase();
  let savedTokens: any[] = [];
  try { savedTokens = JSON.parse(log.tokensJson || "[]"); } catch {}
  const tokens = Array.isArray(savedTokens) && savedTokens.length
    ? savedTokens
    : Array.isArray(providerRequest.tokens)
      ? providerRequest.tokens
      : Array.isArray(saved?.payload?.tokens)
        ? saved.payload.tokens
        : [];
  const patternId = String(log.patternId || providerRequest.patternId || "").trim();
  return {
    context: {
      eventType: log.eventType,
      // Never guess what a legacy generic "installment" ID refers to.
      entityType: saved?.context?.entityType || log.entityType,
      entityId: Number(log.entityId) || null,
      createdAt: saved?.context?.createdAt || log.createdAt,
    },
    payload: {
      provider,
      recipient: log.recipient,
      tokens: tokens.map((value: any) => String(value)),
      sourceTransactionId: saved?.payload?.sourceTransactionId,
      meliBodyId: provider === "meli_payamak" ? Number(patternId || saved?.payload?.meliBodyId) || undefined : undefined,
      kavenegarTemplate: provider === "kavenegar" ? (patternId || saved?.payload?.kavenegarTemplate) : undefined,
      smsIrTemplateId: provider === "sms_ir" ? Number(patternId || saved?.payload?.smsIrTemplateId) || undefined : undefined,
      ippanelPatternCode: provider === "ippanel" ? (patternId || saved?.payload?.ippanelPatternCode) : undefined,
    },
  };
}
