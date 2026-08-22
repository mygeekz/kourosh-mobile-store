import type { MiniAppSnapshotCandidateV1 } from "./miniAppSnapshotContracts";
import { materializeStoredMiniAppSnapshot } from "./miniAppSnapshotBuilder";
import { assertValidMiniAppSnapshotCandidate } from "./miniAppSnapshotValidation";
import type { InMemoryMiniAppSnapshotUpsertResult } from "./inMemoryMiniAppSnapshotStore";
import {
  MINIAPP_SNAPSHOT_SYNC_CLOCK_SKEW_MS,
  MINIAPP_SNAPSHOT_SYNC_MAX_BODY_BYTES,
  MINIAPP_SNAPSHOT_SYNC_PATH,
  MINIAPP_SNAPSHOT_SYNC_PROTOCOL_VERSION,
  buildMiniAppSnapshotSyncCanonicalRequest,
  deriveMiniAppSnapshotSubjectKey,
  isValidMiniAppSnapshotSyncBotId,
  parseMiniAppSnapshotSyncHeaders,
  sha256Hex,
  verifyMiniAppSnapshotSyncSignature,
  type MiniAppSnapshotSyncBodyV1,
} from "./miniAppSnapshotSyncProtocol";

export type MiniAppSnapshotSyncInstallationAuthorization = {
  installationId: string;
  tenantId: string;
  publicKeyPem: string;
  credentialVersion: number;
  status: "active" | "suspended" | "revoked";
  allowedBotIds: string[];
};

export type MiniAppSnapshotSyncReceiverResponse = {
  status: number;
  headers: Record<string, string>;
  body: { success: boolean; code: string; data?: Record<string, unknown> };
};

type ReplayGuard = { consume: (installationId: string, requestId: string) => "accepted" | "replay" | "capacity_rejected" };
type SnapshotStore = { upsert: (snapshot: ReturnType<typeof materializeStoredMiniAppSnapshot>) => InMemoryMiniAppSnapshotUpsertResult };

type ReceiverLogger = (event: string, meta?: Record<string, unknown>) => void;

const safeMeta = (meta: Record<string, unknown> = {}) => Object.fromEntries(
  Object.entries(meta)
    .filter(([key]) => !/(signature|body|token|secret|credential|telegram|subjectkey|authorization)/i.test(key))
    .map(([key, value]) => [key, typeof value === "string" ? value.slice(0, 160) : value]),
);

const response = (status: number, code: string, data?: Record<string, unknown>): MiniAppSnapshotSyncReceiverResponse => ({
  status,
  headers: { "content-type": "application/json", "cache-control": "no-store" },
  body: { success: status >= 200 && status < 300, code, ...(data ? { data } : {}) },
});

const lowerHeaders = (headers: Record<string, string | string[] | undefined>): Record<string, string | undefined> =>
  Object.fromEntries(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), Array.isArray(value) ? value[0] : value]));

