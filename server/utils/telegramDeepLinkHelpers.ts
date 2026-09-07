import { buildNotifKeyboard } from "./customerTelegramNotifications";
import { serializeMiniAppStartParam } from "../../miniapp/startParam";
import { buildTelegramMiniAppLaunchButton } from "./telegramMiniApp";

export const buildAppLink = (baseUrl: string, hashPath: string): string => {
  const b = String(baseUrl || "")
    .trim()
    .replace(/\/+$/, "");
  if (!b) return "";
  const p = String(hashPath || "")
    .trim()
    .replace(/^\/+/, "");
  return `${b}/#/${p}`;
};
// Legacy/Public Main Web App deep links for Telegram URL buttons. app_base_url is not a Mini App URL or Local/PWA URL.
// We use hash routes: {base}/#/{path}
export const buildInstallmentDeepLink = (
  settings: any,
  saleId: any,
  paymentId?: any,
) => {
  const baseUrl = String((settings as any)?.app_base_url || "").trim();
  if (!baseUrl) return "";
  const sid = String(saleId ?? "").trim();
  if (!sid) return "";
  const q = paymentId
    ? `?paymentId=${encodeURIComponent(String(paymentId))}`
    : "";
  return buildAppLink(
    baseUrl,
    `installment-sales/${encodeURIComponent(sid)}${q}`,
  );
};
export const buildRepairDeepLink = (settings: any, repairId: any) => {
  const baseUrl = String((settings as any)?.app_base_url || "").trim();
  const rid = String(repairId ?? "").trim();
  if (!baseUrl || !rid) return "";
  return buildAppLink(baseUrl, `repairs/${encodeURIComponent(rid)}`);
};
// Optional payment link (if you have a gateway). Configure one of these keys in Settings:
// - telegram_payment_link_template (recommended) e.g. https://pay.example.com/i/{paymentId}
// - payment_link_template
// Placeholders supported: {customerId} {saleId} {paymentId} {amount} {dueDate}
export const buildPaymentLink = (settings: any, vars: Record<string, any>) => {
  const tpl = String(
    (settings as any)?.telegram_payment_link_template ||
      (settings as any)?.payment_link_template ||
      "",
  ).trim();
  if (!tpl) return "";
  const url = safeReplaceTemplate(tpl, vars);
  return /^https?:\/\//i.test(url) ? url : "";
};
export const buildTelegramDeepLinkKeyboard = (opts: {
  primaryMenu: "installments" | "repairs" | "balance" | "invoices";
  installment?: {
    saleId: any;
    paymentId?: any;
    amount?: any;
    dueDate?: any;
    customerId?: any;
  };
  repair?: { repairId: any; customerId?: any };
  settings: any;
}) => {
  const s = opts.settings || {};
  const rows: any[] = [];
  // Legacy web-app entity links — only if app_base_url is explicitly configured
  const deepBtns: any[] = [];
  if (opts.installment?.saleId) {
    const saleId = Number(opts.installment.saleId);
    const paymentId = Number(opts.installment.paymentId || 0);
    const miniAppButton = Number.isSafeInteger(saleId) && saleId > 0
      ? buildTelegramMiniAppLaunchButton(
          s,
          serializeMiniAppStartParam({
            version: "v1",
            role: "customer",
            page: "installment",
            saleId,
            ...(Number.isSafeInteger(paymentId) && paymentId > 0 ? { paymentId } : {}),
          }),
          "🔎 مشاهده در پنل کوروش",
        )
      : null;
    if (miniAppButton) {
      deepBtns.push(miniAppButton);
    } else {
      const url = buildInstallmentDeepLink(
        s,
        opts.installment.saleId,
        opts.installment.paymentId,
      );
      if (url)
        deepBtns.push({
          text: `🔎 مشاهده جزئیات قسط #${String(opts.installment.paymentId ?? opts.installment.saleId)}`,
          url,
        });
    }
    const payUrl = buildPaymentLink(s, {
      customerId: opts.installment.customerId,
      saleId: opts.installment.saleId,
      paymentId: opts.installment.paymentId,
      amount: opts.installment.amount,
      dueDate: opts.installment.dueDate,
    });
    if (payUrl) deepBtns.push({ text: "💳 پرداخت", url: payUrl });
  }
  if (opts.repair?.repairId) {
    const url = buildRepairDeepLink(s, opts.repair.repairId);
    if (url)
      deepBtns.push({
        text: `🔎 جزئیات تعمیر #${String(opts.repair.repairId)}`,
        url,
      });
  }
  if (deepBtns.length) rows.push(deepBtns.slice(0, 2)); // keep it clean
  // Keep the bot menu buttons too (fallback + UX)
  const baseMenu = buildNotifKeyboard(opts.primaryMenu);
  for (const r of (baseMenu as any).inline_keyboard || []) rows.push(r);
  return { inline_keyboard: rows };
};
export const safeReplaceTemplate = (
  tpl: string,
  vars: Record<string, any>,
): string => {
  const raw = String(tpl || "");
  return raw.replace(/\{(\w+)\}/g, (_m, key) => {
    const v = vars[key];
    if (v === undefined || v === null) return "";
    return String(v);
  });
};
