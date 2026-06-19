export type SearchInsight = {
  query: string;
  count: number;
  ts: number;
};

const RECENT_KEY = 'app:search:recent:v1';
const POPULAR_KEY = 'app:search:popular:v1';
const MAX_RECENT = 8;
const MAX_POPULAR = 12;

function safeParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

function normalizeQuery(query: string) {
  return (query || '').trim().replace(/\s+/g, ' ');
}

export function recordSearch(query: string) {
  const q = normalizeQuery(query);
  if (!q || q.length < 2) return;

  const recents = getRecentSearches();
  const nextRecents: SearchInsight[] = [
    { query: q, count: 1, ts: Date.now() },
    ...recents.filter((item) => item.query !== q),
  ].slice(0, MAX_RECENT);

  const popular = getPopularSearches();
  const existing = popular.find((item) => item.query === q);
  const nextPopular = [
    ...(existing
      ? popular.map((item) => item.query === q ? { ...item, count: item.count + 1, ts: Date.now() } : item)
      : [{ query: q, count: 1, ts: Date.now() }, ...popular]),
  ]
    .sort((a, b) => b.count - a.count || b.ts - a.ts)
    .slice(0, MAX_POPULAR);

  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(nextRecents));
    localStorage.setItem(POPULAR_KEY, JSON.stringify(nextPopular));
  } catch {}
}

export function getRecentSearches(): SearchInsight[] {
  return safeParse<SearchInsight[]>(localStorage.getItem(RECENT_KEY), []).sort((a, b) => b.ts - a.ts);
}

export function getPopularSearches(): SearchInsight[] {
  return safeParse<SearchInsight[]>(localStorage.getItem(POPULAR_KEY), []).sort((a, b) => b.count - a.count || b.ts - a.ts);
}

export function buildRelatedSuggestions(input: string, pool: string[], limit = 6): string[] {
  const q = normalizeQuery(input).toLowerCase();
  const uniq = Array.from(new Set(pool.map(normalizeQuery).filter(Boolean)));
  if (!q) return uniq.slice(0, limit);

  return uniq
    .map((item) => {
      const lower = item.toLowerCase();
      let score = 0;
      if (lower === q) score += 100;
      if (lower.startsWith(q)) score += 80;
      if (lower.includes(q)) score += 50;
      const words = lower.split(' ');
      if (words.some((w) => w.startsWith(q))) score += 30;
      score += Math.max(0, 20 - Math.abs(lower.length - q.length));
      return { item, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.item)
    .filter((item) => item.toLowerCase() !== q)
    .slice(0, limit);
}