export const createMiniAppSnapshotSyncReceiver = (options: {
  authorizeInstallation: (installationId: string) => Promise<MiniAppSnapshotSyncInstallationAuthorization | null> | MiniAppSnapshotSyncInstallationAuthorization | null;
  subjectKeySecret: string | Buffer;
  replayGuard: ReplayGuard;
  snapshotStore: SnapshotStore;
  now?: () => Date;
  logger?: ReceiverLogger;
}) => ({
  handle: async (request: {
    method: string;
    path: string;
    headers: Record<string, string | string[] | undefined>;
    body: string;
  }): Promise<MiniAppSnapshotSyncReceiverResponse> => {
    const now = options.now || (() => new Date());
    const log = (event: string, meta: Record<string, unknown> = {}) => options.logger?.(event, safeMeta(meta));

    if (String(request.method || "").toUpperCase() !== "POST" || request.path !== MINIAPP_SNAPSHOT_SYNC_PATH) {
      return response(404, "MINIAPP_SNAPSHOT_SYNC_ROUTE_NOT_FOUND");
    }
    if (Buffer.byteLength(request.body || "", "utf8") > MINIAPP_SNAPSHOT_SYNC_MAX_BODY_BYTES) {
      return response(413, "MINIAPP_SNAPSHOT_SYNC_BODY_TOO_LARGE");
    }
    const headers = lowerHeaders(request.headers);
    const parsedHeaders = parseMiniAppSnapshotSyncHeaders(headers);
    if (!parsedHeaders.validShape) return response(401, "MINIAPP_SNAPSHOT_SYNC_AUTH_HEADERS_INVALID");

    const requestTime = Date.parse(parsedHeaders.timestamp);
    if (Math.abs(now().getTime() - requestTime) > MINIAPP_SNAPSHOT_SYNC_CLOCK_SKEW_MS) {
      return response(401, "MINIAPP_SNAPSHOT_SYNC_TIMESTAMP_INVALID");
    }
    if (sha256Hex(request.body || "") !== parsedHeaders.bodySha256) {
      return response(401, "MINIAPP_SNAPSHOT_SYNC_BODY_HASH_MISMATCH");
    }

    const authorization = await options.authorizeInstallation(parsedHeaders.installationId);
    if (!authorization || authorization.installationId !== parsedHeaders.installationId) {
      return response(401, "MINIAPP_SNAPSHOT_SYNC_INSTALLATION_UNKNOWN");
    }
    if (authorization.status !== "active") return response(403, "MINIAPP_SNAPSHOT_SYNC_INSTALLATION_INACTIVE");
    if (authorization.credentialVersion !== parsedHeaders.credentialVersion) {
      return response(401, "MINIAPP_SNAPSHOT_SYNC_CREDENTIAL_VERSION_MISMATCH");
    }

    const canonical = buildMiniAppSnapshotSyncCanonicalRequest({
      method: "POST",
      path: MINIAPP_SNAPSHOT_SYNC_PATH,
      installationId: parsedHeaders.installationId,
      credentialVersion: parsedHeaders.credentialVersion,
      requestId: parsedHeaders.requestId,
      timestamp: parsedHeaders.timestamp,
      bodySha256: parsedHeaders.bodySha256,
    });
    if (!verifyMiniAppSnapshotSyncSignature({ publicKeyPem: authorization.publicKeyPem, canonical, signature: parsedHeaders.signature })) {
      return response(401, "MINIAPP_SNAPSHOT_SYNC_SIGNATURE_INVALID");
    }

    const replay = options.replayGuard.consume(parsedHeaders.installationId, parsedHeaders.requestId);
    if (replay === "replay") return response(409, "MINIAPP_SNAPSHOT_SYNC_REPLAY_REJECTED");
    if (replay === "capacity_rejected") return response(503, "MINIAPP_SNAPSHOT_SYNC_REPLAY_GUARD_BUSY");

    let body: MiniAppSnapshotSyncBodyV1;
    try { body = JSON.parse(request.body) as MiniAppSnapshotSyncBodyV1; } catch { return response(400, "MINIAPP_SNAPSHOT_SYNC_JSON_INVALID"); }
    if (body?.protocolVersion !== MINIAPP_SNAPSHOT_SYNC_PROTOCOL_VERSION || !isValidMiniAppSnapshotSyncBotId(body?.botId)) {
      return response(400, "MINIAPP_SNAPSHOT_SYNC_PROTOCOL_INVALID");
    }
    if (!authorization.allowedBotIds.includes(body.botId)) return response(403, "MINIAPP_SNAPSHOT_SYNC_BOT_NOT_ALLOWED");

    let candidate: MiniAppSnapshotCandidateV1;
    try { candidate = assertValidMiniAppSnapshotCandidate(body.candidate); } catch { return response(400, "MINIAPP_SNAPSHOT_SYNC_CANDIDATE_INVALID"); }
    if (candidate.installationId !== parsedHeaders.installationId) return response(403, "MINIAPP_SNAPSHOT_SYNC_INSTALLATION_MISMATCH");
    if (candidate.tenantId !== authorization.tenantId) return response(403, "MINIAPP_SNAPSHOT_SYNC_TENANT_MISMATCH");

    const subjectKey = deriveMiniAppSnapshotSubjectKey({
      secret: options.subjectKeySecret,
      tenantId: authorization.tenantId,
      botId: body.botId,
      telegramUserId: candidate.telegramUserId,
    });
    const stored = materializeStoredMiniAppSnapshot(candidate, { subjectKey, receivedAt: now() });
    const result = options.snapshotStore.upsert(stored);
    log("miniapp_snapshot_sync_received", {
      installationId: candidate.installationId,
      tenantId: candidate.tenantId,
      subjectKind: candidate.subjectKind,
      snapshotVersion: candidate.snapshotVersion,
      result: result.status,
    });

    if (result.status === "inserted" || result.status === "updated" || result.status === "idempotent") {
      return response(200, "MINIAPP_SNAPSHOT_SYNC_ACCEPTED", {
        result: result.status,
        snapshotVersion: candidate.snapshotVersion,
        state: candidate.state,
      });
    }
    if (result.status === "stale_rejected") return response(409, "MINIAPP_SNAPSHOT_SYNC_STALE_REJECTED");
    if (result.status === "version_conflict_rejected") return response(409, "MINIAPP_SNAPSHOT_SYNC_VERSION_CONFLICT");
    return response(409, "MINIAPP_SNAPSHOT_SYNC_INSTALLATION_CONFLICT");
  },
});
