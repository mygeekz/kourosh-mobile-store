import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { processQuery } from '../../utils/search/processQuery';
import { buildRelatedSuggestions, getPopularSearches, getRecentSearches, recordSearch } from '../../utils/searchInsights';
import type { HeaderSearchItem } from './headerTypes';

type UseHeaderSearchOptions = {
  token?: string | null;
};

const HEADER_SEARCH_DEBOUNCE_MS = 220;
const HEADER_SEARCH_RESULT_LIMIT = 8;

const DEFAULT_RELATED_SEARCH_SEEDS = [
  'کاور',
  'گلس',
  'باتری',
  'شارژر',
  'اقساط',
  'تعمیرات',
  'مشتری',
  'همکار',
];

const resolveHeaderSearchPath = (item: HeaderSearchItem, term: string) => {
  switch (item.domain) {
    case 'customer': return `/customers/${item.id}`;
    case 'partner': return `/partners/${item.id}`;
    case 'invoice': return `/invoices/${item.id}`;
    case 'repair': return `/repairs/${item.id}`;
    case 'installment': return `/installment-sales/${item.id}`;
    case 'product': return `/products?search=${encodeURIComponent(term)}`;
    case 'phone': return `/mobile-phones?q=${encodeURIComponent(term)}`;
    case 'service': return `/services?q=${encodeURIComponent(term)}`;
    default: return `/products?search=${encodeURIComponent(term)}`;
  }
};

export const useHeaderSearch = ({ token }: UseHeaderSearchOptions) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [globalResults, setGlobalResults] = useState<HeaderSearchItem[]>([]);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);

  const recentSearches = useMemo(() => getRecentSearches(), [searchFocused, searchQuery]);
  const popularSearches = useMemo(() => getPopularSearches(), [searchFocused, searchQuery]);
  const relatedSearches = useMemo(() => {
    const pool = [
      ...recentSearches.map((item) => item.query),
      ...popularSearches.map((item) => item.query),
      suggestion || '',
      ...DEFAULT_RELATED_SEARCH_SEEDS,
    ];
    return buildRelatedSuggestions(searchQuery, pool, 6);
  }, [recentSearches, popularSearches, searchQuery, suggestion]);

  const stashPaletteQuery = useCallback((value: string) => {
    try {
      localStorage.setItem('commandPaletteInitialQuery', value);
    } catch {
      // Command palette seed is best-effort only.
    }
  }, []);

  const openGlobalResult = useCallback((item: HeaderSearchItem, rawValue?: string) => {
    const processedQuery = processQuery(rawValue ?? searchQuery);
    const q = processedQuery.final || processedQuery.normalized || '';
    if (q) recordSearch(q);
    navigate(resolveHeaderSearchPath(item, q || item.title || ''));
    setSearchFocused(false);
  }, [navigate, searchQuery]);

  const openSearchResultsPage = useCallback((rawValue: string = searchQuery) => {
    const processedQuery = processQuery(rawValue);
    const q = (processedQuery.final || processedQuery.normalized || '').trim();
    if (!q) return;
    setSearchQuery(q);
    setSuggestion(processedQuery.suggestion ?? null);
    recordSearch(q);
    setSearchFocused(false);
    navigate({ pathname: '/search', search: `?q=${encodeURIComponent(q)}` });
  }, [navigate, searchQuery]);

  const runGlobalSearch = useCallback((rawValue: string) => {
    openSearchResultsPage(rawValue);
  }, [openSearchResultsPage]);

  const handleSearchSubmit = useCallback((event: FormEvent) => {
    event.preventDefault();
    runGlobalSearch(searchQuery);
  }, [runGlobalSearch, searchQuery]);

  useEffect(() => {
    if (!searchFocused) return;
    const processed = processQuery(searchQuery);
    const q = (processed.final || processed.normalized || '').trim();
    if (!q || q.length < 2 || !token) {
      setGlobalResults([]);
      setGlobalLoading(false);
      setGlobalError(null);
      searchAbortRef.current?.abort();
      searchAbortRef.current = null;
      return;
    }

    const controller = new AbortController();
    searchAbortRef.current?.abort();
    searchAbortRef.current = controller;
    setGlobalLoading(true);
    setGlobalError(null);

    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=${HEADER_SEARCH_RESULT_LIMIT}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(payload?.message || 'جستجوی سراسری انجام نشد');
        setGlobalResults(Array.isArray(payload?.items) ? payload.items : []);
      } catch (err: unknown) {
        const isAbortError = typeof err === 'object' && err !== null && 'name' in err && (err as { name?: string }).name === 'AbortError';
        if (isAbortError) return;
        const message = err instanceof Error ? err.message : 'خطا در جستجوی سراسری';
        setGlobalError(message);
        setGlobalResults([]);
      } finally {
        setGlobalLoading(false);
      }
    }, HEADER_SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery, searchFocused, token]);

  return {
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
    stashPaletteQuery,
    handleSearchSubmit,
    openGlobalResult,
    openSearchResultsPage,
    runGlobalSearch,
  };
};

export default useHeaderSearch;
