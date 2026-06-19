import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AnimatePresence, motion } from 'framer-motion';

import { SIDEBAR_ITEMS } from '../constants';
import { flattenNav } from '../utils/nav';
import { processQuery } from '../utils/search/processQuery';
import { getRecents } from '../utils/recents';
import { buildRelatedSuggestions, getPopularSearches, getRecentSearches, recordSearch } from '../utils/searchInsights';
import { useFavorites } from '../contexts/FavoritesContext';
import { canAccessPath, filterNavItemsByRole } from '../utils/rbac';

type Props = { open: boolean; onClose: () => void; };

type DataSearchDomain = 'customer' | 'partner' | 'product' | 'phone' | 'service' | 'invoice' | 'repair' | 'installment';
type DataSearchItem = {
  id: number;
  domain: DataSearchDomain;
  title?: string;
  subtitle?: string;
  titleHL?: string;
  snippet?: string;
  matchSource?: string;
  matchReason?: string;
};

export const CommandPalette: React.FC<Props> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const { currentUser, token } = useAuth();
  const roleName = currentUser?.roleName;
  const { favorites, toggleFavorite, isFavorite } = useFavorites();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  const visibleFavorites = useMemo(() => favorites.filter((f) => canAccessPath(roleName, f.path)), [favorites, roleName]);

  const flat = useMemo(() => {
    const filtered = filterNavItemsByRole(SIDEBAR_ITEMS, roleName);
    return flattenNav(filtered);
  }, [roleName]);
  const [q, setQ] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [dataResults, setDataResults] = useState<DataSearchItem[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataErr, setDataErr] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open) {
      previouslyFocusedRef.current?.focus?.();
      return;
    }
    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    let seeded = '';
    try {
      seeded = localStorage.getItem('commandPaletteInitialQuery') || '';
      localStorage.removeItem('commandPaletteInitialQuery');
    } catch {}
    setQ(seeded);
    setActiveIndex(0);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const recents = useMemo(() => getRecents(), [open]);
  const recentSearches = useMemo(() => getRecentSearches(), [open, q]);
  const popularSearches = useMemo(() => getPopularSearches(), [open, q]);
  const processed = useMemo(() => processQuery(q), [q]);
  const smartSuggestion = useMemo(() => {
    const suggested = processed.suggestion?.trim();
    if (!suggested) return null;
    if (suggested === q.trim().toLowerCase()) return null;
    return suggested;
  }, [processed.suggestion, q]);
  const relatedSuggestions = useMemo(() => {
    const pool = [
      ...recentSearches.map((item) => item.query),
      ...popularSearches.map((item) => item.query),
      ...flat.map((item) => item.title),
      smartSuggestion || '',
      'کاور', 'گلس', 'شارژر', 'اقساط', 'تعمیرات', 'مشتری', 'گوشی',
    ];
    return buildRelatedSuggestions(q || processed.final || '', pool, q.trim() ? 6 : 8);
  }, [recentSearches, popularSearches, flat, smartSuggestion, q, processed.final]);

  // --- Unified data search (server FTS) ---
  useEffect(() => {
    if (!open) return;
    const term = (processed.final || '').trim();
    if (!term || term.length < 2) {
      setDataResults([]);
      setDataLoading(false);
      setDataErr(null);
      abortRef.current?.abort();
      abortRef.current = null;
      return;
    }
    if (!token) return;

    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;
    setDataLoading(true);
    setDataErr(null);

    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}&limit=24`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({} as any));
          throw new Error(j?.message || 'خطا در جستجوی سراسری');
        }
        const j = await res.json();
        setDataResults(Array.isArray(j?.items) ? j.items : []);
      } catch (e: any) {
        if (e?.name === 'AbortError') return;
        setDataErr(e?.message || 'خطا در عملیاتی ناشناخته');
        setDataResults([]);
      } finally {
        setDataLoading(false);
      }
    }, 220);

    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [open, processed.final, token]);
  const results = useMemo(() => {
    const term = (processed.final || '').toLowerCase().trim();
    if (!term) return flat.slice(0, 30);
    return flat.filter(it => (`${it.title} ${it.parentTitle ?? ''} ${it.path}`).toLowerCase().includes(term)).slice(0, 50);
  }, [flat, processed.final]);
  const groupedData = useMemo(() => {
    const groups: Record<string, DataSearchItem[]> = {};
    dataResults.forEach((it) => {
      const k = it.domain;
      if (!groups[k]) groups[k] = [];
      groups[k].push(it);
    });
    return groups;
  }, [dataResults]);

  const domainTitle = (d: string) => {
    switch (d) {
      case 'customer': return 'مشتری‌ها';
      case 'partner': return 'همکارها';
      case 'invoice': return 'فروش‌ها و فاکتورها';
      case 'repair': return 'تعمیرات';
      case 'installment': return 'اقساط';
      case 'product': return 'کالاها';
      case 'phone': return 'گوشی‌ها';
      case 'service': return 'خدمات';
      default: return 'سایر';
    }
  };

  const goData = (it: DataSearchItem, action?: 'open' | 'payNext' | 'receipt' | 'print') => {
    // Primary open path per domain
    const openPath = (() => {
      switch (it.domain) {
        case 'customer': return `/customers/${it.id}`;
        case 'partner': return `/partners/${it.id}`;
        case 'invoice': return `/invoices/${it.id}`;
        case 'repair': return `/repairs/${it.id}`;
        case 'installment': return `/installment-sales/${it.id}`;
        case 'product': return `/products?q=${encodeURIComponent((processed.final || '').trim())}`;
        case 'phone': return `/mobile-phones?q=${encodeURIComponent((processed.final || '').trim())}`;
        case 'service': return `/services?q=${encodeURIComponent((processed.final || '').trim())}`;
        default: return '/';
      }
    })();

    const actPath = (() => {
      if (it.domain === 'installment' && action === 'payNext') return `/installment-sales/${it.id}?pay=next`;
      if (it.domain === 'repair' && action === 'receipt') return `/repairs/${it.id}/receipt`;
      if (it.domain === 'invoice' && action === 'print') return `/invoices/${it.id}?autoPrint=1`;
      return openPath;
    })();

    recordSearch((processed.final || q).trim() || it.title || domainTitle(it.domain));
    navigate(actPath);
    onClose();
  };

  type CombinedItem =
    | { kind: 'data'; key: string; data: DataSearchItem }
    | { kind: 'nav'; key: string; nav: { title: string; parentTitle?: string; path: string; icon?: string } };

  const combinedItems = useMemo<CombinedItem[]>(() => {
    if (!q.trim()) return results.map((r) => ({ kind: 'nav', key: r.path, nav: r }));
    const data = dataResults.map((d) => ({ kind: 'data', key: `${d.domain}:${d.id}`, data: d } as CombinedItem));
    const nav = results.map((r) => ({ kind: 'nav', key: r.path, nav: r } as CombinedItem));
    // داده‌ها اول، بعد صفحات
    return [...data, ...nav];
  }, [q, dataResults, results]);

  // keep selection in range
  useEffect(() => {
    setActiveIndex((i) => {
      const max = Math.max(0, combinedItems.length - 1);
      return Math.min(i, max);
    });
  }, [combinedItems.length]);

  useEffect(() => {
    if (!open) return;
    const host = listRef.current;
    if (!host) return;
    const node = host.querySelector<HTMLElement>(`[data-command-index=\"${activeIndex}\"]`);
    node?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  const go = (path: string) => {
    const term = (processed.final || q).trim();
    if (term) recordSearch(term);
    navigate(path);
    onClose();
  };

  if (!open) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        data-kourosh-overlay="backdrop" className="fixed inset-0 z-[2147483646] flex items-start justify-center p-4 sm:p-6"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      >
        <button aria-label="بستن" data-kourosh-overlay="backdrop" className="ux-overlay-backdrop absolute inset-0 bg-black/38" onClick={onClose} />
        <motion.div
          role="dialog" aria-modal="true"
          data-kourosh-overlay="panel"
          className="command-palette-panel ux-stable-panel ux-stable-floating-panel relative z-[2147483647] w-full max-w-2xl overflow-hidden rounded-[22px] bg-white shadow-2xl border border-gray-200 dark:border-gray-800 dark:bg-slate-950"
          initial={{ y: 14, scale: 0.98, opacity: 0 }}
          animate={{ y: 0, scale: 1, opacity: 1 }}
          exit={{ y: 14, scale: 0.98, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 30 }}
        >
          <div className="p-4 border-b border-gray-200/70 dark:border-gray-800/70">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-sm dark:bg-white dark:text-slate-900">
                <i className="fa-solid fa-magnifying-glass" />
              </div>
              <div className="flex-1">
                <input
                  ref={inputRef}
                  value={q}
                  onChange={(e) => { setQ(e.target.value); setActiveIndex(0); }}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setActiveIndex((i) => combinedItems.length ? (i + 1) % combinedItems.length : 0);
                      return;
                    }
                    if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setActiveIndex((i) => combinedItems.length ? (i - 1 + combinedItems.length) % combinedItems.length : 0);
                      return;
                    }
                    if (e.key === 'Home') {
                      e.preventDefault();
                      setActiveIndex(0);
                      return;
                    }
                    if (e.key === 'End') {
                      e.preventDefault();
                      setActiveIndex(Math.max(0, combinedItems.length - 1));
                      return;
                    }
                    if (e.key === 'Tab' && combinedItems.length > 0) {
                      e.preventDefault();
                      setActiveIndex((i) => {
                        if (e.shiftKey) return (i - 1 + combinedItems.length) % combinedItems.length;
                        return (i + 1) % combinedItems.length;
                      });
                      return;
                    }
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const target = combinedItems[activeIndex];
                      if (!target) return;
                      if (target.kind === 'nav') go(target.nav.path);
                      else goData(target.data);
                      return;
                    }
                    if (e.key === 'Escape') {
                      e.preventDefault();
                      onClose();
                    }
                  }}
                  placeholder="جستجوی سریع (صفحه، فاکتور، تعمیرات...)"
                  className="command-palette-input w-full bg-transparent outline-none text-base text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
                />
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  ↑↓ جابه‌جایی • Enter انتخاب • Ctrl/⌘ + K بازکردن • Esc بستن
                </div>
                {q.trim() ? (
                  <button
                    type="button"
                    onClick={() => { setQ(''); setActiveIndex(0); inputRef.current?.focus(); }}
                    className="mt-2 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800/70 dark:text-gray-200 dark:hover:bg-gray-800"
                    title="پاک کردن جستجو"
                  >
                    <i className="fa-solid fa-xmark text-[10px]" />
                    پاک کردن جستجو
                  </button>
                ) : null}
                {smartSuggestion ? (
                  <button
                    type="button"
                    onClick={() => {
                      setQ(smartSuggestion);
                      recordSearch(smartSuggestion);
                      setActiveIndex(0);
                    }}
                    className="mt-2 inline-flex items-center gap-2 rounded-full border border-indigo-200/80 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-900/70 dark:bg-indigo-950/60 dark:text-indigo-200 dark:hover:bg-indigo-950"
                    title="اعمال پیشنهاد و جستجوی خودکار"
                  >
                    <i className="fa-solid fa-wand-magic-sparkles text-[10px]" />
                    منظورت <strong>{smartSuggestion}</strong> بود؟
                  </button>
                ) : null}
              </div>
              <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800">Ctrl</span>
                <span className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800">K</span>
              </div>
            </div>
          </div>

          <div ref={listRef} className="max-h-[70vh] overflow-auto">
            {!q.trim() && (
              <Section title="جستجوهای کاربردی">
                <div className="px-2 pb-2 grid grid-cols-1 gap-3 lg:grid-cols-2">
                  <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-3 dark:border-gray-700/60 dark:bg-gray-900/30">
                    <div className="mb-2 flex items-center gap-2 text-[11px] font-bold text-gray-500 dark:text-gray-400">
                      <i className="fa-regular fa-clock" /> آخرین جستجوها
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {recentSearches.length ? recentSearches.slice(0,6).map((item) => (
                        <button
                          key={item.query}
                          type="button"
                          onClick={() => { setQ(item.query); setActiveIndex(0); }}
                          className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 transition hover:border-primary-200 hover:text-primary-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                        >
                          <i className="fa-solid fa-rotate-left text-[10px]" />
                          {item.query}
                        </button>
                      )) : <div className="text-xs text-gray-400">هنوز جستجویی ثبت اطلاعات نشده است.</div>}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-3 dark:border-gray-700/60 dark:bg-gray-900/30">
                    <div className="mb-2 flex items-center gap-2 text-[11px] font-bold text-gray-500 dark:text-gray-400">
                      <i className="fa-solid fa-fire" /> پرجستجوها
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {popularSearches.length ? popularSearches.slice(0,6).map((item) => (
                        <button
                          key={item.query}
                          type="button"
                          onClick={() => { setQ(item.query); setActiveIndex(0); }}
                          className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-700 transition hover:bg-amber-100 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-200"
                        >
                          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white/80 px-1 text-[10px] font-bold dark:bg-black/20">{item.count}</span>
                          {item.query}
                        </button>
                      )) : <div className="text-xs text-gray-400">بعد از چند جستجو اینجا پیشنهادهای پرتکرار را می‌بینی.</div>}
                    </div>
                  </div>
                </div>
              </Section>
            )}

            {q.trim() && relatedSuggestions.length > 0 && (
              <Section title="پیشنهادهای مرتبط">
                <div className="px-2 pb-2 flex flex-wrap gap-2">
                  {relatedSuggestions.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => { setQ(item); recordSearch(item); setActiveIndex(0); }}
                      className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700 dark:border-gray-600 dark:bg-gray-700/60 dark:text-gray-200 dark:hover:border-primary-400/40 dark:hover:bg-primary-500/10"
                    >
                      <i className="fa-solid fa-star text-[10px]" />
                      {item}
                    </button>
                  ))}
                </div>
              </Section>
            )}

            {visibleFavorites.length > 0 && !q.trim() && (
              <Section title="علاقه‌مندی‌ها">
                {favorites.slice(0, 8).map((it) => (
                  <Row
                    key={it.path}
                    title={it.title}
                    subtitle={it.parentTitle}
                    icon={it.icon}
                    starred
                    onStar={() => toggleFavorite({ key: it.path, title: it.title, path: it.path, icon: it.icon, parentTitle: it.parentTitle })}
                    onClick={() => go(it.path)}
                  />
                ))}
              </Section>
            )}

            {recents.length > 0 && !q.trim() && (
              <Section title="اخیراً باز شده">
                {recents.slice(0, 8).map((it) => (
                  <Row
                    key={it.path}
                    title={it.title}
                    subtitle={it.parentTitle}
                    icon={it.icon}
                    starred={isFavorite(it.path)}
                    onStar={() => toggleFavorite({ key: it.path, title: it.title, path: it.path, icon: it.icon, parentTitle: it.parentTitle })}
                    onClick={() => go(it.path)}
                  />
                ))}
              </Section>
            )}

	            <Section title={q.trim() ? 'نتایج' : 'همه صفحات'}>
	              {q.trim() && (
	                <div className="px-4 pb-2 pt-1 text-xs text-gray-500 dark:text-gray-400">
	                  {dataLoading ? 'در حال جستجو در مشتری/فاکتور/کالا/تعمیر/اقساط…' : dataErr ? dataErr : 'Enter = باز کردن • دکمه‌های کنار هر رکورد = اکشن سریع'}
	                </div>
	              )}

	              {combinedItems.map((it, idx) => {
	                const selected = idx === activeIndex;
	                if (it.kind === 'nav') {
	                  return (
	                    <Row
	                      key={it.key}
	                      title={it.nav.title}
	                      subtitle={it.nav.parentTitle}
	                      icon={it.nav.icon}
	                      starred={isFavorite(it.nav.path)}
	                      onStar={() => toggleFavorite({ key: it.nav.path, title: it.nav.title, path: it.nav.path, icon: it.nav.icon, parentTitle: it.nav.parentTitle })}
	                      onClick={() => go(it.nav.path)}
	                      selected={selected}
	                      index={idx}
	                    />
	                  );
	                }
	                return (
	                  <DataRow
	                    key={it.key}
	                    item={it.data}
	                    selected={selected}
	                    onOpen={() => goData(it.data, 'open')}
	                    onQuick={(a) => goData(it.data, a)}
	                    index={idx}
	                  />
	                );
	              })}

	              {!dataLoading && !dataErr && q.trim() && dataResults.length === 0 && results.length === 0 && (
	                <div className="p-6 text-sm text-gray-500 dark:text-gray-400 text-center">نتیجه‌ای پیدا نشد.</div>
	              )}
	              {!q.trim() && results.length === 0 && (
	                <div className="p-6 text-sm text-gray-500 dark:text-gray-400 text-center">نتیجه‌ای پیدا نشد.</div>
	              )}
	            </Section>
          </div>

          <div className="px-4 py-3 border-t border-gray-200/70 dark:border-gray-800/70 text-[11px] text-gray-500 dark:text-gray-400 flex items-center justify-between">
            <span className="inline-flex items-center gap-2">
              <span className="px-2 py-1 rounded-xl bg-gray-100/80 dark:bg-gray-800/70">Esc</span>
              بستن
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="px-2 py-1 rounded-xl bg-gray-100/80 dark:bg-gray-800/70">↑↓</span>
              انتخاب
              <span className="px-2 py-1 rounded-xl bg-gray-100/80 dark:bg-gray-800/70">Enter</span>
              رفتن
            </span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="py-2">
    <div className="px-4 py-2 text-xs font-bold text-gray-500 dark:text-gray-400">{title}</div>
    <div className="px-2">{children}</div>
  </div>
);

