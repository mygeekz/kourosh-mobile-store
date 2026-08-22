import { useCallback, useEffect, useState } from "react";
import { fetchMiniAppData, MiniAppApiError } from "../apiClient";
import { useMiniAppDataAvailability } from "../dataAvailability/MiniAppDataAvailabilityContext";
import type { MiniAppResponseMeta } from "../reference/miniAppDataAvailability";

type QueryState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  meta: MiniAppResponseMeta | null;
  retry: () => void;
};

type MiniAppQueryOptions = {
  availability?: "primary" | "secondary";
};

export const useMiniAppQuery = <T,>(path: string, options: MiniAppQueryOptions = {}): QueryState<T> => {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<Omit<QueryState<T>, "retry">>({
    data: null,
    loading: true,
    error: null,
    meta: null,
  });
  const { beginRequest, reportMeta, clearAvailability } = useMiniAppDataAvailability();
  const primaryAvailability = options.availability !== "secondary";

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    beginRequest(path, { primary: primaryAvailability });
    setState({ data: null, loading: true, error: null, meta: null });
    void fetchMiniAppData<T>(path, controller.signal)
      .then((result) => {
        if (!active) return;
        reportMeta(path, result.meta);
        setState({ data: result.data, loading: false, error: null, meta: result.meta });
      })
      .catch((error: unknown) => {
        if (!active) return;
        const apiError = error instanceof MiniAppApiError ? error : null;
        if (apiError?.responseMeta) reportMeta(path, apiError.responseMeta);
        else clearAvailability(path);
        setState({
          data: null,
          loading: false,
          error: apiError?.message || "دریافت اطلاعات انجام نشد.",
          meta: apiError?.responseMeta || null,
        });
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [attempt, beginRequest, clearAvailability, path, primaryAvailability, reportMeta]);

  return { ...state, retry };
};
