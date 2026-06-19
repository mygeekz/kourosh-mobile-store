import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { processQuery } from '../utils/search/processQuery';
import { recordSearch } from '../utils/searchInsights';

type SearchDomain = 'all' | 'customer' | 'partner' | 'product' | 'phone' | 'service' | 'invoice' | 'repair' | 'installment';

type SearchResultItem = {
  id: number;
  domain: Exclude<SearchDomain, 'all'>;
  title?: string;
  subtitle?: string;
  titleHL?: string;
  snippet?: string;
  price?: number;
  score?: number;
  rankScore?: number;
  matchSource?: string;
  matchReason?: string;
};

const DOMAIN_META: Record<Exclude<SearchDomain, 'all'>, { label: string; plural: string; icon: string; tone: string; path: (id: number, q: string) => string }> = {
  customer: { label: 'مشتری', plural: 'مشتریان', icon: 'fa-solid fa-user', tone: 'text-sky-700 bg-sky-50 border-sky-100 dark:text-sky-200 dark:bg-sky-950/30 dark:border-sky-900/40', path: (id) => `/customers/${id}` },
  partner: { label: 'همکار', plural: 'همکاران', icon: 'fa-solid fa-user-tie', tone: 'text-violet-700 bg-violet-50 border-violet-100 dark:text-violet-200 dark:bg-violet-950/30 dark:border-violet-900/40', path: (id) => `/partners/${id}` },
  product: { label: 'کالا', plural: 'کالاها', icon: 'fa-solid fa-box', tone: 'text-emerald-700 bg-emerald-50 border-emerald-100 dark:text-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/40', path: (_id, q) => `/products?search=${encodeURIComponent(q)}` },
  phone: { label: 'گوشی', plural: 'گوشی‌ها', icon: 'fa-solid fa-mobile-screen-button', tone: 'text-cyan-700 bg-cyan-50 border-cyan-100 dark:text-cyan-200 dark:bg-cyan-950/30 dark:border-cyan-900/40', path: (_id, q) => `/mobile-phones?q=${encodeURIComponent(q)}` },
  service: { label: 'خدمت', plural: 'خدمات', icon: 'fa-solid fa-wand-magic-sparkles', tone: 'text-fuchsia-700 bg-fuchsia-50 border-fuchsia-100 dark:text-fuchsia-200 dark:bg-fuchsia-950/30 dark:border-fuchsia-900/40', path: (_id, q) => `/services?q=${encodeURIComponent(q)}` },
  invoice: { label: 'فاکتور', plural: 'فاکتورها', icon: 'fa-solid fa-file-invoice-dollar', tone: 'text-amber-700 bg-amber-50 border-amber-100 dark:text-amber-200 dark:bg-amber-950/30 dark:border-amber-900/40', path: (id) => `/invoices/${id}` },
  repair: { label: 'تعمیر', plural: 'تعمیرات', icon: 'fa-solid fa-screwdriver-wrench', tone: 'text-rose-700 bg-rose-50 border-rose-100 dark:text-rose-200 dark:bg-rose-950/30 dark:border-rose-900/40', path: (id) => `/repairs/${id}` },
  installment: { label: 'اقساط', plural: 'فروش اقساطی', icon: 'fa-solid fa-credit-card', tone: 'text-indigo-700 bg-indigo-50 border-indigo-100 dark:text-indigo-200 dark:bg-indigo-950/30 dark:border-indigo-900/40', path: (id) => `/installment-sales/${id}` },
};

const FILTERS: Array<{ key: SearchDomain; label: string; icon: string }> = [
  { key: 'all', label: 'همه', icon: 'fa-solid fa-layer-group' },
  { key: 'customer', label: 'مشتریان', icon: 'fa-solid fa-user' },
  { key: 'partner', label: 'همکاران', icon: 'fa-solid fa-user-tie' },
  { key: 'product', label: 'کالاها', icon: 'fa-solid fa-box' },
  { key: 'phone', label: 'گوشی‌ها', icon: 'fa-solid fa-mobile-screen-button' },
  { key: 'invoice', label: 'فاکتورها', icon: 'fa-solid fa-file-invoice-dollar' },
  { key: 'installment', label: 'اقساط', icon: 'fa-solid fa-credit-card' },
  { key: 'repair', label: 'تعمیرات', icon: 'fa-solid fa-screwdriver-wrench' },
  { key: 'service', label: 'خدمات', icon: 'fa-solid fa-wand-magic-sparkles' },
];

