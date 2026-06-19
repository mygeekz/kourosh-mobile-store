// utils/money.ts
const faToEnMap: Record<string, string> = {
  '۰':'0','۱':'1','۲':'2','۳':'3','۴':'4','۵':'5','۶':'6','۷':'7','۸':'8','۹':'9',
  '٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9',
};

export function normalizeDigits(input: string): string {
  return (input || '').replace(/[۰-۹٠-٩]/g, d => faToEnMap[d] ?? d);
}

export function parseToman(input: string | number | null | undefined): number {
  if (typeof input === 'number') return Number.isFinite(input) ? input : 0;
  if (!input) return 0;
  const cleaned = normalizeDigits(String(input)).replace(/[,\s‌\u200c]/g, ''); // کاما + فاصله + نیم‌فاصله
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export function formatToman(n: number): string {
  const x = Math.max(0, Math.round(Number(n) || 0));
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
