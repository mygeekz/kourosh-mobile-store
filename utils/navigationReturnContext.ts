import { resolveNavigationContext } from './navigationContext';
import {
  resolveNavigationEntityLabels,
  type NavigationEntityBreadcrumbStageSnapshot,
  type NavigationEntityLabelContext,
} from './navigationEntityLabelResolver';

export const NAVIGATION_RETURN_QUERY_KEY = 'navctx';
const STORAGE_PREFIX = 'kourosh:navigation-return:';
const MAX_AGE_MS = 8 * 60 * 60 * 1000;

export type CustomerLedgerReturnUiState = {
  kind: 'customer-ledger';
  customerId: number;
  page: number;
  pageSize: '25' | '50' | '100';
  search: string;
  direction: 'all' | 'debit' | 'credit' | 'recent' | string;
  range: 'all' | 'today' | 'week' | 'month' | string;
  expandedEntryId?: number | null;
};

export type PartnerLedgerReturnUiState = {
  kind: 'partner-ledger';
  partnerId: string;
  page: number;
  pageSize: '25' | '50' | '100';
  search: string;
  direction: string;
  range: string;
  systemId: string;
  settlementBatchId: string;
  displayMode: string;
  expandedEntryId?: number | null;
};

export type ReportDrilldownReturnUiState = {
  kind: 'report-drilldown';
  reportKey: string;
  state: Record<string, unknown>;
};

export type NavigationReturnUiState = CustomerLedgerReturnUiState | PartnerLedgerReturnUiState | ReportDrilldownReturnUiState | Record<string, unknown>;

export type NavigationReturnRecord = {
  id: string;
  originPath: string;
  originPathname: string;
  originTitle: string;
  originContextLabel?: string;
  originAnchorId?: string;
  originScrollTop: number;
  originAnchorOffsetTop?: number;
  originUiState?: NavigationReturnUiState;
  targetPath: string;
  targetEntityStages?: NavigationEntityBreadcrumbStageSnapshot[];
  parentReturnId?: string;
  createdAt: number;
};

export type NavigationReturnCaptureInput = {
  originPath: string;
  originPathname: string;
  originTitle?: string;
  originContextLabel?: string;
  originAnchorId?: string;
  originUiState?: NavigationReturnUiState;
  targetEntity?: NavigationEntityLabelContext;
};

type NavigateLike = (to: string, options?: { replace?: boolean; state?: unknown }) => void;

const safeSessionStorage = (): Storage | null => {
  if (typeof window === 'undefined') return null;
  try {
    const storage = window.sessionStorage;
    const key = '__kourosh_navigation_return_probe__';
    storage.setItem(key, '1');
    storage.removeItem(key);
    return storage;
  } catch {
    return null;
  }
};