const Row: React.FC<{
  title: string;
  subtitle?: string;
  icon?: string;
  starred?: boolean;
  selected?: boolean;
  onStar: () => void;
  onClick: () => void;
  index?: number;
}> = ({ title, subtitle, icon, starred, selected, onStar, onClick, index }) => (
  <motion.div
    layout
    data-command-index={typeof index === 'number' ? index : undefined}
    className={[
      'group flex items-center gap-3 px-3 py-2 rounded-2xl cursor-pointer border transition',
      selected
        ? 'bg-slate-900 text-white border-slate-900 shadow-sm dark:bg-white dark:text-slate-900 dark:border-white'
        : 'bg-transparent hover:bg-gray-50 dark:hover:bg-gray-800/60 border-transparent',
    ].join(' ')}
    onClick={onClick}
  >
    <div
      className={[
        'w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm',
        selected ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200',
      ].join(' ')}
    >
      <i className={icon ?? 'fa-solid fa-circle'} />
    </div>
    <div className="flex-1 min-w-0">
      <div className={['text-sm font-semibold truncate', selected ? 'text-white' : 'text-gray-900 dark:text-gray-100'].join(' ')}>{title}</div>
      {subtitle && (
        <div className={['text-xs truncate', selected ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'].join(' ')}>{subtitle}</div>
      )}
    </div>
    <button
      type="button"
      className={[
        'w-9 h-9 rounded-2xl grid place-items-center transition',
        selected
          ? 'text-white/90 hover:bg-white/15'
          : 'text-gray-400 hover:text-amber-500 hover:bg-gray-100 dark:hover:bg-gray-800',
      ].join(' ')}
      onClick={(e) => { e.stopPropagation(); onStar(); }}
      aria-label="علاقه‌مندی"
      title="علاقه‌مندی"
    >
      <i className={starred ? 'fa-solid fa-star' : 'fa-regular fa-star'} />
    </button>
  </motion.div>
);

const domainBadge = (d: string) => {
  switch (d) {
    case 'customer': return { label: 'مشتری', icon: 'fa-solid fa-user' };
    case 'partner': return { label: 'همکار', icon: 'fa-solid fa-user-tie' };
    case 'invoice': return { label: 'فروش', icon: 'fa-solid fa-file-invoice-dollar' };
    case 'repair': return { label: 'تعمیر', icon: 'fa-solid fa-screwdriver-wrench' };
    case 'installment': return { label: 'اقساط', icon: 'fa-solid fa-credit-card' };
    case 'product': return { label: 'کالا', icon: 'fa-solid fa-box' };
    case 'phone': return { label: 'گوشی', icon: 'fa-solid fa-mobile-screen-button' };
    case 'service': return { label: 'خدمت', icon: 'fa-solid fa-wand-magic-sparkles' };
    default: return { label: 'مورد', icon: 'fa-solid fa-circle' };
  }
};

const DataRow: React.FC<{
  item: DataSearchItem;
  selected?: boolean;
  onOpen: () => void;
  onQuick: (a: 'open' | 'payNext' | 'receipt' | 'print') => void;
  index?: number;
}> = ({ item, selected, onOpen, onQuick, index }) => {
  const badge = domainBadge(item.domain);
  const showPayNext = item.domain === 'installment';
  const showReceipt = item.domain === 'repair';
  const showPrint = item.domain === 'invoice';

  return (
    <motion.div
      layout
      data-command-index={typeof index === 'number' ? index : undefined}
      className={[
        'group flex items-center gap-3 px-3 py-2 rounded-2xl cursor-pointer border transition',
        selected
          ? 'bg-slate-900 text-white border-slate-900 shadow-sm dark:bg-white dark:text-slate-900 dark:border-white'
          : 'bg-transparent hover:bg-gray-50 dark:hover:bg-gray-800/60 border-transparent',
      ].join(' ')}
      onClick={onOpen}
    >
      <div
        className={[
          'w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm',
          selected ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200',
        ].join(' ')}
      >
        <i className={badge.icon} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={[
              'text-[11px] px-2 py-0.5 rounded-full border shrink-0',
              selected
                ? 'border-white/25 bg-white/10 text-white/90'
                : 'border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 text-gray-600 dark:text-gray-300',
            ].join(' ')}
          >
            {badge.label}
          </span>
          <div
            className={['text-sm font-semibold truncate', selected ? 'text-white' : 'text-gray-900 dark:text-gray-100'].join(' ')}
          >
            {item.titleHL ? (
              <span dangerouslySetInnerHTML={{ __html: item.titleHL }} />
            ) : (
              item.title || `#${item.id}`
            )}
          </div>
        </div>
        {item.subtitle ? (
          <div className={['text-xs truncate mt-0.5', selected ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'].join(' ')}>
            {item.subtitle}
          </div>
        ) : null}
        {item.snippet ? (
          <div className={['text-xs line-clamp-2 leading-5 mt-1', selected ? 'text-white/85' : 'text-gray-500 dark:text-gray-400'].join(' ')}>
            <span className={selected ? 'font-black text-white/75' : 'font-black text-slate-400 dark:text-slate-500'}>تطابق: </span>
            <span dangerouslySetInnerHTML={{ __html: item.snippet || '' }} />
          </div>
        ) : null}
        {item.matchSource ? (
          <div className={['mt-1 inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black', selected ? 'border-white/25 bg-white/10 text-white/90' : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200'].join(' ')} title={item.matchReason || item.matchSource}>
            <i className="fa-solid fa-ranking-star" />
            <span className="truncate">{item.matchSource}</span>
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-1">
        {showPayNext && (
          <button
            type="button"
            className={[
              'h-9 px-3 rounded-2xl text-xs font-semibold border transition',
              selected
                ? 'border-white/25 bg-white/10 text-white hover:bg-white/15'
                : 'border-primary/20 bg-primary/5 text-primary-700 dark:text-primary-300 hover:bg-primary/10',
            ].join(' ')}
            onClick={(e) => { e.stopPropagation(); onQuick('payNext'); }}
            title="ثبت اطلاعات قسط بعدی"
          >
            <i className="fa-solid fa-bolt ml-1" />
            قسط بعدی
          </button>
        )}
        {showReceipt && (
          <button
            type="button"
            className={[
              'h-9 px-3 rounded-2xl text-xs font-semibold border transition',
              selected
                ? 'border-white/25 bg-white/10 text-white hover:bg-white/15'
                : 'border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/60',
            ].join(' ')}
            onClick={(e) => { e.stopPropagation(); onQuick('receipt'); }}
            title="رسید"
          >
            <i className="fa-solid fa-receipt ml-1" />
            رسید
          </button>
        )}
        {showPrint && (
          <button
            type="button"
            className={[
              'h-9 px-3 rounded-2xl text-xs font-semibold border transition',
              selected
                ? 'border-white/25 bg-white/10 text-white hover:bg-white/15'
                : 'border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/60',
            ].join(' ')}
            onClick={(e) => { e.stopPropagation(); onQuick('print'); }}
            title="چاپ"
          >
            <i className="fa-solid fa-print ml-1" />
            چاپ
          </button>
        )}
        <button
          type="button"
          className={[
            'w-9 h-9 rounded-2xl grid place-items-center transition',
            selected
              ? 'text-white/90 hover:bg-white/15'
              : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800',
          ].join(' ')}
          onClick={(e) => { e.stopPropagation(); onQuick('open'); }}
          aria-label="باز کردن"
          title="باز کردن"
        >
          <i className="fa-solid fa-arrow-up-from-bracket" />
        </button>
      </div>
    </motion.div>
  );
};
