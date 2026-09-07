export type MiniAppIdentitySyncKind = "customer" | "partner" | "manager";
export type MiniAppIdentitySyncOperation = "link" | "unlink";
export type MiniAppIdentitySyncState = "pending" | "ready" | "failed";

export type MiniAppIdentitySyncTarget = {
  kind: MiniAppIdentitySyncKind;
  localSubjectId: number;
  operation: MiniAppIdentitySyncOperation;
  expectedTelegramUserId: string | null;
};

export type MiniAppIdentitySyncStatus = {
  operationId: string;
  kind: MiniAppIdentitySyncKind;
  localSubjectId: number;
  operation: MiniAppIdentitySyncOperation;
  state: MiniAppIdentitySyncState;
  attempts: number;
  maxAttempts: number;
  requestedAt: string;
  updatedAt: string;
  readyAt: string | null;
  failedAt: string | null;
  lastErrorCode: string | null;
};

type InternalOperation = MiniAppIdentitySyncStatus & {
  expectedTelegramUserId: string | null;
  generation: number;
};

type CoordinatorDependencies = {
  reconcile: () => Promise<unknown>;
  isSatisfied: (target: MiniAppIdentitySyncTarget) => boolean;
  getLastErrorCode?: (target: MiniAppIdentitySyncTarget) => string | null;
  retryDelaysMs?: readonly number[];
  sleep?: (ms: number) => Promise<void>;
  now?: () => Date;
  randomId?: () => string;
  maxTrackedOperations?: number;
};

const defaultSleep = (ms: number) => new Promise<void>((resolve) => {
  const timer = setTimeout(resolve, ms);
  try { (timer as { unref?: () => void }).unref?.(); } catch {}
});
const keyFor = (kind: MiniAppIdentitySyncKind, localSubjectId: number) => `${kind}:${localSubjectId}`;

