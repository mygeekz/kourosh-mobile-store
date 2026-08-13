import React, { type FormEvent } from 'react';
import { FontAwesomeIcon } from '@/components/ui';
import { processQuery } from '../../utils/search/processQuery';
import type { HeaderSearchDomain, HeaderSearchHistoryItem, HeaderSearchItem } from './headerTypes';
import type { FontAwesomeIconClass } from '../../types/iconMetadata';


type HeaderSearchProps = {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  setSuggestion: (value: string | null) => void;
  searchFocused: boolean;
  setSearchFocused: (value: boolean) => void;
  recentSearches: HeaderSearchHistoryItem[];
  popularSearches: HeaderSearchHistoryItem[];
  relatedSearches: string[];
  globalResults: HeaderSearchItem[];
  globalLoading: boolean;
  globalError: string | null;
  onOpenCommandPalette?: () => void;
  stashPaletteQuery: (value: string) => void;
  handleSearchSubmit: (event: FormEvent) => void;
  openGlobalResult: (item: HeaderSearchItem) => void;
  openSearchResultsPage: (rawValue?: string) => void;
  runGlobalSearch: (rawValue: string) => void;
};

const headerDomainMeta = (domain: HeaderSearchDomain): { label: string; icon: FontAwesomeIconClass; accent: string } => {
  switch (domain) {
    case 'customer': return { label: 'مشتری', icon: 'fa-solid fa-user', accent: 'text-sky-700 bg-sky-50 border-sky-100' };
    case 'partner': return { label: 'همکار', icon: 'fa-solid fa-user-tie', accent: 'text-violet-700 bg-violet-50 border-violet-100' };
    case 'product': return { label: 'کالا', icon: 'fa-solid fa-box', accent: 'text-emerald-700 bg-emerald-50 border-emerald-100' };
    case 'phone': return { label: 'گوشی', icon: 'fa-solid fa-mobile-screen-button', accent: 'text-cyan-700 bg-cyan-50 border-cyan-100' };
    case 'service': return { label: 'خدمت', icon: 'fa-solid fa-wand-magic-sparkles', accent: 'text-fuchsia-700 bg-fuchsia-50 border-fuchsia-100' };
    case 'invoice': return { label: 'فروش', icon: 'fa-solid fa-file-invoice-dollar', accent: 'text-amber-700 bg-amber-50 border-amber-100' };
    case 'repair': return { label: 'تعمیر', icon: 'fa-solid fa-screwdriver-wrench', accent: 'text-rose-700 bg-rose-50 border-rose-100' };
    case 'installment': return { label: 'اقساط', icon: 'fa-solid fa-credit-card', accent: 'text-indigo-700 bg-indigo-50 border-indigo-100' };
    default: return { label: 'نتیجه', icon: 'fa-solid fa-magnifying-glass', accent: 'text-gray-700 bg-gray-50 border-gray-100' };
  }
};

