import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchMiniAppData, MiniAppApiError } from "../apiClient";

type PageData<TItem> = {
  items: TItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export const useMiniAppPagination = <TItem, TData extends PageData<TItem>>(
  endpoint: string,
  itemKey: (item: TItem) => string | number,
  pageSize = 20,
) => {
  const [pages, setPages] = useState<TData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const loadPage = useCallback(async (page: number, append: boolean) => {
    append ? setLoadingMore(true) : setLoading(true);
    setError(null);
    try {
      const separator = endpoint.includes("?") ? "&" : "?";
      const data = await fetchMiniAppData<TData>(`${endpoint}${separator}page=${page}&pageSize=${pageSize}`);
      setPages((current) => append ? [...current.filter((existing) => existing.page !== data.page), data] : [data]);
    } catch (caught: unknown) {
      setError(caught instanceof MiniAppApiError ? caught.message : "دریافت اطلاعات انجام نشد.");
    } finally {
      append ? setLoadingMore(false) : setLoading(false);
    }
  }, [endpoint, pageSize]);

  useEffect(() => {
    setPages([]);
    void loadPage(1, false);
  }, [attempt, loadPage]);

  const lastPage = pages[pages.length - 1] || null;
  const items = useMemo(() => {
    const seen = new Set<string | number>();
    return pages.flatMap((page) => page.items).filter((item) => {
      const key = itemKey(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [itemKey, pages]);

  return {
    data: lastPage ? { ...lastPage, items } as TData : null,
    loading,
    loadingMore,
    error,
    hasMore: Boolean(lastPage && lastPage.page < lastPage.totalPages),
    loadMore: () => {
      if (lastPage && !loadingMore && lastPage.page < lastPage.totalPages) void loadPage(lastPage.page + 1, true);
    },
    retry: () => setAttempt((value) => value + 1),
  };
};
