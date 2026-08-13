// utils/search/faSpell.ts
const DOMAIN_DICTIONARY = [
  'شارژر','گوشی','موبایل','هندزفری','ایرفون','هدفون',
  'lcd','ال سی دی','کاور','قاب','باتری','کابل',
  'سامسونگ','شیائومی','آیفون','iphone','a52','a52s'
];

function levenshtein(a: string, b: string): number {
  const rows = a.length + 1, cols = b.length + 1;
  const dp: number[][] = Array.from({ length: rows }, (_, i) =>
    Array.from({ length: cols }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,         // حذف
        dp[i][j - 1] + 1,         // اضافه
        dp[i - 1][j - 1] + cost   // جایگزینی
      );
    }
  }
  return dp[a.length][b.length];
}

export function correctToken(token: string, dict = DOMAIN_DICTIONARY) {
  if (!token || dict.includes(token)) return { suggestion: token, distance: 0 };
  if (/\d/.test(token) || (/[a-zA-Z]/.test(token) && /\d/.test(token)) || token.length <= 2) {
    return { suggestion: token, distance: 0 };
  }
  let best = token, bestDist = Infinity;
  for (const w of dict) {
    const d = levenshtein(token, w);
    if (d < bestDist) { bestDist = d; best = w; }
  }
  const accept = bestDist <= Math.min(2, Math.ceil(token.length * 0.34));
  return { suggestion: accept ? best : token, distance: accept ? bestDist : 0 };
}

export function correctQueryTokens(tokens: string[], dict = DOMAIN_DICTIONARY) {
  const out: string[] = [];
  let changed = false;
  for (const t of tokens) {
    const { suggestion, distance } = correctToken(t, dict);
    out.push(suggestion);
    if (distance > 0 && suggestion !== t) changed = true;
  }
  return { corrected: out, changed };
}