const HeaderSearch: React.FC<HeaderSearchProps> = ({
  searchQuery,
  setSearchQuery,
  setSuggestion,
  searchFocused,
  setSearchFocused,
  recentSearches,
  popularSearches,
  relatedSearches,
  globalResults,
  globalLoading,
  globalError,
  onOpenCommandPalette,
  stashPaletteQuery,
  handleSearchSubmit,
  openGlobalResult,
  openSearchResultsPage,
  runGlobalSearch,
}) => (
  <>
  {/* Search */}
  <div className="app-header-search-region">
    <div className="app-header-search-anchor">
      <form onSubmit={handleSearchSubmit} className="app-header-search">
        <button
          data-skip-global-button="true"
          type="button"
          onClick={() => { stashPaletteQuery(searchQuery); onOpenCommandPalette?.(); }}
          className="app-header-search__command"
          aria-label="بازکردن فرمان سریع"
          data-tooltip="فرمان سریع (Ctrl/⌘+K)"
        >
          <FontAwesomeIcon icon="fa-solid fa-bolt" />
          <span className="app-header-search__shortcut">⌘K</span>
        </button>

        <input
          dir="rtl"
          type="text"
          placeholder="جستجوی مشتری، کالا، فروش یا تعمیر..."
          value={searchQuery}
          onChange={(e) => {
            const v = e.target.value;
            setSearchQuery(v);
            const p = processQuery(v);
            setSuggestion(p.suggestion ?? null);
          }}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setTimeout(() => setSearchFocused(false), 120)}
          className="app-header-search__input"
          aria-label="جستجوی سراسری داده‌ها؛ ناوبری کامل در سایدبار است"
          autoComplete="off"
          spellCheck={false}
        />

        <button
          data-skip-global-button="true"
          type="submit"
          className="app-header-search__submit"
          aria-label="شروع جستجوی سراسری"
        >
          <FontAwesomeIcon icon="fa-solid fa-search" />
        </button>

        {searchFocused && (
          <div className="app-header-search-panel">
            <div className="header-search-scope-note mx-3 mt-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-3 py-2 text-[11px] font-bold text-slate-500 dark:border-slate-700/70 dark:bg-slate-900/50 dark:text-slate-300">
              <FontAwesomeIcon icon="fa-solid fa-magnifying-glass-chart" /> جستجوی هدر برای داده‌هاست؛ سایدبار نقشه کامل مسیرها و موبایل اکشن سریع فروش است.
            </div>
            {(globalLoading || globalError || globalResults.length > 0) && (
              <div className="border-b border-gray-100 dark:border-gray-700/60 p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="text-[11px] font-bold text-gray-500 dark:text-gray-400">
                    نتایج جستجوی سراسری
                    {globalResults.length > 0 ? <span className="mr-2 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-black text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">{globalResults.length.toLocaleString('fa-IR')} نتیجه</span> : null}
                  </div>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => openSearchResultsPage(searchQuery)}
                    className="text-[11px] font-semibold text-primary-700 hover:text-primary-800 dark:text-primary-300"
                  >
                    نمایش همه نتایج
                  </button>
                </div>
                {globalLoading ? (
                  <div className="grid gap-2">
                    {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-14 rounded-2xl bg-gray-100/90 dark:bg-gray-700/50 animate-pulse" />)}
                  </div>
                ) : globalError ? (
                  <div className="rounded-2xl border border-rose-100 bg-rose-50/80 px-3 py-2 text-xs text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">{globalError}</div>
                ) : (
                  <div className="grid gap-2">
                    {globalResults.slice(0, 5).map((item) => {
                      const meta = headerDomainMeta(item.domain);
                      return (
                        <button
                          key={`${item.domain}:${item.id}`}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => openGlobalResult(item)}
                          className="flex items-center gap-3 rounded-2xl border border-slate-200/90 bg-white px-3 py-2 text-right shadow-[0_10px_24px_-22px_rgba(15,23,42,0.18)] transition hover:border-primary-200 hover:bg-primary-50/60 hover:shadow-[0_18px_34px_-24px_rgba(14,165,233,0.18)] dark:border-slate-700/80 dark:bg-slate-900 dark:hover:border-primary-400/30 dark:hover:bg-primary-500/10"
                        >
                          <div className={`flex h-10 w-10 items-center justify-center rounded-2xl border ${meta.accent} dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700`}>
                            <FontAwesomeIcon icon={meta.icon} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="shrink-0 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-bold text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">{meta.label}</span>
                              <div className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
                                {item.titleHL ? <span dangerouslySetInnerHTML={{ __html: item.titleHL }} /> : (item.title || `#${item.id}`)}
                              </div>
                            </div>
                            {item.subtitle ? <div className="truncate text-xs text-gray-500 dark:text-gray-400">{item.subtitle}</div> : null}
                            {item.snippet ? (
                              <div className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                                <span className="ml-1 font-black text-slate-400 dark:text-slate-500">تطابق:</span>
                                <span dangerouslySetInnerHTML={{ __html: item.snippet }} />
                              </div>
                            ) : !item.subtitle ? <div className="truncate text-xs text-gray-500 dark:text-gray-400">برای مشاهده جزئیات باز کنید.</div> : null}
                            {item.matchSource ? (
                              <div className="mt-1 inline-flex max-w-full items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200" title={item.matchReason || item.matchSource}>
                                <FontAwesomeIcon icon="fa-solid fa-ranking-star" />
                                <span className="truncate">{item.matchSource}</span>
                              </div>
                            ) : null}
                          </div>
                          <FontAwesomeIcon icon="fa-solid fa-arrow-up-from-bracket" className="text-xs text-gray-400" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            {!!relatedSearches.length && (
              <div className="p-3 border-b border-gray-100 dark:border-gray-700/60">
                <div className="text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-2">پیشنهادهای مرتبط</div>
                <div className="flex flex-wrap gap-2">
                  {relatedSearches.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { setSearchQuery(item); runGlobalSearch(item); }}
                      className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700 dark:border-gray-600 dark:bg-gray-700/60 dark:text-gray-200 dark:hover:border-primary-400/40 dark:hover:bg-primary-500/10"
                    >
                      <FontAwesomeIcon icon="fa-solid fa-star" className="text-[10px]" />
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 gap-3 p-3 lg:grid-cols-2">
              <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-3 dark:border-gray-700/60 dark:bg-gray-900/30">
                <div className="mb-2 flex items-center gap-2 text-[11px] font-bold text-gray-500 dark:text-gray-400">
                  <FontAwesomeIcon icon="fa-regular fa-clock" /> آخرین جستجوها
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.length ? recentSearches.slice(0,6).map((item) => (
                    <button
                      key={item.query}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { setSearchQuery(item.query); runGlobalSearch(item.query); }}
                      className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 hover:border-primary-200 hover:text-primary-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                    >
                      <FontAwesomeIcon icon="fa-solid fa-rotate-left" className="text-[10px]" />
                      {item.query}
                    </button>
                  )) : <div className="text-xs text-gray-400">هنوز جستجویی ثبت اطلاعات نشده است.</div>}
                </div>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-3 dark:border-gray-700/60 dark:bg-gray-900/30">
                <div className="mb-2 flex items-center gap-2 text-[11px] font-bold text-gray-500 dark:text-gray-400">
                  <FontAwesomeIcon icon="fa-solid fa-fire" /> پرجستجوها
                </div>
                <div className="flex flex-wrap gap-2">
                  {popularSearches.length ? popularSearches.slice(0,6).map((item) => (
                    <button
                      key={item.query}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { setSearchQuery(item.query); runGlobalSearch(item.query); }}
                      className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-700 hover:bg-amber-100 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-200"
                    >
                      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white/80 px-1 text-[10px] font-bold dark:bg-black/20">{item.count}</span>
                      {item.query}
                    </button>
                  )) : <div className="text-xs text-gray-400">بعد از چند جستجو اینجا پیشنهادهای پرتکرار را می‌بینی.</div>}
                </div>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  </div>

  {/* Mobile Search Trigger */}
  <div className="app-header-mobile-search">
    <button
      onClick={() => onOpenCommandPalette?.()}
      data-skip-global-button="true"
      className="app-header-icon-button"
      aria-label="جستجو"
      data-tooltip="جستجوی داده‌ها؛ ناوبری کامل در سایدبار"
    >
      <FontAwesomeIcon icon="fa-solid fa-search" />
    </button>
  </div>
  </>
);

export default HeaderSearch;
