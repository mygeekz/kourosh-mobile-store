import type { MiniAppSnapshotCandidateV1 } from "./miniAppSnapshotContracts";
import { ensureConnectorCredential } from "../connectorCredentialStore";
import { assertValidMiniAppSnapshotCandidate } from "./miniAppSnapshotValidation";
import {
  MINIAPP_SNAPSHOT_SYNC_MAX_RESPONSE_BYTES,
  MINIAPP_SNAPSHOT_SYNC_PATH,
  createSignedMiniAppSnapshotSyncRequest,
} from "./miniAppSnapshotSyncProtocol";

export type MiniAppSnapshotSyncResult = {
  ok: boolean;
  status: number;
  code: string;
  attempts: number;
  data?: Record<string, unknown>;
};

type ClientLogger = (event: string, meta?: Record<string, unknown>) => void;
type SyncFetch = typeof fetch;

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

const safeMeta = (meta: Record<string, unknown> = {}) => Object.fromEntries(
  Object.entries(meta)
    .filter(([key]) => !/(signature|body|token|secret|credential|telegram|subjectkey|authorization)/i.test(key))
    .map(([key, value]) => [key, typeof value === "string" ? value.slice(0, 160) : value]),
);

const isLoopback = (hostname: string) => ["127.0.0.1", "localhost", "::1"].includes(hostname.toLowerCase());

const validateEndpoint = (raw: string, environment: string): URL => {
  let url: URL;
  try { url = new URL(raw); } catch { throw Object.assign(new Error("Snapshot sync endpoint is invalid."), { code: "MINIAPP_SNAPSHOT_SYNC_ENDPOINT_INVALID" }); }
  const localTest = ["test", "development"].includes(environment) && url.protocol === "http:" && isLoopback(url.hostname);
  if (url.protocol !== "https:" && !localTest) {
    throw Object.assign(new Error("Snapshot sync endpoint requires HTTPS outside local test/development."), { code: "MINIAPP_SNAPSHOT_SYNC_ENDPOINT_INSECURE" });
  }
  if (url.username || url.password || url.hash || url.search) {
    throw Object.assign(new Error("Snapshot sync endpoint must not contain credentials, query, or fragment."), { code: "MINIAPP_SNAPSHOT_SYNC_ENDPOINT_INVALID" });
  }
  url.pathname = MINIAPP_SNAPSHOT_SYNC_PATH;
  return url;
};

const readResponseBounded = async (response: Response): Promise<string> => {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MINIAPP_SNAPSHOT_SYNC_MAX_RESPONSE_BYTES) {
        try { await reader.cancel(); } catch {}
        throw Object.assign(new Error("Snapshot sync response is too large."), { code: "MINIAPP_SNAPSHOT_SYNC_RESPONSE_TOO_LARGE" });
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    try { reader.releaseLock(); } catch {}
  }
  return Buffer.concat(chunks).toString("utf8");
};

const retryAfterMs = (value: string | null): number | null => {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.round(seconds * 1000);
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : null;
};