const makeId = (): string => {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  } catch {
    // Fall back to a timestamp/random token below.
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

const splitPath = (rawPath: string) => {
  const value = String(rawPath || '/');
  const hashIndex = value.indexOf('#');
  const withoutHash = hashIndex >= 0 ? value.slice(0, hashIndex) : value;
  const hash = hashIndex >= 0 ? value.slice(hashIndex) : '';
  const queryIndex = withoutHash.indexOf('?');
  return {
    pathname: queryIndex >= 0 ? withoutHash.slice(0, queryIndex) || '/' : withoutHash || '/',
    search: queryIndex >= 0 ? withoutHash.slice(queryIndex + 1) : '',
    hash,
  };
};

export const stripNavigationReturnParam = (rawPath: string): string => {
  const { pathname, search, hash } = splitPath(rawPath);
  const params = new URLSearchParams(search);
  params.delete(NAVIGATION_RETURN_QUERY_KEY);
  const nextSearch = params.toString();
  return `${pathname}${nextSearch ? `?${nextSearch}` : ''}${hash}`;
};

const appendNavigationReturnParam = (targetPath: string, id: string): string => {
  const { pathname, search, hash } = splitPath(targetPath);
  const params = new URLSearchParams(search);
  params.set(NAVIGATION_RETURN_QUERY_KEY, id);
  return `${pathname}?${params.toString()}${hash}`;
};

const preserveValidParentReturnParam = (rawPath: string): { path: string; parentReturnId?: string } => {
  const { pathname, search, hash } = splitPath(rawPath);
  const params = new URLSearchParams(search);
  const parentReturnId = params.get(NAVIGATION_RETURN_QUERY_KEY);
  if (!parentReturnId || !readNavigationReturnRecordById(parentReturnId)) {
    params.delete(NAVIGATION_RETURN_QUERY_KEY);
    const nextSearch = params.toString();
    return { path: `${pathname}${nextSearch ? `?${nextSearch}` : ''}${hash}` };
  }
  return { path: `${pathname}?${params.toString()}${hash}`, parentReturnId };
};

const getMainScrollContainer = (): HTMLElement | null => {
  if (typeof document === 'undefined') return null;
  return document.querySelector<HTMLElement>('[data-ui-shell="main-scroll"]');
};

const getNavigationAnchor = (anchorId?: string): HTMLElement | null => {
  if (!anchorId || typeof document === 'undefined') return null;
  const anchors = Array.from(document.querySelectorAll<HTMLElement>('[data-navigation-anchor]'));
  return anchors.find((node) => node.dataset.navigationAnchor === anchorId) || null;
};

const captureScrollSnapshot = (anchorId?: string) => {
  const main = getMainScrollContainer();
  const anchor = getNavigationAnchor(anchorId);
  const originScrollTop = Math.max(0, Number(main?.scrollTop || 0));
  if (!main || !anchor) return { originScrollTop };
  const containerRect = main.getBoundingClientRect();
  const anchorRect = anchor.getBoundingClientRect();
  return {
    originScrollTop,
    originAnchorOffsetTop: anchorRect.top - containerRect.top,
  };
};

const writeRecord = (record: NavigationReturnRecord) => {
  const storage = safeSessionStorage();
  if (!storage) return;
  try {
    storage.setItem(`${STORAGE_PREFIX}${record.id}`, JSON.stringify(record));
  } catch {
    // Navigation still works; the destination state contains the same record as a fallback.
  }
};

export const removeNavigationReturnRecord = (id?: string | null) => {
  if (!id) return;
  const storage = safeSessionStorage();
  if (!storage) return;
  try {
    storage.removeItem(`${STORAGE_PREFIX}${id}`);
  } catch {
    // Ignore storage cleanup failures.
  }
};

export const removeNavigationReturnRecords = (ids: Array<string | null | undefined>) => {
  const uniqueIds = Array.from(new Set(ids.map((id) => String(id || '').trim()).filter(Boolean)));
  uniqueIds.forEach((id) => removeNavigationReturnRecord(id));
};

export const readNavigationReturnRecordById = (id?: string | null): NavigationReturnRecord | null => {
  if (!id) return null;
  const storage = safeSessionStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(`${STORAGE_PREFIX}${id}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as NavigationReturnRecord;
    if (!parsed?.id || !parsed?.originPath || !parsed?.targetPath || !parsed?.createdAt) {
      storage.removeItem(`${STORAGE_PREFIX}${id}`);
      return null;
    }
    if (Date.now() - Number(parsed.createdAt) > MAX_AGE_MS) {
      storage.removeItem(`${STORAGE_PREFIX}${id}`);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

export const getNavigationReturnChain = (record: NavigationReturnRecord, maxDepth = 20): NavigationReturnRecord[] => {
  const chain: NavigationReturnRecord[] = [];
  const visited = new Set<string>();
  let cursor: NavigationReturnRecord | null = record;
  const safeDepth = Math.max(1, Math.min(20, Number(maxDepth || 10)));

  while (cursor && chain.length < safeDepth) {
    if (visited.has(cursor.id)) break;
    visited.add(cursor.id);
    chain.push(cursor);
    cursor = cursor.parentReturnId ? readNavigationReturnRecordById(cursor.parentReturnId) : null;
  }

  return chain.reverse();
};

export const getNavigationReturnRecord = (
  search: string,
  fallbackState?: unknown,
): NavigationReturnRecord | null => {
  const params = new URLSearchParams(search || '');
  const id = params.get(NAVIGATION_RETURN_QUERY_KEY);
  const stored = readNavigationReturnRecordById(id);
  if (stored) return stored;

  const stateRecord = (fallbackState as any)?.navigationReturnContext as NavigationReturnRecord | undefined;
  if (!stateRecord?.id || !stateRecord?.originPath || !stateRecord?.createdAt) return null;
  if (Date.now() - Number(stateRecord.createdAt) > MAX_AGE_MS) return null;
  return stateRecord;
};

export const navigateWithReturnContext = (
  navigate: NavigateLike,
  targetPath: string,
  input: NavigationReturnCaptureInput,
) => {
  const id = makeId();
  const originWithParent = preserveValidParentReturnParam(input.originPath || input.originPathname || '/');
  const cleanOriginPath = originWithParent.path;
  const cleanTargetPath = stripNavigationReturnParam(targetPath);
  const scrollSnapshot = captureScrollSnapshot(input.originAnchorId);
  const originTitle = String(input.originTitle || resolveNavigationContext(input.originPathname || '/').pageTitle || 'صفحه قبل');
  const record: NavigationReturnRecord = {
    id,
    originPath: cleanOriginPath,
    originPathname: String(input.originPathname || splitPath(cleanOriginPath).pathname || '/'),
    originTitle,
    originContextLabel: input.originContextLabel ? String(input.originContextLabel) : undefined,
    originAnchorId: input.originAnchorId ? String(input.originAnchorId) : undefined,
    originScrollTop: scrollSnapshot.originScrollTop,
    originAnchorOffsetTop: scrollSnapshot.originAnchorOffsetTop,
    originUiState: input.originUiState,
    targetPath: cleanTargetPath,
    targetEntityStages: resolveNavigationEntityLabels({
      targetPath: cleanTargetPath,
      contextLabel: input.originContextLabel,
      ...(input.targetEntity || {}),
    }),
    parentReturnId: originWithParent.parentReturnId,
    createdAt: Date.now(),
  };

  writeRecord(record);
  navigate(appendNavigationReturnParam(cleanTargetPath, id), {
    state: { navigationReturnContext: record },
  });
};

export const buildNavigationReturnRestoreState = (record: NavigationReturnRecord) => ({
  navigationReturnRestore: record,
});

export const getNavigationReturnRestoreRecord = (state: unknown): NavigationReturnRecord | null => {
  const record = (state as any)?.navigationReturnRestore as NavigationReturnRecord | undefined;
  if (!record?.id || !record?.originPath || !record?.createdAt) return null;
  if (Date.now() - Number(record.createdAt) > MAX_AGE_MS) return null;
  return record;
};

export const restoreNavigationAnchorPosition = (record: NavigationReturnRecord): (() => void) => {
  if (typeof document === 'undefined' || typeof window === 'undefined') return () => {};
  const main = getMainScrollContainer();
  if (!main) return () => {};

  let disposed = false;
  let highlightTimer = 0;
  let observer: MutationObserver | null = null;
  let settleTimer = 0;
  const deadline = Date.now() + 5000;

  const disconnectObserver = () => {
    observer?.disconnect();
    observer = null;
  };

  const scheduleObserverSettle = () => {
    if (settleTimer) window.clearTimeout(settleTimer);
    settleTimer = window.setTimeout(disconnectObserver, 1400);
  };

  const apply = () => {
    if (disposed) return false;
    const anchor = getNavigationAnchor(record.originAnchorId);
    if (!anchor) {
      if (Date.now() >= deadline) {
        main.scrollTop = Math.max(0, Number(record.originScrollTop || 0));
        return false;
      }
      return false;
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (disposed || !document.contains(anchor)) return;
        if (Number.isFinite(record.originAnchorOffsetTop)) {
          const containerRect = main.getBoundingClientRect();
          const anchorRect = anchor.getBoundingClientRect();
          const currentOffset = anchorRect.top - containerRect.top;
          main.scrollTop += currentOffset - Number(record.originAnchorOffsetTop || 0);
        } else {
          main.scrollTop = Math.max(0, Number(record.originScrollTop || 0));
        }
        anchor.dataset.navigationReturnHighlight = 'true';
        if (highlightTimer) window.clearTimeout(highlightTimer);
        highlightTimer = window.setTimeout(() => {
          delete anchor.dataset.navigationReturnHighlight;
        }, 2800);
      });
    });
    scheduleObserverSettle();
    return true;
  };

  observer = new MutationObserver(() => {
    if (disposed) return;
    apply();
  });
  observer.observe(main, { childList: true, subtree: true });
  apply();

  const fallbackTimer = window.setTimeout(() => {
    if (disposed) return;
    const found = apply();
    if (!found) {
      main.scrollTop = Math.max(0, Number(record.originScrollTop || 0));
      disconnectObserver();
    }
  }, 5200);

  return () => {
    disposed = true;
    disconnectObserver();
    window.clearTimeout(fallbackTimer);
    if (settleTimer) window.clearTimeout(settleTimer);
    if (highlightTimer) window.clearTimeout(highlightTimer);
  };
};

export const getNavigationReturnUiState = <T extends NavigationReturnUiState>(
  state: unknown,
  kind: string,
): T | null => {
  const record = getNavigationReturnRestoreRecord(state);
  const uiState = record?.originUiState as T | undefined;
  if (!uiState || String((uiState as any).kind || '') !== kind) return null;
  return uiState;
};

export const preserveNavigationReturnSearch = (
  currentSearch: string,
  next: URLSearchParams | Record<string, string>,
): URLSearchParams => {
  const current = new URLSearchParams(currentSearch || '');
  const result = next instanceof URLSearchParams ? new URLSearchParams(next) : new URLSearchParams(next);
  const id = current.get(NAVIGATION_RETURN_QUERY_KEY);
  if (id) result.set(NAVIGATION_RETURN_QUERY_KEY, id);
  return result;
};
