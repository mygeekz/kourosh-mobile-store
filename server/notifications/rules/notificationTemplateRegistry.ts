import type { NotificationTemplate } from "./notificationRuleTypes";

// Semantic contracts only: no provider IDs, rendering, credentials or token generation.
export const notificationTemplateRegistry: readonly NotificationTemplate[] = Object.freeze([
  { key: "payment_confirmation", eventTypes: ["INSTALLMENT_PAYMENT_RECEIVED"], requiredVariables: ["name", "amount"], amountMeaning: "transaction_amount" },
  { key: "installment_due_notice", eventTypes: ["INSTALLMENT_DUE"], requiredVariables: ["name", "amount", "dueDate"], amountMeaning: "scheduled_installment_amount" },
  { key: "installment_overdue", eventTypes: ["INSTALLMENT_OVERDUE"], requiredVariables: ["name", "amount", "dueDate"], amountMeaning: "scheduled_installment_amount" },
  { key: "installment_sale_created", eventTypes: ["INSTALLMENT_SALE_CREATED"], requiredVariables: ["name", "saleId", "total"], amountMeaning: "contract_total" },
  { key: "installment_settlement", eventTypes: ["INSTALLMENT_SETTLED"], requiredVariables: ["name"], amountMeaning: null },
  { key: "invoice_created", eventTypes: ["INVOICE_CREATED"], requiredVariables: ["name", "invoiceNo", "total"], amountMeaning: "invoice_total" },
  { key: "invoice_payment_received", eventTypes: ["INVOICE_PAYMENT_RECEIVED"], requiredVariables: ["name", "invoiceNo", "amount"], amountMeaning: "transaction_amount" },
  { key: "account_balance", eventTypes: ["ACCOUNT_BALANCE_STATUS"], requiredVariables: ["status", "amount"], amountMeaning: "customer_balance_absolute" },
  { key: "check_due", eventTypes: ["CHECK_DUE"], requiredVariables: ["name", "checkNumber", "dueDate", "amount"], amountMeaning: "check_amount" },
  { key: "check_failed", eventTypes: ["CHECK_FAILED"], requiredVariables: ["name", "amount", "dueDate"], amountMeaning: "check_amount" },
].map(template => Object.freeze({ ...template, eventTypes: Object.freeze(template.eventTypes), requiredVariables: Object.freeze(template.requiredVariables) })));