export const createMiniAppSnapshotSyncClient = (options: {
  endpoint: string;
  installationId: string;
  credentialVersion: number;
  signCanonical: (canonical: string) => string;
  environment?: string;
  fetchImpl?: SyncFetch;
  requestTimeoutMs?: number;
  maxAttempts?: number;
  backoffBaseMs?: number;
  backoffMaxMs?: number;
  random?: () => number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => Date;
  logger?: ClientLogger;
}) => {
  const environment = String(options.environment || process.env.NODE_ENV || "production");
  const endpoint = validateEndpoint(options.endpoint, environment);
  const fetchImpl = options.fetchImpl || fetch;
  const requestTimeoutMs = Math.min(30_000, Math.max(500, Number(options.requestTimeoutMs || 8_000)));
  const maxAttempts = Math.min(6, Math.max(1, Number(options.maxAttempts || 5)));
  const backoffBaseMs = Math.max(100, Number(options.backoffBaseMs || 1_000));
  const backoffMaxMs = Math.min(60_000, Math.max(backoffBaseMs, Number(options.backoffMaxMs || 60_000)));
  const random = options.random || Math.random;
  const sleep = options.sleep || ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const now = options.now || (() => new Date());
  const log = (event: string, meta: Record<string, unknown> = {}) => options.logger?.(event, safeMeta(meta));

  const computeBackoff = (attempt: number) => {
    const exponential = Math.min(backoffMaxMs, backoffBaseMs * 2 ** Math.max(0, attempt - 1));
    const jitter = 0.8 + Math.max(0, Math.min(1, random())) * 0.4;
    return Math.min(backoffMaxMs, Math.round(exponential * jitter));
  };

  return {
    syncCandidate: async (candidate: MiniAppSnapshotCandidateV1, input: { botId: string }): Promise<MiniAppSnapshotSyncResult> => {
      assertValidMiniAppSnapshotCandidate(candidate);
      if (candidate.installationId !== options.installationId) {
        throw Object.assign(new Error("Snapshot candidate belongs to another installation."), { code: "MINIAPP_SNAPSHOT_SYNC_INSTALLATION_MISMATCH" });
      }
      let lastStatus = 0;
      let lastCode = "MINIAPP_SNAPSHOT_SYNC_NETWORK_ERROR";
      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        const signed = createSignedMiniAppSnapshotSyncRequest({
          candidate,
          botId: input.botId,
          installationId: options.installationId,
          credentialVersion: options.credentialVersion,
          signCanonical: options.signCanonical,
          now: now(),
        });
        try {
          const response = await fetchImpl(endpoint, {
            method: signed.method,
            headers: signed.headers,
            body: signed.body,
            redirect: "error",
            signal: AbortSignal.timeout(requestTimeoutMs),
          });
          lastStatus = response.status;
          const text = await readResponseBounded(response);
          let payload: any = {};
          try { payload = text ? JSON.parse(text) : {}; } catch {}
          lastCode = String(payload?.code || (response.ok ? "MINIAPP_SNAPSHOT_SYNC_ACCEPTED" : "MINIAPP_SNAPSHOT_SYNC_REJECTED"));
          if (response.ok && payload?.success !== false) {
            log("miniapp_snapshot_sync_succeeded", { installationId: candidate.installationId, tenantId: candidate.tenantId, subjectKind: candidate.subjectKind, snapshotVersion: candidate.snapshotVersion, attempts: attempt });
            return { ok: true, status: response.status, code: lastCode, attempts: attempt, data: payload?.data };
          }
          if (!RETRYABLE_STATUS.has(response.status) || attempt >= maxAttempts) {
            log("miniapp_snapshot_sync_rejected", { installationId: candidate.installationId, tenantId: candidate.tenantId, subjectKind: candidate.subjectKind, snapshotVersion: candidate.snapshotVersion, status: response.status, code: lastCode, attempts: attempt });
            return { ok: false, status: response.status, code: lastCode, attempts: attempt, data: payload?.data };
          }
          const headerDelay = retryAfterMs(response.headers.get("retry-after"));
          const delay = Math.min(backoffMaxMs, headerDelay == null ? computeBackoff(attempt) : Math.max(100, headerDelay));
          log("miniapp_snapshot_sync_retry", { installationId: candidate.installationId, tenantId: candidate.tenantId, subjectKind: candidate.subjectKind, snapshotVersion: candidate.snapshotVersion, status: response.status, code: lastCode, attempts: attempt, delayMs: delay });
          await sleep(delay);
        } catch (error: any) {
          lastStatus = 0;
          lastCode = String(error?.code || (error?.name === "TimeoutError" ? "MINIAPP_SNAPSHOT_SYNC_TIMEOUT" : "MINIAPP_SNAPSHOT_SYNC_NETWORK_ERROR"));
          if (attempt >= maxAttempts) {
            log("miniapp_snapshot_sync_failed", { installationId: candidate.installationId, tenantId: candidate.tenantId, subjectKind: candidate.subjectKind, snapshotVersion: candidate.snapshotVersion, code: lastCode, attempts: attempt });
            return { ok: false, status: lastStatus, code: lastCode, attempts: attempt };
          }
          const delay = computeBackoff(attempt);
          log("miniapp_snapshot_sync_retry", { installationId: candidate.installationId, tenantId: candidate.tenantId, subjectKind: candidate.subjectKind, snapshotVersion: candidate.snapshotVersion, code: lastCode, attempts: attempt, delayMs: delay });
          await sleep(delay);
        }
      }
      return { ok: false, status: lastStatus, code: lastCode, attempts: maxAttempts };
    },
    endpoint: endpoint.toString(),
  };
};

