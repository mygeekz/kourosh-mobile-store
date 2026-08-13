import { useCallback, useEffect, useState } from "react";
import { fetchMiniAppData, MiniAppApiError } from "../apiClient";

type QueryState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
};

export const useMiniAppQuery = <T,>(path: string): QueryState<T> => {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<Omit<QueryState<T>, "retry">>({
    data: null,
    loading: true,
    error: null,
  });

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    setState({ data: null, loading: true, error: null });
    void fetchMiniAppData<T>(path)
      .then((data) => {
        if (active) setState({ data, loading: false, error: null });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState({
          data: null,
          loading: false,
          error: error instanceof MiniAppApiError ? error.message : "دریافت اطلاعات انجام نشد.",
        });
      });
    return () => {
      active = false;
    };
  }, [attempt, path]);

  return { ...state, retry };
};
