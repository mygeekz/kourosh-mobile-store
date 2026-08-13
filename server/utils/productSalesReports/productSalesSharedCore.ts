import { formatExactNumberText, toExactDecimalString } from "../../../utils/exactNumber";
import moment from "jalali-moment";
import { allAsync, getAsync, fromShamsiStringToISO } from "../../database";

export const REPORT_CURRENCY_CONTRACT = {
  storageCurrency: "toman",
  displayCurrency: "تومان",
  moneyDivisor: 1,
};

export const formatReportMoneyText = (value: any): string => {
  const n = Number(value || 0);
  const toman = Number.isFinite(n)
    ? n / REPORT_CURRENCY_CONTRACT.moneyDivisor
    : 0;
  return `${formatExactNumberText(toman)} ${REPORT_CURRENCY_CONTRACT.displayCurrency}`;
};

// ------------------------------
// فروش غیرگوشی (لوازم + خدمات) - Summary + Details
// ------------------------------
export const clamp01 = (v: number) => Math.max(0, Math.min(1, Number(v) || 0));
export const safeReportNumber = (value: any) =>
  Number.isFinite(Number(value)) ? Number(value) : 0;

const pow10BigInt = (scale: number) => 10n ** BigInt(Math.max(0, scale));

const decimalParts = (value: unknown): { units: bigint; scale: number } => {
  const exact = toExactDecimalString(value) || '0';
  const negative = exact.startsWith('-');
  const unsigned = exact.replace(/^[+-]/, '');
  const [integerPart = '0', fractionPart = ''] = unsigned.split('.');
  const digits = `${integerPart || '0'}${fractionPart}`.replace(/^0+(?=\d)/, '') || '0';
  return {
    units: BigInt(`${negative ? '-' : ''}${digits}`),
    scale: fractionPart.length,
  };
};

const scaleDecimalUnits = (parts: { units: bigint; scale: number }, targetScale: number) => {
  if (parts.scale === targetScale) return parts.units;
  if (parts.scale < targetScale) return parts.units * pow10BigInt(targetScale - parts.scale);
  return parts.units / pow10BigInt(parts.scale - targetScale);
};

/**
 * Allocates one monetary amount between rows without creating binary floating
 * point tails. The output always reconciles exactly to `total`; when `total` is
 * stored as an integer rial/toman amount every allocated row is also an integer.
 */
export function allocateReportAmountByWeights(total: unknown, weights: unknown[]): number[] {
  const totalParts = decimalParts(total);
  const sign = totalParts.units < 0n ? -1n : 1n;
  const totalUnits = totalParts.units < 0n ? -totalParts.units : totalParts.units;
  if (!weights.length) return [];
  if (totalUnits === 0n) return weights.map(() => 0);

  const parsedWeights = weights.map((value) => {
    const parts = decimalParts(value);
    return { units: parts.units < 0n ? 0n : parts.units, scale: parts.scale };
  });
  const weightScale = parsedWeights.reduce((max, item) => Math.max(max, item.scale), 0);
  const weightUnits = parsedWeights.map((item) => scaleDecimalUnits(item, weightScale));
  const weightTotal = weightUnits.reduce((sum, value) => sum + value, 0n);

  if (weightTotal <= 0n) {
    return weights.map((_, index) => index === 0
      ? Number(sign * totalUnits) / (10 ** totalParts.scale)
      : 0);
  }

  const allocations = weightUnits.map((weight, index) => {
    const numerator = totalUnits * weight;
    return { index, units: numerator / weightTotal, remainder: numerator % weightTotal };
  });
  let unallocated = totalUnits - allocations.reduce((sum, item) => sum + item.units, 0n);
  const remainderOrder = [...allocations].sort((a, b) => {
    if (a.remainder === b.remainder) return a.index - b.index;
    return a.remainder > b.remainder ? -1 : 1;
  });
  for (let index = 0; unallocated > 0n; index += 1) {
    remainderOrder[index % remainderOrder.length].units += 1n;
    unallocated -= 1n;
  }

  const divisor = 10 ** totalParts.scale;
  return allocations
    .sort((a, b) => a.index - b.index)
    .map((item) => Number(sign * item.units) / divisor);
}

