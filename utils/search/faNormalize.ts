// utils/search/faNormalize.ts
export function normalizeFaQuery(q: string): string {
  if (!q) return '';
  const fa = '۰۱۲۳۴۵۶۷۸۹';
  const en = '0123456789';
  const toEnDigits = (s: string) => s.replace(/[۰-۹]/g, (d) => en[fa.indexOf(d)]);

  return toEnDigits(q)
    .replace(/[\u064A]/g, 'ی')     // ي→ی
    .replace(/[\u0643]/g, 'ک')     // ك→ک
    .replace(/\u200c/g, ' ')       // ZWNJ→space
    .replace(/[ًٌٍَُِّْـ]/g, '')    // اعراب
    .replace(/\s+/g, ' ')          // چند فاصله→یکی
    .trim()
    .toLowerCase();
}