const stripHtml = (value?: string) => String(value || '').replace(/<[^>]+>/g, '').trim();

const highlightPlain = (value: string, query: string) => {
  const safe = String(value || '');
  const q = String(query || '').trim();
  if (!q) return safe;
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  try {
    return safe.replace(new RegExp(`(${escaped})`, 'gi'), '<mark>$1</mark>');
  } catch {
    return safe;
  }
};

const SearchResultsPage: React.FC = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [params, setParams] = useSearchParams();
  const qParam = params.get('q') || '';
  const typeParam = (params.get('type') || 'all') as SearchDomain;
  const [query, setQuery] = useState(qParam);
  const [activeDomain, setActiveDomain] = useState<SearchDomain>(FILTERS.some((item) => item.key === typeParam) ? typeParam : 'all');
  const [items, setItems] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);
  const [selectedItem, setSelectedItem] = useState<SearchResultItem | null>(null);
  const resultRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    setQuery(qParam);
  }, [qParam]);

  useEffect(() => {
    setActiveDomain(FILTERS.some((item) => item.key === typeParam) ? typeParam : 'all');
  }, [typeParam]);

  const processedQuery = useMemo(() => processQuery(query), [query]);
  const normalizedQuery = (processedQuery.final || processedQuery.normalized || query || '').trim();

  useEffect(() => {
    if (!token || normalizedQuery.length < 2) {
      setItems([]);
      setError(null);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(normalizedQuery)}&limit=50`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload?.message || 'جستجوی سراسری انجام نشد.');
        setItems(Array.isArray(payload?.items) ? payload.items : []);
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        setItems([]);
        setError(err?.message || 'جستجوی سراسری انجام نشد.');
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [normalizedQuery, token]);

  const filtered = useMemo(() => {
    const list = activeDomain === 'all' ? items : items.filter((item) => item.domain === activeDomain);
    return list;
  }, [items, activeDomain]);

  const domainCounts = useMemo(() => {
    const counts: Record<SearchDomain, number> = { all: items.length, customer: 0, partner: 0, product: 0, phone: 0, service: 0, invoice: 0, repair: 0, installment: 0 };
    items.forEach((item) => { counts[item.domain] = (counts[item.domain] || 0) + 1; });
    return counts;
  }, [items]);

  const matchedKeys = useMemo(() => filtered.map((item) => `${item.domain}:${item.id}`), [filtered]);

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const q = (processQuery(query).final || processQuery(query).normalized || query).trim();
    if (!q) return;
    recordSearch(q);
    setParams({ q, type: activeDomain });
  };

  const setDomain = (domain: SearchDomain) => {
    setActiveDomain(domain);
    const q = normalizedQuery || query;
    setParams({ q, type: domain });
    setActiveMatchIndex(0);
  };

  const openItem = (item: SearchResultItem) => {
    const meta = DOMAIN_META[item.domain];
    if (normalizedQuery) recordSearch(normalizedQuery);
    navigate(meta.path(item.id, normalizedQuery));
  };

  const getQuickActions = (item: SearchResultItem) => {
    const q = normalizedQuery || query || '';
    const encodedQ = encodeURIComponent(q);
    const common = [{ label: 'باز کردن جزئیات', icon: 'fa-solid fa-arrow-up-left', to: DOMAIN_META[item.domain].path(item.id, q), primary: true }];
    const actions: Record<SearchResultItem['domain'], Array<{ label: string; icon: string; to: string; primary?: boolean }>> = {
      customer: [
        ...common,
        { label: 'ثبت تراکنش', icon: 'fa-solid fa-money-bill-transfer', to: `/customers/${item.id}#customer-ledger-section` },
        { label: 'ارسال پیام', icon: 'fa-solid fa-paper-plane', to: `/customers/${item.id}#customer-communication` },
      ],
      partner: [
        ...common,
        { label: 'ثبت دریافت/پرداخت', icon: 'fa-solid fa-wallet', to: `/partners/${item.id}#partner-ledger-section` },
        { label: 'گزارش تلگرام', icon: 'fa-brands fa-telegram', to: `/partners/${item.id}#partner-telegram` },
      ],
      product: [
        { label: 'مشاهده کالاها', icon: 'fa-solid fa-box', to: `/products?search=${encodedQ}`, primary: true },
        { label: 'فروش سریع', icon: 'fa-solid fa-cart-shopping', to: `/sales/cash?itemType=inventory&itemId=${item.id}` },
      ],
      phone: [
        { label: 'مشاهده گوشی', icon: 'fa-solid fa-mobile-screen-button', to: `/mobile-phones?q=${encodedQ}`, primary: true },
        { label: 'فروش گوشی', icon: 'fa-solid fa-receipt', to: `/sales/cash?itemType=phone&itemId=${item.id}` },
        { label: 'چاپ لیبل', icon: 'fa-solid fa-print', to: `/tools/label-print?phoneId=${item.id}` },
      ],
      service: [
        { label: 'مشاهده خدمات', icon: 'fa-solid fa-wand-magic-sparkles', to: `/services?q=${encodedQ}`, primary: true },
        { label: 'فروش سریع', icon: 'fa-solid fa-cart-shopping', to: `/sales/cash?itemType=service&itemId=${item.id}` },
      ],
      invoice: [
        ...common,
        { label: 'چاپ / PDF', icon: 'fa-solid fa-print', to: `/invoices/${item.id}?print=1` },
      ],
      installment: [
        ...common,
        { label: 'ثبت پرداخت', icon: 'fa-solid fa-credit-card', to: `/installment-sales/${item.id}#payments` },
      ],
      repair: [
        ...common,
        { label: 'تغییر وضعیت', icon: 'fa-solid fa-screwdriver-wrench', to: `/repairs/${item.id}#status` },
      ],
    };
    return actions[item.domain] || common;
  };

  const closePreview = () => setSelectedItem(null);

  const jumpToResult = (direction: 1 | -1) => {
    if (!matchedKeys.length) return;
    const nextIndex = (activeMatchIndex + direction + matchedKeys.length) % matchedKeys.length;
    setActiveMatchIndex(nextIndex);
    const key = matchedKeys[nextIndex];
    const node = resultRefs.current[key];
    node?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    node?.focus({ preventScroll: true });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-3 py-4 sm:px-5 lg:px-8" dir="rtl">
      <section className="overflow-hidden rounded-[32px] border border-slate-200/90 bg-white shadow-[0_26px_80px_-52px_rgba(15,23,42,0.35)] dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-5 border-b border-slate-200/80 px-5 py-5 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-black text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              <i className="fa-solid fa-magnifying-glass-chart" /> جستجوی کامل سیستم
            </div>
            <h1 className="mt-3 text-2xl font-black tracking-[-0.03em] text-slate-950 dark:text-slate-50">نتایج جستجوی سراسری</h1>
            <p className="mt-1 max-w-3xl text-sm leading-7 text-slate-500 dark:text-slate-400">عنوان‌ها، توضیحات، یادداشت‌ها، آدرس‌ها، اقلام فاکتور، IMEI و متن‌های مرتبط در یک صفحه قابل فیلتر نمایش داده می‌شوند.</p>
          </div>

          <div className="search-results-stat-grid grid min-w-[220px] grid-cols-2 gap-2 text-center sm:grid-cols-3">
            <div className="search-results-stat-card rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70">
              <span className="search-results-stat-card__icon"><i className="fa-solid fa-layer-group" /></span>
              <div className="search-results-stat-card__body">
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">همه نتایج</div>
                <div className="mt-1 text-xl font-black text-slate-950 dark:text-white">{items.length.toLocaleString('fa-IR')}</div>
              </div>
            </div>
            <div className="search-results-stat-card rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70">
              <span className="search-results-stat-card__icon"><i className="fa-solid fa-eye" /></span>
              <div className="search-results-stat-card__body">
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">نمای فعلی</div>
                <div className="mt-1 text-xl font-black text-slate-950 dark:text-white">{filtered.length.toLocaleString('fa-IR')}</div>
              </div>
            </div>
            <div className="search-results-stat-card rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70 sm:col-span-1 col-span-2">
              <span className="search-results-stat-card__icon"><i className={activeDomain === 'all' ? 'fa-solid fa-filter-circle-xmark' : DOMAIN_META[activeDomain].icon} /></span>
              <div className="search-results-stat-card__body">
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">فیلتر</div>
                <div className="mt-1 truncate text-sm font-black text-slate-950 dark:text-white">{activeDomain === 'all' ? 'همه بخش‌ها' : DOMAIN_META[activeDomain].plural}</div>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={submitSearch} className="search-results-search-form grid gap-3 px-5 py-4 lg:grid-cols-[1fr_auto]">
          <div className="search-results-search-shell relative" dir="ltr">
            <i className="search-results-search-shell__icon fa-solid fa-search absolute left-4 right-auto top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="جستجو در نام، توضیحات، یادداشت، شماره تماس، IMEI، متن اقلام و توضیحات فروش نقدی..."
              dir="rtl"
              className="search-results-search-shell__input h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 pr-4 pl-12 text-right text-sm font-bold text-slate-900 outline-none transition     dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100  "
            />
          </div>
          <button type="submit" className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100">
            <i className="fa-solid fa-magnifying-glass" /> جستجو
          </button>
        </form>

        <div className="flex flex-wrap gap-2 border-t border-slate-200/70 px-5 py-4 dark:border-slate-800">
          {FILTERS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setDomain(item.key)}
              className={[
                'inline-flex min-h-10 items-center gap-2 rounded-full border px-3 text-xs font-black transition',
                activeDomain === item.key
                  ? 'border-slate-950 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-950'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900',
              ].join(' ')}
            >
              <i className={item.icon} />
              <span>{item.label}</span>
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] dark:bg-slate-950/10">{(domainCounts[item.key] || 0).toLocaleString('fa-IR')}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-3">
          {loading ? (
            Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-24 animate-pulse rounded-3xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900" />)
          ) : error ? (
            <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-bold text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-200">{error}</div>
          ) : normalizedQuery.length < 2 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">برای شروع، حداقل دو کاراکتر جستجو کن.</div>
          ) : filtered.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center dark:border-slate-800 dark:bg-slate-950">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-900"><i className="fa-solid fa-magnifying-glass" /></div>
              <div className="mt-3 text-base font-black text-slate-800 dark:text-slate-100">نتیجه‌ای پیدا نشد</div>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">عبارت کوتاه‌تر یا فیلتر دیگری را امتحان کن.</p>
            </div>
          ) : (
            filtered.map((item, index) => {
              const meta = DOMAIN_META[item.domain];
              const key = `${item.domain}:${item.id}`;
              const isActive = index === activeMatchIndex;
              return (
                <button
                  key={key}
                  ref={(node) => { resultRefs.current[key] = node; }}
                  type="button"
                  onClick={() => setSelectedItem(item)}
                  className={[
                    'group flex w-full items-start gap-4 rounded-[28px] border bg-white px-4 py-4 text-right shadow-[0_20px_50px_-44px_rgba(15,23,42,0.25)] outline-none transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-[0_28px_70px_-52px_rgba(14,165,233,0.35)] dark:bg-slate-950',
                    (isActive || selectedItem?.domain === item.domain && selectedItem?.id === item.id) ? 'border-sky-300 ring-4 ring-sky-100 dark:border-sky-700 dark:ring-sky-950/40' : 'border-slate-200 dark:border-slate-800',
                  ].join(' ')}
                >
                  <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl border ${meta.tone}`}><i className={meta.icon} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-black text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">{meta.label}</span>
                      <span className="text-[11px] font-black text-slate-400">#{item.id.toLocaleString('fa-IR')}</span>
                      {item.matchSource ? <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200">{item.matchSource}</span> : null}
                    </span>
                    <span className="mt-2 block truncate text-base font-black text-slate-950 dark:text-white">
                      {item.titleHL ? <span dangerouslySetInnerHTML={{ __html: item.titleHL }} /> : highlightPlain(item.title || `#${item.id}`, normalizedQuery) ? <span dangerouslySetInnerHTML={{ __html: highlightPlain(item.title || `#${item.id}`, normalizedQuery) }} /> : item.title || `#${item.id}`}
                    </span>
                    {item.subtitle ? <span className="mt-1 block truncate text-sm font-semibold text-slate-500 dark:text-slate-400">{item.subtitle}</span> : null}
                    {item.snippet ? (
                      <span className="mt-2 block line-clamp-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
                        <span className="ml-1 font-black text-slate-400 dark:text-slate-500">تطابق:</span>
                        <span dangerouslySetInnerHTML={{ __html: item.snippet }} />
                      </span>
                    ) : (
                      <span className="mt-2 block line-clamp-2 text-sm leading-7 text-slate-500 dark:text-slate-400">{stripHtml(item.title || '') || 'برای مشاهده جزئیات باز کنید.'}</span>
                    )}
                    {item.matchReason ? (
                      <span className="mt-2 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                        <i className="fa-solid fa-ranking-star text-amber-500" />
                        {item.matchReason}
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-2 grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-slate-200 text-slate-400 transition group-hover:border-sky-200 group-hover:text-sky-600 dark:border-slate-700 dark:group-hover:border-sky-700 dark:group-hover:text-sky-300"><i className="fa-solid fa-arrow-up-left" /></span>
                </button>
              );
            })
          )}
        </div>

        <aside className="space-y-3 lg:sticky lg:top-5 lg:self-start">
          <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.25)] dark:border-slate-800 dark:bg-slate-950">
            <div className="text-sm font-black text-slate-950 dark:text-white">پرش بین نتایج</div>
            <p className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">نتایج فعلی را سریع مرور کن.</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => jumpToResult(-1)} disabled={!filtered.length} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-white disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">قبلی</button>
              <button type="button" onClick={() => jumpToResult(1)} disabled={!filtered.length} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-white disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">بعدی</button>
            </div>
            <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-center text-xs font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              {filtered.length ? `${(activeMatchIndex + 1).toLocaleString('fa-IR')} از ${filtered.length.toLocaleString('fa-IR')}` : 'بدون نتیجه'}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
            <div className="text-sm font-black text-slate-950 dark:text-white">پوشش جستجو</div>
            <div className="mt-3 space-y-2">
              {FILTERS.filter((item) => item.key !== 'all').map((item) => (
                <button key={item.key} type="button" onClick={() => setDomain(item.key)} className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                  <span className="inline-flex items-center gap-2"><i className={item.icon} />{item.label}</span>
                  <span>{(domainCounts[item.key] || 0).toLocaleString('fa-IR')}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>
      </section>

      {selectedItem ? (() => {
        const meta = DOMAIN_META[selectedItem.domain];
        const actions = getQuickActions(selectedItem);
        const titleHtml = selectedItem.titleHL || highlightPlain(selectedItem.title || `#${selectedItem.id}`, normalizedQuery);
        const snippetHtml = selectedItem.snippet || highlightPlain(stripHtml(selectedItem.subtitle || selectedItem.title || ''), normalizedQuery);
        return (
          <div className="fixed inset-0 z-[120] flex justify-end bg-slate-950/18 backdrop-blur-[2px]" onClick={closePreview} dir="rtl">
            <aside
              className="h-full w-[min(92vw,440px)] overflow-y-auto border-r border-slate-200 bg-white shadow-[0_30px_90px_-30px_rgba(15,23,42,0.38)] dark:border-slate-800 dark:bg-slate-950"
              onClick={(event) => event.stopPropagation()}
              aria-label="پیش‌نمایش نتیجه جستجو"
            >
              <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/92 px-5 py-4 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/92">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-black ${meta.tone}`}>
                      <i className={meta.icon} /> {meta.label}
                    </span>
                    <h2 className="mt-3 text-xl font-black tracking-[-0.025em] text-slate-950 dark:text-white">پیش‌نمایش نتیجه</h2>
                  </div>
                  <button type="button" onClick={closePreview} className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500 transition hover:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800" aria-label="بستن پیش‌نمایش">
                    <i className="fa-solid fa-xmark" />
                  </button>
                </div>
              </div>

              <div className="space-y-4 px-5 py-5">
                <section className="rounded-[28px] border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/55">
                  <div className="text-[11px] font-black text-slate-400 dark:text-slate-500">عنوان</div>
                  <div className="mt-2 text-lg font-black leading-8 text-slate-950 dark:text-white" dangerouslySetInnerHTML={{ __html: titleHtml }} />
                  {selectedItem.subtitle ? <div className="mt-2 text-sm font-semibold leading-7 text-slate-500 dark:text-slate-400">{selectedItem.subtitle}</div> : null}
                </section>

                <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="text-sm font-black text-slate-900 dark:text-slate-100">متن تطابق</div>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-black text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">#{selectedItem.id.toLocaleString('fa-IR')}</span>
                  </div>
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-3 py-3 text-sm leading-7 text-slate-700 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-200" dangerouslySetInnerHTML={{ __html: snippetHtml || 'تطابق متنی برای این نتیجه ثبت نشده است.' }} />
                </section>

                <section className="rounded-[28px] border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/70">
                  <div className="text-sm font-black text-slate-900 dark:text-slate-100">اکشن‌های سریع</div>
                  <div className="mt-3 grid gap-2">
                    {actions.map((action) => (
                      <button
                        key={`${selectedItem.domain}-${action.label}`}
                        type="button"
                        onClick={() => navigate(action.to)}
                        className={[
                          'inline-flex min-h-11 items-center justify-between gap-3 rounded-2xl border px-4 text-sm font-black transition hover:-translate-y-0.5',
                          action.primary
                            ? 'border-slate-950 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-950'
                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800',
                        ].join(' ')}
                      >
                        <span className="inline-flex items-center gap-2"><i className={action.icon} />{action.label}</span>
                        <i className="fa-solid fa-arrow-up-left text-[11px] opacity-70" />
                      </button>
                    ))}
                  </div>
                </section>

                <section className="rounded-[28px] border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                  <div className="flex items-center gap-2 text-sm font-black text-emerald-800 dark:text-emerald-200"><i className="fa-solid fa-ranking-star" /> دلیل نمایش این نتیجه</div>
                  <div className="mt-2 text-sm leading-7 text-emerald-700 dark:text-emerald-100">{selectedItem.matchReason || 'این نتیجه با عبارت جستجو تطابق دارد.'}</div>
                  {selectedItem.matchSource ? <div className="mt-2 inline-flex rounded-full border border-emerald-200 bg-white/70 px-3 py-1 text-[11px] font-black text-emerald-700 dark:border-emerald-900/40 dark:bg-slate-950/50 dark:text-emerald-200">{selectedItem.matchSource}</div> : null}
                </section>

                <section className="rounded-[28px] border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/55">
                  <div className="text-sm font-black text-slate-900 dark:text-slate-100">اطلاعات فنی</div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-950"><span className="block text-[10px] text-slate-400">بخش</span>{meta.plural}</div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-950"><span className="block text-[10px] text-slate-400">امتیاز</span>{Number(selectedItem.score || 0).toLocaleString('fa-IR')}</div>
                  </div>
                </section>
              </div>
            </aside>
          </div>
        );
      })() : null}
    </div>
  );
};

export default SearchResultsPage;