/**
 * Returns one exact monetary share of `amount` for `part / whole`. The result
 * is expressed in the same smallest currency unit as the source amount and
 * therefore never exposes binary floating-point tails to report consumers.
 */
export function allocateReportAmountShare(
  amount: unknown,
  part: unknown,
  whole: unknown,
): number {
  const normalizedWhole = Math.max(0, safeReportNumber(whole));
  if (normalizedWhole <= 0) return 0;
  const normalizedPart = Math.max(
    0,
    Math.min(normalizedWhole, safeReportNumber(part)),
  );
  return allocateReportAmountByWeights(amount, [
    normalizedPart,
    normalizedWhole - normalizedPart,
  ])[0] || 0;
}

/**
 * پخش دقیق تخفیف کلی فاکتور روی ردیف‌ها.
 * اول تخفیف همان ردیف از مبلغ ناخالص کم می‌شود؛ سپس تخفیف کلی فاکتور
 * به نسبت سهم هر ردیف از جمع خالص همه ردیف‌های همان فاکتور توزیع می‌شود.
 */
export function buildDiscountAwareInvoiceLines(rows: any[]): any[] {
  const byOrder = new Map<number, any[]>();
  for (const row of rows || []) {
    const orderId = Number(row?.orderId || 0);
    if (!orderId) continue;
    const quantity = Math.max(0, safeReportNumber(row.quantity));
    const unitPrice = Math.max(0, safeReportNumber(row.unitPrice));
    const grossLineTotal = quantity * unitPrice;
    const itemDiscount = Math.max(
      0,
      Math.min(safeReportNumber(row.discountPerItem), grossLineTotal),
    );
    const fallbackNet = Math.max(0, grossLineTotal - itemDiscount);
    const storedLineTotal =
      row.lineTotal != null
        ? safeReportNumber(row.lineTotal)
        : row.totalPrice != null
          ? safeReportNumber(row.totalPrice)
          : fallbackNet;
    const netBeforeGlobal = Math.max(0, Math.min(storedLineTotal, fallbackNet));
    const normalized = {
      ...row,
      quantity,
      unitPrice,
      discountPerItem: itemDiscount,
      originalLineTotal: netBeforeGlobal,
      lineTotalBeforeGlobalDiscount: netBeforeGlobal,
      lineTotal: netBeforeGlobal,
      globalDiscountShare: 0,
      totalDiscountAmount: itemDiscount,
    };
    const list = byOrder.get(orderId) || [];
    list.push(normalized);
    byOrder.set(orderId, list);
  }

  const result: any[] = [];
  for (const lines of byOrder.values()) {
    const base = lines.reduce(
      (sum, line) => sum + safeReportNumber(line.lineTotalBeforeGlobalDiscount),
      0,
    );
    const orderDiscount = Math.max(
      0,
      Math.min(safeReportNumber(lines[0]?.orderDiscount), base),
    );
    const discountShares = allocateReportAmountByWeights(
      orderDiscount,
      lines.map((line) => safeReportNumber(line.lineTotalBeforeGlobalDiscount)),
    );

    lines.forEach((line, index) => {
      const lineBase = safeReportNumber(line.lineTotalBeforeGlobalDiscount);
      const share = Math.max(0, Math.min(discountShares[index] || 0, lineBase));
      const adjustedLineTotal = Math.max(0, lineBase - share);
      result.push({
        ...line,
        orderDiscount,
        invoiceDiscountBase: base,
        globalDiscountShare: share,
        totalDiscountAmount: safeReportNumber(line.discountPerItem) + share,
        lineTotal: adjustedLineTotal,
        totalPrice: adjustedLineTotal,
      });
    });
  }

  return result;
}

export const getProductSalesDocKey = (sourceType: string, orderId: number) =>
  `${sourceType}:${orderId}`;
