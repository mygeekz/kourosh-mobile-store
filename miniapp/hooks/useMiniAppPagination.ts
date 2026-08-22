import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchMiniAppData, MiniAppApiError } from "../apiClient";
import { useMiniAppDataAvailability } from "../dataAvailability/MiniAppDataAvailabilityContext";

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
  const { beginRequest, reportMeta, clearAvailability } = useMiniAppDataAvailability();

  const loadPage = useCallback(async (page: number, append: boolean) => {
    append ? setLoadingMore(true) : setLoading(true);
    setError(null);
    const separator = endpoint.includes("?") ? "&" : "?";
    const requestPath = `${endpoint}${separator}page=${page}&pageSize=${pageSize}`;
    beginRequest(requestPath);
    try {
      const result = await fetchMiniAppData<TData>(requestPath);
      const data = result.data;
      if (!data || !Array.isArray(data.items) || !Number.isFinite(Number(data.page)) || !Number.isFinite(Number(data.totalPages))) {
        throw new MiniAppApiError(
          "MINIAPP_PAGE_RESPONSE_INVALID",
          "ساختار فهرست دریافتی از کوروش معتبر نیست.",
          502,
          undefined,
          result.meta,
        );
      }
      reportMeta(requestPath, result.meta);
      setPages((current) => append ? [...current.filter((existing) => existing.page !== data.page), data] : [data]);
    } catch (caught: unknown) {
      const apiError = caught instanceof MiniAppApiError ? caught : null;
      if (apiError?.responseMeta) reportMeta(requestPath, apiError.responseMeta);
      else clearAvailability(requestPath);
      setError(apiError?.message || "دریافت اطلاعات انجام نشد.");
    } finally {
      append ? setLoadingMore(false) : setLoading(false);
    }
  }, [beginRequest, clearAvailability, endpoint, pageSize, reportMeta]);

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
