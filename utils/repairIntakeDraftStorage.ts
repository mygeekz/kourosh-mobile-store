import {
  REPAIR_INTAKE_DRAFTS_KEY,
  REPAIR_INTAKE_DRAFT_LIMIT,
  normalizeRepairIntakeDraft,
  parseRepairIntakeDrafts,
  sortRepairIntakeDrafts,
  type RepairIntakeDraft,
} from './repairIntakeDrafts';

export type RepairDraftStorageBackend = 'localStorage' | 'indexedDB';

export type RepairDraftStringStore = {
  name: RepairDraftStorageBackend | string;
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem?: (key: string) => Promise<void>;
};

export type RepairDraftPersistenceResult = {
  drafts: RepairIntakeDraft[];
  backend: string;
};

const DRAFT_DB_NAME = 'kourosh-browser-drafts';
const DRAFT_DB_STORE = 'drafts';
const DRAFT_DB_VERSION = 1;

const toErrorText = (error: unknown) => {
  if (error instanceof Error && error.message) return error.message;
  try {
    return String(error || 'خطای نامشخص');
  } catch {
    return 'خطای نامشخص';
  }
};

export const normalizeRepairIntakeDraftList = (drafts: unknown): RepairIntakeDraft[] => {
  if (!Array.isArray(drafts)) return [];
  return sortRepairIntakeDrafts(
    drafts
      .map(normalizeRepairIntakeDraft)
      .filter((draft): draft is RepairIntakeDraft => Boolean(draft)),
  );
};

export const serializeRepairIntakeDrafts = (drafts: unknown): string => (
  JSON.stringify(normalizeRepairIntakeDraftList(drafts))
);

const getBrowserLocalStorageStore = (): RepairDraftStringStore | null => {
  if (typeof window === 'undefined') return null;
  try {
    const storage = window.localStorage;
    // Access can itself throw in locked-down/private browser contexts.
    void storage.length;
    return {
      name: 'localStorage',
      async getItem(key) {
        return storage.getItem(key);
      },
      async setItem(key, value) {
        storage.setItem(key, value);
      },
      async removeItem(key) {
        storage.removeItem(key);
      },
    };
  } catch {
    return null;
  }
};

const openDraftDatabase = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  if (typeof indexedDB === 'undefined') {
    reject(new Error('IndexedDB در این مرورگر در دسترس نیست.'));
    return;
  }

  let request: IDBOpenDBRequest;
  try {
    request = indexedDB.open(DRAFT_DB_NAME, DRAFT_DB_VERSION);
  } catch (error) {
    reject(error);
    return;
  }

  request.onupgradeneeded = () => {
    const db = request.result;
    if (!db.objectStoreNames.contains(DRAFT_DB_STORE)) {
      db.createObjectStore(DRAFT_DB_STORE);
    }
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error || new Error('باز کردن IndexedDB انجام نشد.'));
  request.onblocked = () => reject(new Error('دسترسی IndexedDB توسط تب دیگری مسدود شده است.'));
});

const withDraftObjectStore = async <T>(
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> => {
  const db = await openDraftDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      let transaction: IDBTransaction;
      try {
        transaction = db.transaction(DRAFT_DB_STORE, mode);
      } catch (error) {
        reject(error);
        return;
      }
      const store = transaction.objectStore(DRAFT_DB_STORE);
      let request: IDBRequest<T>;
      try {
        request = work(store);
      } catch (error) {
        reject(error);
        return;
      }
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || transaction.error || new Error('عملیات IndexedDB انجام نشد.'));
      transaction.onabort = () => reject(transaction.error || new Error('تراکنش IndexedDB لغو شد.'));
      transaction.onerror = () => reject(transaction.error || new Error('تراکنش IndexedDB با خطا متوقف شد.'));
    });
  } finally {
    db.close();
  }
};

const getIndexedDbStore = (): RepairDraftStringStore | null => {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') return null;
  return {
    name: 'indexedDB',
    async getItem(key) {
      const result = await withDraftObjectStore<unknown>('readonly', (store) => store.get(key));
      return typeof result === 'string' ? result : null;
    },
    async setItem(key, value) {
      await withDraftObjectStore<IDBValidKey>('readwrite', (store) => store.put(value, key));
    },
    async removeItem(key) {
      await withDraftObjectStore<undefined>('readwrite', (store) => store.delete(key) as IDBRequest<undefined>);
    },
  };
};

