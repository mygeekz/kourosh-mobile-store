export type RecentItem = {
  path: string;
  title: string;
  icon?: string;
  parentTitle?: string;
  ts: number;
};

const LS_KEY = 'app:recents:v1';

function safeParse<T>(val: string | null, fallback: T): T {
  if (!val) return fallback;
  try { return JSON.parse(val) as T; } catch { return fallback; }
}

export function getRecents(): RecentItem[] {
  return safeParse<RecentItem[]>(localStorage.getItem(LS_KEY), []).sort((a,b)=>b.ts-a.ts);
}

export function pushRecent(item: Omit<RecentItem,'ts'>) {
  const prev = getRecents();
  const next: RecentItem[] = [{ ...item, ts: Date.now() }, ...prev.filter(r => r.path !== item.path)].slice(0, 15);
  try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch {}
}
