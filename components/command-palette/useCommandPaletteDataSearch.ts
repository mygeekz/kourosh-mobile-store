import { useEffect, useRef, useState } from 'react';

import type { DataSearchItem } from './commandPaletteTypes';

export type UseCommandPaletteDataSearchOptions = {
  open: boolean;
  term: string;
  token?: string | null;
};

export type CommandPaletteDataSearchState = {
  dataResults: DataSearchItem[];
  dataLoading: boolean;
  dataErr: string | null;
};

export function useCommandPaletteDataSearch({ open, term, token }: UseCommandPaletteDataSearchOptions): CommandPaletteDataSearchState {
  const abortRef = useRef<AbortController | null>(null);
  const [dataResults, setDataResults] = useState<DataSearchItem[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataErr, setDataErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    const normalizedTerm = term.trim();
    if (!normalizedTerm || normalizedTerm.length < 2) {
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

    const timeout = setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(normalizedTerm)}&limit=24`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => ({} as { message?: string }));
          throw new Error(payload?.message || 'خطا در جستجوی سراسری');
        }
        const payload = await response.json();
        setDataResults(Array.isArray(payload?.items) ? payload.items : []);
      } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') return;
        setDataErr(error instanceof Error ? error.message : 'خطا در عملیاتی ناشناخته');
        setDataResults([]);
      } finally {
        setDataLoading(false);
      }
    }, 220);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [open, term, token]);

  return { dataResults, dataLoading, dataErr };
}