export const getBrowserRepairDraftStores = (): RepairDraftStringStore[] => (
  [getBrowserLocalStorageStore(), getIndexedDbStore()].filter((store): store is RepairDraftStringStore => Boolean(store))
);

export const loadRepairIntakeDraftsFromStores = async (
  stores: RepairDraftStringStore[],
): Promise<{ drafts: RepairIntakeDraft[]; backend: string | null }> => {
  // Read every available backend instead of returning the first payload.
  // This matters after a fallback save: localStorage may later become
  // available again with an older/empty value while IndexedDB still owns
  // the last successful temporary repair. Merge by id and keep the newest
  // savedAt so no successfully persisted draft becomes invisible.
  const loaded: Array<{ store: RepairDraftStringStore; drafts: RepairIntakeDraft[] }> = [];

  for (const store of stores) {
    try {
      const raw = await store.getItem(REPAIR_INTAKE_DRAFTS_KEY);
      if (raw == null) continue;
      loaded.push({ store, drafts: parseRepairIntakeDrafts(raw) });
    } catch {
      // A blocked/quota/corrupted backend must not prevent recovery from the next one.
    }
  }

  if (loaded.length === 0) return { drafts: [], backend: null };

  const byId = new Map<string, RepairIntakeDraft>();
  for (const entry of loaded) {
    for (const draft of entry.drafts) {
      const previous = byId.get(draft.id);
      if (!previous || Date.parse(draft.savedAt) > Date.parse(previous.savedAt)) {
        byId.set(draft.id, draft);
      }
    }
  }

  const drafts = sortRepairIntakeDrafts([...byId.values()]).slice(0, REPAIR_INTAKE_DRAFT_LIMIT);
  const contributingBackends = loaded
    .filter((entry) => entry.drafts.length > 0)
    .map((entry) => entry.store.name);

  return {
    drafts,
    backend: contributingBackends.length > 0
      ? [...new Set(contributingBackends)].join('+')
      : loaded[0]?.store.name || null,
  };
};

export const persistRepairIntakeDraftsWithStores = async (
  drafts: unknown,
  stores: RepairDraftStringStore[],
): Promise<RepairDraftPersistenceResult> => {
  const normalizedDrafts = normalizeRepairIntakeDraftList(drafts);
  const serialized = JSON.stringify(normalizedDrafts);
  const failures: string[] = [];

  for (let index = 0; index < stores.length; index += 1) {
    const store = stores[index];
    try {
      await store.setItem(REPAIR_INTAKE_DRAFTS_KEY, serialized);
      const verify = await store.getItem(REPAIR_INTAKE_DRAFTS_KEY);
      if (verify !== serialized) {
        throw new Error('خواندن مجدد داده ذخیره‌شده با مقدار نوشته‌شده یکسان نبود.');
      }

      // Keep later backends as a best-effort mirror so a browser policy/quota
      // change does not make existing temporary repairs disappear.
      const mirrors = stores.slice(index + 1);
      if (mirrors.length > 0) {
        await Promise.allSettled(mirrors.map(async (mirror) => {
          await mirror.setItem(REPAIR_INTAKE_DRAFTS_KEY, serialized);
        }));
      }

      return { drafts: normalizedDrafts, backend: store.name };
    } catch (error) {
      failures.push(`${store.name}: ${toErrorText(error)}`);
    }
  }

  throw new Error(
    failures.length > 0
      ? `ذخیره پیش‌نویس در حافظه مرورگر انجام نشد. ${failures.join(' | ')}`
      : 'هیچ حافظه مرورگری برای ذخیره پیش‌نویس در دسترس نیست.',
  );
};

export const loadRepairIntakeDraftsDurably = async () => (
  loadRepairIntakeDraftsFromStores(getBrowserRepairDraftStores())
);

export const persistRepairIntakeDraftsDurably = async (drafts: unknown) => (
  persistRepairIntakeDraftsWithStores(drafts, getBrowserRepairDraftStores())
);

export const removeRepairDraftKeyDurably = async (key: string): Promise<void> => {
  const stores = getBrowserRepairDraftStores();
  await Promise.allSettled(stores.map((store) => store.removeItem?.(key)));
};

export const readBrowserLocalStorageSafely = (key: string): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

export const removeBrowserLocalStorageSafely = (key: string): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Compatibility cleanup must never crash the repair intake page.
  }
};
