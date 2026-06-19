// utils/qr.ts
// Helpers for generating QR values that are reliably recognized by phone cameras.

// NOTE: Many built-in camera scanners (notably iOS) only treat a QR as "usable" when it contains
// a recognized payload (most commonly an http/https URL). So we generate URLs by default.

const stripTrailingSlash = (s: string) => s.replace(/\/+$/g, "");

export const publicBaseUrl = (): string => {
  // 1) Runtime-configured public URL (saved by Admin in Settings).
  // This helps when the dashboard runs on a local machine but QR codes must point to a public website.
  try {
    const ls = localStorage.getItem("qr_public_base_url");
    if (ls && ls.trim()) return stripTrailingSlash(ls.trim());
  } catch {}

  // 2) Build-time env vars (Vite).
  const env = (import.meta as any)?.env;
  const v = env?.VITE_PUBLIC_BASE_URL || env?.VITE_APP_PUBLIC_URL || env?.VITE_PUBLIC_URL;

  // 3) Fallback to current origin (works for local/dev and when the public site is the same host).
  return stripTrailingSlash((v && String(v)) || window.location.origin);
};

// Convert Persian/Arabic digits to Latin digits (helps for URLs + some scanners).
export const toLatinDigits = (input: string): string => {
  const fa = "۰۱۲۳۴۵۶۷۸۹";
  const ar = "٠١٢٣٤٥٦٧٨٩";
  return input
    .replace(/[۰-۹]/g, (d) => String(fa.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(ar.indexOf(d)));
};

export const makeInvoiceQrValue = (orderId: string, invoiceNumber?: string | number): string => {
  const inv = toLatinDigits(String(invoiceNumber ?? ""));
  // Keep payload short for better scan reliability.
  // Example: https://your-domain.com/invoices/<orderId>?inv=123
  const base = publicBaseUrl();
  const path = `/invoices/${encodeURIComponent(String(orderId))}`;
  return inv ? `${base}${path}?inv=${encodeURIComponent(inv)}` : `${base}${path}`;
};

export const makeRepairQrValue = (repairId: string): string => {
  const base = publicBaseUrl();
  return `${base}/repairs/${encodeURIComponent(String(repairId))}/receipt`;
};
