import { useCallback, useEffect, useRef, useState } from "react";
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

// The global online/offline badge is driven by the provenance metadata of the
// current screen's primary request. Without a bounded refresh, a Mini App that
// stays open can keep the first snapshot timestamp forever and eventually mark
// an actually-online store as offline. Keep this intentionally lightweight:
// only the primary query polls and returning to Telegram refreshes immediately.
const PRIMARY_REFRESH_INTERVAL_MS = 60_000;

export const useMiniAppQuery = <T,>(path: string, options: MiniAppQueryOptions = {}): QueryState<T> => {
  const [attempt, setAttempt] = useState(0);
  const [backgroundRefresh, setBackgroundRefresh] = useState(0);
  const [state, setState] = useState<Omit<QueryState<T>, "retry">>({
    data: null,
    loading: true,
    error: null,
    meta: null,
  });
  const resolvedOnceRef = useRef(false);
  const resolvedPathRef = useRef(path);
  const backgroundRequestedRef = useRef(false);
  const { beginRequest, reportMeta, finishRequest, clearAvailability } = useMiniAppDataAvailability();
  const primaryAvailability = options.availability !== "secondary";

  if (resolvedPathRef.current !== path) {
    resolvedPathRef.current = path;
    resolvedOnceRef.current = false;
    backgroundRequestedRef.current = false;
  }

  const retry = useCallback(() => {
    backgroundRequestedRef.current = false;
    setAttempt((value) => value + 1);
  }, []);

  useEffect(() => {
    if (!primaryAvailability) return;
    const refresh = () => {
      backgroundRequestedRef.current = true;
      setBackgroundRefresh((value) => value + 1);
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const timer = window.setInterval(refresh, PRIMARY_REFRESH_INTERVAL_MS);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [path, primaryAvailability]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const isBackground = resolvedOnceRef.current && backgroundRequestedRef.current;
    backgroundRequestedRef.current = false;
    beginRequest(path, { primary: primaryAvailability });
    if (!isBackground) setState({ data: null, loading: true, error: null, meta: null });
    void fetchMiniAppData<T>(path, controller.signal)
      .then((result) => {
        if (!active) return;
        resolvedOnceRef.current = true;
        if (primaryAvailability) reportMeta(path, result.meta);
        setState({ data: result.data, loading: false, error: null, meta: result.meta });
      })
      .catch((error: unknown) => {
        if (!active) return;
        const apiError = error instanceof MiniAppApiError ? error : null;
        if (apiError?.responseMeta) {
          if (primaryAvailability) reportMeta(path, apiError.responseMeta);
        } else if (primaryAvailability) {
          if (apiError?.status === 401 || apiError?.status === 403) clearAvailability(path);
          else finishRequest(path);
        }
        setState((current) => {
          // A transient background refresh failure must not erase already
          // rendered business data. Authentication failures still flow through
          // the normal session-clearing path in apiClient and are surfaced.
          const preserveCurrent = isBackground && current.data !== null && apiError?.status !== 401 && apiError?.status !== 403;
          if (preserveCurrent) return {
            ...current,
            loading: false,
            meta: apiError?.responseMeta || current.meta,
          };
          return {
            data: null,
            loading: false,
            error: apiError?.message || "دریافت اطلاعات انجام نشد.",
            meta: apiError?.responseMeta || null,
          };
        });
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [attempt, backgroundRefresh, beginRequest, clearAvailability, finishRequest, path, primaryAvailability, reportMeta]);

  return { ...state, retry };
};