export const createMiniAppSnapshotSyncQueue = (options: {
  syncCandidate: (candidate: MiniAppSnapshotCandidateV1, input: { botId: string }) => Promise<MiniAppSnapshotSyncResult>;
  maxPendingSubjects?: number;
  concurrency?: number;
  logger?: ClientLogger;
}) => {
  const maxPendingSubjects = Math.max(16, Number(options.maxPendingSubjects || 1_000));
  const concurrency = Math.min(4, Math.max(1, Number(options.concurrency || 2)));
  const pending = new Map<string, { candidate: MiniAppSnapshotCandidateV1; botId: string }>();
  let active = 0;
  let scheduled = false;
  const waiters = new Set<() => void>();
  const log = (event: string, meta: Record<string, unknown> = {}) => options.logger?.(event, safeMeta(meta));
  const keyFor = (candidate: MiniAppSnapshotCandidateV1) => `${candidate.tenantId}\u0000${candidate.installationId}\u0000${candidate.subjectKind}\u0000${candidate.localSubjectId}`;

  const notifyIfIdle = () => {
    if (active !== 0 || pending.size !== 0) return;
    for (const resolve of waiters) resolve();
    waiters.clear();
  };

  const pump = () => {
    scheduled = false;
    while (active < concurrency && pending.size) {
      const first = pending.entries().next().value as [string, { candidate: MiniAppSnapshotCandidateV1; botId: string }] | undefined;
      if (!first) break;
      const [key, item] = first;
      pending.delete(key);
      active += 1;
      void options.syncCandidate(item.candidate, { botId: item.botId })
        .then((result) => log(result.ok ? "miniapp_snapshot_queue_synced" : "miniapp_snapshot_queue_failed", {
          installationId: item.candidate.installationId,
          tenantId: item.candidate.tenantId,
          subjectKind: item.candidate.subjectKind,
          snapshotVersion: item.candidate.snapshotVersion,
          result: result.code,
        }))
        .catch((error: any) => log("miniapp_snapshot_queue_failed", {
          installationId: item.candidate.installationId,
          tenantId: item.candidate.tenantId,
          subjectKind: item.candidate.subjectKind,
          snapshotVersion: item.candidate.snapshotVersion,
          result: String(error?.code || "MINIAPP_SNAPSHOT_SYNC_FAILED"),
        }))
        .finally(() => {
          active -= 1;
          schedule();
          notifyIfIdle();
        });
    }
    notifyIfIdle();
  };

  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(pump);
  };

  return {
    enqueue: (candidate: MiniAppSnapshotCandidateV1, input: { botId: string }) => {
      assertValidMiniAppSnapshotCandidate(candidate);
      const key = keyFor(candidate);
      const current = pending.get(key);
      if (current && current.candidate.snapshotVersion > candidate.snapshotVersion) {
        return { accepted: false, status: "older_ignored" as const, pending: pending.size };
      }
      if (!current && pending.size >= maxPendingSubjects) {
        return { accepted: false, status: "queue_full" as const, pending: pending.size };
      }
      pending.set(key, { candidate, botId: input.botId });
      schedule();
      return { accepted: true, status: current ? "coalesced" as const : "queued" as const, pending: pending.size };
    },
    flush: () => active === 0 && pending.size === 0 ? Promise.resolve() : new Promise<void>((resolve) => waiters.add(resolve)),
    getStatus: () => ({ active, pending: pending.size, maxPendingSubjects, concurrency }),
  };
};


export const createMiniAppSnapshotSyncClientFromConnectorCredential = (options: {
  endpoint: string;
  installationId: string;
  credentialVersion: number;
  privateKeyPath?: string;
  environment?: string;
  fetchImpl?: SyncFetch;
  requestTimeoutMs?: number;
  maxAttempts?: number;
  backoffBaseMs?: number;
  backoffMaxMs?: number;
  random?: () => number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => Date;
  logger?: ClientLogger;
}) => {
  const credential = ensureConnectorCredential({ privateKeyPath: options.privateKeyPath, createIfMissing: false });
  if (!credential) {
    throw Object.assign(new Error("Existing Cloud Connector credential is required for snapshot sync."), { code: "MINIAPP_SNAPSHOT_SYNC_CREDENTIAL_UNAVAILABLE" });
  }
  return createMiniAppSnapshotSyncClient({
    ...options,
    signCanonical: credential.signChallenge,
  });
};
