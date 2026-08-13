import { formatExactNumberText } from "../../utils/exactNumber";
export const createFormatPriceForSms = (moneyDivisor: number) => {
  return (price: number): string => {
    const n = Number(price || 0);
    const toman = Number.isFinite(n) ? n / moneyDivisor : 0;
    return formatExactNumberText(toman);
  };
};

export const makeCorrId = () =>
  `sms_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

// Basic sanitizers for Telegram parse modes (server-side)
export const sanitizeTelegramHtml = (html: string): string => {
  let s = String(html || "");
  s = s.replace(
    /<\s*(script|style|iframe|object|embed|link|meta)(.|\n|\r)*?<\s*\/\s*\1\s*>/gi,
    "",
  );
  s = s.replace(
    /<\s*(script|style|iframe|object|embed|link|meta)[^>]*\/>/gi,
    "",
  );
  s = s.replace(/\son\w+\s*=\s*"[^"]*"/gi, "");
  s = s.replace(/\son\w+\s*=\s*'[^']*'/gi, "");
  s = s.replace(/\son\w+\s*=\s*[^\s>]+/gi, "");
  s = s.replace(/(href|src)\s*=\s*"\s*javascript:[^"]*"/gi, '$1="#"');
  s = s.replace(/(href|src)\s*=\s*'\s*javascript:[^']*'/gi, '$1="#"');
  return s;
};

export const stripTags = (txt: string): string =>
  String(txt || "").replace(/<[^>]*>/g, "");

export const renderTpl = (tpl: string, vars: Record<string, any>) => {
  const src = String(tpl ?? "");
  return src.replace(/\{(\w+)\}/g, (_m, k) => {
    const v = (vars as any)[k];
    return v === undefined || v === null ? "" : String(v);
  });
};

export const escapeHtml = (s: any) => {
  const t = String(s ?? "");
  return t
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

// For Telegram parse_mode=HTML. Keeps templates simple while preventing tag injection.
export const renderTplHtml = (tpl: string, vars: Record<string, any>) => {
  const safeVars: Record<string, any> = {};
  for (const k of Object.keys(vars || {}))
    safeVars[k] = escapeHtml((vars as any)[k]);
  return renderTpl(String(tpl ?? ""), safeVars);
};

// Best-effort: allow older templates that used markdown-like **bold** and __italic__
// to render nicely in Telegram HTML parse mode.
export const markdownishToHtml = (tpl: string) => {
  const s = String(tpl ?? "");
  // replace **bold**
  const b = s.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
  // replace __italic__
  return b.replace(/__(.+?)__/g, "<i>$1</i>");
};

export const telegramSafeValue = (value: any) => escapeHtml(value);

export const telegramCard = (
  title: string,
  icon: string,
  lines: string[],
  footer?: string,
) => {
  const body = (lines || []).filter(Boolean).join("\n");
  return [
    `<b>${icon} ${title}</b>`,
    "────────────",
    body,
    footer ? `\n${footer}` : "",
  ]
    .filter(Boolean)
    .join("\n");
};

export const telegramBullet = (icon: string, label: string, value: any) =>
  `▫️ ${icon} <b>${telegramSafeValue(label)}:</b> ${telegramSafeValue(value)}`;
