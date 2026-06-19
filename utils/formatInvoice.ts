// ساخت خلاصهٔ آیتم‌ها: «نام × تعداد، نام × تعداد ...»
export function summarizeInvoiceItems(
  items: Array<{ title?: string; name?: string; productTitle?: string; qty?: number }>,
  max: number = 2
) {
  if (!Array.isArray(items) || items.length === 0) return '';
  const pickTitle = (it: any) =>
    it?.title || it?.name || it?.productTitle || it?.product?.title || 'کالا';
  const parts = items.slice(0, max).map(it => `${pickTitle(it)} × ${it?.qty ?? 1}`);
  const more = items.length - max;
  return parts.join('، ') + (more > 0 ? ` و ${more} قلم دیگر` : '');
}
