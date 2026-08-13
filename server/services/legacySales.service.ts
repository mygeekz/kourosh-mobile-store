import moment from 'jalali-moment';
import {
  recordLegacySaleInventoryOut,
  recordLegacySaleTransaction,
  type SaleDataPayload,
} from '../repositories/legacySales.repo';

export async function recordLegacySale(saleData: SaleDataPayload) {
  return recordLegacySaleTransaction(saleData);
}

export function buildLegacySaleTelegramText(args: {
  data: any;
  saleData: SaleDataPayload;
  formatPriceForSms: (price: number) => string;
}) {
  const { data, saleData, formatPriceForSms } = args;
  const p: any = saleData as any;
  const amount = Number(
    (data as any)?.totalAmount ??
      (data as any)?.amount ??
      p?.totalAmount ??
      p?.amount ??
      0,
  );
  const customer = String(
    (data as any)?.customerName ?? p?.customerName ?? p?.customerFullName ?? '',
  ).trim();
  const desc = String(p?.itemName ?? p?.description ?? '').trim();
  return (
    `🧾 فروش ثبت شد\n` +
    (customer ? `مشتری: ${customer}\n` : '') +
    (desc ? `شرح: ${desc}\n` : '') +
    `مبلغ: ${formatPriceForSms(amount)} تومان`
  );
}

export async function recordLegacySaleInventoryOutIfNeeded(args: {
  data: any;
  saleData: SaleDataPayload;
}) {
  const { data, saleData } = args;
  const p = saleData as any;
  if (p?.itemType === 'inventory' && p?.itemId && p?.quantity) {
    await recordLegacySaleInventoryOut({
      productId: Number(p.itemId),
      entryType: 'out',
      quantity: Number(p.quantity),
      refType: 'sale',
      refId: Number((data as any)?.id || 0),
      entryDate: (() => {
        const d = String((data as any)?.transactionDate || p?.transactionDate || '');
        const m = moment(d, ['YYYY-MM-DD', 'jYYYY/jMM/jDD', moment.ISO_8601], true);
        return m.isValid() ? m.toDate().toISOString() : new Date().toISOString();
      })(),
    });
  }
}

export type { SaleDataPayload };