export const createMiniAppIdentitySyncCoordinator = (dependencies: CoordinatorDependencies) => {
  const retryDelaysMs = dependencies.retryDelaysMs?.length ? [...dependencies.retryDelaysMs] : [0, 1000, 2000, 4000];
  const sleep = dependencies.sleep || defaultSleep;
  const now = dependencies.now || (() => new Date());
  const randomId = dependencies.randomId || (() => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);
  const operations = new Map<string, InternalOperation>();
  const generations = new Map<string, number>();
  const maxTrackedOperations = Math.max(50, Number(dependencies.maxTrackedOperations || 500));

  const pruneTrackedOperations = () => {
    if (operations.size < maxTrackedOperations) return;
    const candidates = [...operations.entries()]
      .filter(([, operation]) => operation.state !== "pending")
      .sort(([, left], [, right]) => Date.parse(left.updatedAt) - Date.parse(right.updatedAt));
    const fallback = [...operations.entries()].sort(([, left], [, right]) => Date.parse(left.updatedAt) - Date.parse(right.updatedAt));
    const [oldestKey] = candidates[0] || fallback[0] || [];
    if (oldestKey) { operations.delete(oldestKey); generations.delete(oldestKey); }
  };

  const publicStatus = (operation: InternalOperation): MiniAppIdentitySyncStatus => {
    const { expectedTelegramUserId: _expectedTelegramUserId, generation: _generation, ...status } = operation;
    return { ...status };
  };

  const refreshReadyState = (operation: InternalOperation): InternalOperation => {
    if (operation.state === "ready") return operation;
    const satisfied = dependencies.isSatisfied({
      kind: operation.kind,
      localSubjectId: operation.localSubjectId,
      operation: operation.operation,
      expectedTelegramUserId: operation.expectedTelegramUserId,
    });
    if (!satisfied) return operation;
    const timestamp = now().toISOString();
    operation.state = "ready";
    operation.readyAt = timestamp;
    operation.failedAt = null;
    operation.lastErrorCode = null;
    operation.updatedAt = timestamp;
    return operation;
  };

  const run = async (key: string, generation: number) => {
    for (let index = 0; index < retryDelaysMs.length; index += 1) {
      if (generations.get(key) !== generation) return;
      const operation = operations.get(key);
      if (!operation || operation.generation !== generation) return;
      const delayMs = Math.max(0, Number(retryDelaysMs[index] || 0));
      if (delayMs > 0) await sleep(delayMs);
      if (generations.get(key) !== generation) return;

      operation.attempts = index + 1;
      operation.updatedAt = now().toISOString();
      try {
        await dependencies.reconcile();
      } catch (error: any) {
        operation.lastErrorCode = String(error?.code || "MINIAPP_IDENTITY_SYNC_RECONCILIATION_FAILED");
      }
      if (generations.get(key) !== generation) return;
      refreshReadyState(operation);
      if (operation.state === "ready") return;
      operation.lastErrorCode = dependencies.getLastErrorCode?.({ kind: operation.kind, localSubjectId: operation.localSubjectId, operation: operation.operation, expectedTelegramUserId: operation.expectedTelegramUserId }) || operation.lastErrorCode || "MINIAPP_IDENTITY_SYNC_PENDING";
      operation.updatedAt = now().toISOString();
    }

    if (generations.get(key) !== generation) return;
    const operation = operations.get(key);
    if (!operation || operation.generation !== generation) return;
    refreshReadyState(operation);
    if (operation.state === "ready") return;
    const timestamp = now().toISOString();
    operation.state = "failed";
    operation.failedAt = timestamp;
    operation.updatedAt = timestamp;
    operation.lastErrorCode = dependencies.getLastErrorCode?.({ kind: operation.kind, localSubjectId: operation.localSubjectId, operation: operation.operation, expectedTelegramUserId: operation.expectedTelegramUserId }) || operation.lastErrorCode || "MINIAPP_IDENTITY_SYNC_RETRY_EXHAUSTED";
  };

  return {
    request: (target: MiniAppIdentitySyncTarget): MiniAppIdentitySyncStatus => {
      const localSubjectId = Number(target.localSubjectId);
      if (!Number.isSafeInteger(localSubjectId) || localSubjectId <= 0) throw new Error("MINIAPP_IDENTITY_SYNC_SUBJECT_INVALID");
      if (target.operation === "link" && !target.expectedTelegramUserId) throw new Error("MINIAPP_IDENTITY_SYNC_TELEGRAM_ID_REQUIRED");
      const key = keyFor(target.kind, localSubjectId);
      if (!operations.has(key)) pruneTrackedOperations();
      const generation = (generations.get(key) || 0) + 1;
      generations.set(key, generation);
      const timestamp = now().toISOString();
      const operation: InternalOperation = {
        operationId: randomId(),
        kind: target.kind,
        localSubjectId,
        operation: target.operation,
        expectedTelegramUserId: target.expectedTelegramUserId,
        state: "pending",
        attempts: 0,
        maxAttempts: retryDelaysMs.length,
        requestedAt: timestamp,
        updatedAt: timestamp,
        readyAt: null,
        failedAt: null,
        lastErrorCode: null,
        generation,
      };
      operations.set(key, operation);
      const requested = publicStatus(operation);
      // Identity persistence already succeeded before this call. Synchronization is
      // deliberately background-only so Cloud/Edge issues never roll back the link.
      queueMicrotask(() => { void run(key, generation); });
      return requested;
    },

    getStatus: (kind: MiniAppIdentitySyncKind, localSubjectId: number): MiniAppIdentitySyncStatus | null => {
      const operation = operations.get(keyFor(kind, Number(localSubjectId)));
      if (!operation) return null;
      refreshReadyState(operation);
      return publicStatus(operation);
    },

    getAllStatuses: (): MiniAppIdentitySyncStatus[] => [...operations.values()].map((operation) => {
      refreshReadyState(operation);
      return publicStatus(operation);
    }),
  };
};
