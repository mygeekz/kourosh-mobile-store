import { formatIsoToShamsi } from "../utils/dateUtils";
import { formatExactNumberText } from "../utils/exactNumber";

export const formatToman = (value: unknown): string =>
  `${formatExactNumberText(value)} تومان`;

export const formatCustomerDate = (value?: string | null): string => {
  if (!value) return "—";
  if (/^1[34]\d{2}\/\d{2}\/\d{2}/.test(value)) return value;
  return formatIsoToShamsi(value);
};
