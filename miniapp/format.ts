import { formatIsoToShamsi } from "../utils/dateUtils";
import { formatExactNumberText } from "../utils/exactNumber";

export const formatToman = (value: unknown): string =>
  `${formatExactNumberText(value)} تومان`;

export const formatPartnerType = (value?: string | null): string => {
  const normalized = String(value || "").trim();
  if (!normalized) return "همکار فروشگاه کوروش";
  if (normalized.toLowerCase() === "supplier") return "تأمین‌کننده";
  return normalized;
};

export const formatCustomerDate = (value?: string | null): string => {
  if (!value) return "—";
  if (/^1[34]\d{2}\/\d{2}\/\d{2}/.test(value)) return value;
  return formatIsoToShamsi(value);
};
