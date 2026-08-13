export const MINI_APP_START_PARAM_MAX_LENGTH = 64;

export type MiniAppRole = "customer" | "partner" | "staff";

export type MiniAppStartTarget =
  | { version: "v1"; role: "customer"; page: "home" | "account" | "purchases" | "installments" }
  | { version: "v1"; role: "customer"; page: "installment"; saleId: number; paymentId?: number }
  | { version: "v1"; role: "customer"; page: "invoice"; source: "order" | "legacy"; invoiceId: number }
  | { version: "v1"; role: "partner"; page: "home" | "account" | "ledger" | "purchases" | "phones" }
  | { version: "v1"; role: "staff"; page: "home" | "search" | "dues" | "inventory" | "sales" }
  | { version: "v1"; role: "staff"; page: "customer" | "phone" | "installment"; entityId: number }
  | { version: "v1"; role: "staff"; page: "invoice"; source: "order" | "legacy"; entityId: number };

const ALLOWED_PARAM = /^[A-Za-z0-9_-]+$/;
const POSITIVE_ID = /^[1-9]\d*$/;

const parseId = (raw: string): number | null => {
  if (!POSITIVE_ID.test(raw)) return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) ? value : null;
};

export const isMiniAppStartParamShapeValid = (value: unknown): value is string => {
  const raw = String(value ?? "");
  return raw.length > 0 && raw.length <= MINI_APP_START_PARAM_MAX_LENGTH && ALLOWED_PARAM.test(raw);
};

export const parseMiniAppStartParam = (value: unknown): MiniAppStartTarget | null => {
  if (!isMiniAppStartParamShapeValid(value)) return null;
  const raw = String(value);
  const customerPage = raw.match(/^v1_c_(home|account|purchases|installments)$/);
  if (customerPage) {
    return { version: "v1", role: "customer", page: customerPage[1] as "home" | "account" | "purchases" | "installments" };
  }
  const installment = raw.match(/^v1_c_inst_([^_]+)(?:_([^_]+))?$/);
  if (installment) {
    const saleId = parseId(installment[1]);
    const paymentId = installment[2] ? parseId(installment[2]) : undefined;
    if (!saleId || (installment[2] && !paymentId)) return null;
    return { version: "v1", role: "customer", page: "installment", saleId, ...(paymentId ? { paymentId } : {}) };
  }
  const invoice = raw.match(/^v1_c_inv_(order|legacy)_([^_]+)$/);
  if (invoice) {
    const invoiceId = parseId(invoice[2]);
    if (!invoiceId) return null;
    return { version: "v1", role: "customer", page: "invoice", source: invoice[1] as "order" | "legacy", invoiceId };
  }
  const partnerPage = raw.match(/^v1_p_(home|account|ledger|purchases|phones)$/);
  if (partnerPage) {
    return { version: "v1", role: "partner", page: partnerPage[1] as "home" | "account" | "ledger" | "purchases" | "phones" };
  }
  const staffPage = raw.match(/^v1_s_(home|search|dues|inventory|sales)$/);
  if (staffPage) {
    return { version: "v1", role: "staff", page: staffPage[1] as "home" | "search" | "dues" | "inventory" | "sales" };
  }
  const staffEntity = raw.match(/^v1_s_(customer|phone|inst)_([^_]+)$/);
  if (staffEntity) {
    const entityId = parseId(staffEntity[2]);
    if (!entityId) return null;
    const page = staffEntity[1] === "inst" ? "installment" : staffEntity[1] as "customer" | "phone";
    return { version: "v1", role: "staff", page, entityId };
  }
  const staffInvoice = raw.match(/^v1_s_inv_(order|legacy)_([^_]+)$/);
  if (staffInvoice) {
    const entityId = parseId(staffInvoice[2]);
    if (!entityId) return null;
    return { version: "v1", role: "staff", page: "invoice", source: staffInvoice[1] as "order" | "legacy", entityId };
  }
  return null;
};

export const serializeMiniAppStartParam = (target: MiniAppStartTarget): string => {
  if (target.role === "partner") return `v1_p_${target.page}`;
  if (target.role === "staff") {
    if (target.page === "invoice") return `v1_s_inv_${target.source}_${target.entityId}`;
    if (target.page === "installment") return `v1_s_inst_${target.entityId}`;
    if (target.page === "customer" || target.page === "phone") return `v1_s_${target.page}_${target.entityId}`;
    return `v1_s_${target.page}`;
  }
  if (target.page === "installment") {
    return `v1_c_inst_${target.saleId}${target.paymentId ? `_${target.paymentId}` : ""}`;
  }
  if (target.page === "invoice") return `v1_c_inv_${target.source}_${target.invoiceId}`;
  return `v1_c_${target.page}`;
};

export const miniAppRouteForStartParam = (value: unknown, authenticatedRole: MiniAppRole): string => {
  const target = parseMiniAppStartParam(value);
  if (!target || target.role !== authenticatedRole) return "/";
  if (target.role === "partner") return target.page === "home" ? "/" : `/${target.page}`;
  if (target.role === "staff") {
    if (target.page === "home") return "/";
    if (target.page === "customer") return `/customers/${target.entityId}`;
    if (target.page === "phone") return `/phones/${target.entityId}`;
    if (target.page === "installment") return `/installments/${target.entityId}`;
    if (target.page === "invoice") return `/invoices/${target.source}-${target.entityId}`;
    return `/${target.page}`;
  }
  if (target.page === "home") return "/";
  if (target.page === "installment") {
    const query = target.paymentId ? `?paymentId=${target.paymentId}` : "";
    return `/installments/${target.saleId}${query}`;
  }
  if (target.page === "invoice") return `/invoices/${target.source}-${target.invoiceId}`;
  return `/${target.page}`;
};

export const resolveMiniAppLaunch = (value: unknown, authenticatedRole: MiniAppRole) => {
  const parsed = parseMiniAppStartParam(value);
  const compatible = Boolean(parsed && parsed.role === authenticatedRole);
  return {
    startParam: compatible && parsed ? serializeMiniAppStartParam(parsed) : null,
    route: compatible ? miniAppRouteForStartParam(value, authenticatedRole) : "/",
  };
};
