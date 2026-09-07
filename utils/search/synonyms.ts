// utils/search/synonyms.ts
const SYNONYMS: Record<string, string[]> = {
  'گوشی': ['موبایل', 'iphone'],
  'موبایل': ['گوشی', 'iphone'],
  'هندزفری': ['ایرفون'],
  'ال سی دی': ['lcd','نمایشگر'],
  'شارژر': ['آداپتور','adapter'],
};

export function expandSynonyms(tokens: string[]): string[] {
  const extra: string[] = [];
  for (const t of tokens) {
    const syns = SYNONYMS[t];
    if (syns) extra.push(...syns);
  }
  return Array.from(new Set([...tokens, ...extra])).slice(0, 8);
}
