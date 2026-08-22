import { createHash, createHmac, createPublicKey, randomUUID, verify } from "node:crypto";
import type { MiniAppSnapshotCandidateV1 } from "./miniAppSnapshotContracts";
import { assertValidMiniAppSnapshotCandidate, isValidSnapshotTenantId } from "./miniAppSnapshotValidation";

export const MINIAPP_SNAPSHOT_SYNC_PROTOCOL_VERSION = 1 as const;
export const MINIAPP_SNAPSHOT_SYNC_PATH = "/cloud/v1/miniapp/snapshots" as const;
export const MINIAPP_SNAPSHOT_SYNC_CLOCK_SKEW_MS = 5 * 60 * 1000;
export const MINIAPP_SNAPSHOT_SYNC_REPLAY_TTL_MS = 10 * 60 * 1000;
export const MINIAPP_SNAPSHOT_SYNC_MAX_RESPONSE_BYTES = 64 * 1024;
export const MINIAPP_SNAPSHOT_SYNC_MAX_BODY_BYTES = 544 * 1024;

export const MINIAPP_SNAPSHOT_SYNC_HEADERS = Object.freeze({
  installationId: "x-kourosh-installation-id",
  credentialVersion: "x-kourosh-credential-version",
  requestId: "x-kourosh-request-id",
  timestamp: "x-kourosh-timestamp",
  bodySha256: "x-kourosh-body-sha256",
  signature: "x-kourosh-signature",
});

const REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const SIGNATURE_PATTERN = /^[A-Za-z0-9_-]{80,96}$/;
const BOT_ID_PATTERN = /^[1-9][0-9]{0,19}$/;

export type MiniAppSnapshotSyncBodyV1 = {
  protocolVersion: typeof MINIAPP_SNAPSHOT_SYNC_PROTOCOL_VERSION;
  botId: string;
  candidate: MiniAppSnapshotCandidateV1;
};

export type MiniAppSnapshotSignedRequest = {
  method: "POST";
  path: typeof MINIAPP_SNAPSHOT_SYNC_PATH;
  headers: Record<string, string>;
  body: string;
};

export type MiniAppSnapshotSyncCanonicalInput = {
  method: string;
  path: string;
  installationId: string;
  credentialVersion: number;
  requestId: string;
  timestamp: string;
  bodySha256: string;
};

export const isValidMiniAppSnapshotSyncBotId = (value: unknown): value is string =>
  typeof value === "string" && BOT_ID_PATTERN.test(value);

export const isValidMiniAppSnapshotSyncRequestId = (value: unknown): value is string =>
  typeof value === "string" && REQUEST_ID_PATTERN.test(value);

export const sha256Hex = (value: string | Buffer): string =>
  createHash("sha256").update(value).digest("hex");

export const buildMiniAppSnapshotSyncCanonicalRequest = (input: MiniAppSnapshotSyncCanonicalInput): string =>
  [
    "KOUROSH-MINIAPP-SNAPSHOT-SYNC-V1",
    String(input.method || "").toUpperCase(),
    input.path,
    input.installationId,
    String(input.credentialVersion),
    input.requestId,
    input.timestamp,
    input.bodySha256,
  ].join("\n");

export const createSignedMiniAppSnapshotSyncRequest = (input: {
  candidate: MiniAppSnapshotCandidateV1;
  botId: string;
  installationId: string;
  credentialVersion: number;
  signCanonical: (canonical: string) => string;
  now?: Date;
  requestId?: string;
}): MiniAppSnapshotSignedRequest => {
  assertValidMiniAppSnapshotCandidate(input.candidate);
  if (input.candidate.installationId !== input.installationId) {
    throw Object.assign(new Error("Snapshot candidate installation does not match signer."), { code: "MINIAPP_SNAPSHOT_SYNC_INSTALLATION_MISMATCH" });
  }
  if (!isValidMiniAppSnapshotSyncBotId(input.botId)) {
    throw Object.assign(new Error("Telegram Bot id is invalid for snapshot sync."), { code: "MINIAPP_SNAPSHOT_SYNC_BOT_ID_INVALID" });
  }
  if (!Number.isSafeInteger(input.credentialVersion) || input.credentialVersion < 1) {
    throw Object.assign(new Error("Connector credential version is invalid."), { code: "MINIAPP_SNAPSHOT_SYNC_CREDENTIAL_VERSION_INVALID" });
  }
  const requestId = input.requestId || randomUUID();
  if (!isValidMiniAppSnapshotSyncRequestId(requestId)) {
    throw Object.assign(new Error("Snapshot sync request id is invalid."), { code: "MINIAPP_SNAPSHOT_SYNC_REQUEST_ID_INVALID" });
  }
  const timestamp = (input.now || new Date()).toISOString();
  const body: MiniAppSnapshotSyncBodyV1 = {
    protocolVersion: MINIAPP_SNAPSHOT_SYNC_PROTOCOL_VERSION,
    botId: input.botId,
    candidate: input.candidate,
  };
  const encodedBody = JSON.stringify(body);
  if (Buffer.byteLength(encodedBody, "utf8") > MINIAPP_SNAPSHOT_SYNC_MAX_BODY_BYTES) {
    throw Object.assign(new Error("Snapshot sync request exceeds protocol size limit."), { code: "MINIAPP_SNAPSHOT_SYNC_BODY_TOO_LARGE" });
  }
  const bodySha256 = sha256Hex(encodedBody);
  const canonical = buildMiniAppSnapshotSyncCanonicalRequest({
    method: "POST",
    path: MINIAPP_SNAPSHOT_SYNC_PATH,
    installationId: input.installationId,
    credentialVersion: input.credentialVersion,
    requestId,
    timestamp,
    bodySha256,
  });
  const signature = input.signCanonical(canonical);
  if (!SIGNATURE_PATTERN.test(signature)) {
    throw Object.assign(new Error("Snapshot sync signature has invalid encoding."), { code: "MINIAPP_SNAPSHOT_SYNC_SIGNATURE_INVALID" });
  }
  return {
    method: "POST",
    path: MINIAPP_SNAPSHOT_SYNC_PATH,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
      [MINIAPP_SNAPSHOT_SYNC_HEADERS.installationId]: input.installationId,
      [MINIAPP_SNAPSHOT_SYNC_HEADERS.credentialVersion]: String(input.credentialVersion),
      [MINIAPP_SNAPSHOT_SYNC_HEADERS.requestId]: requestId,
      [MINIAPP_SNAPSHOT_SYNC_HEADERS.timestamp]: timestamp,
      [MINIAPP_SNAPSHOT_SYNC_HEADERS.bodySha256]: bodySha256,
      [MINIAPP_SNAPSHOT_SYNC_HEADERS.signature]: signature,
    },
    body: encodedBody,
  };
};

export const verifyMiniAppSnapshotSyncSignature = (input: {
  publicKeyPem: string;
  canonical: string;
  signature: string;
}): boolean => {
  if (!SIGNATURE_PATTERN.test(input.signature)) return false;
  try {
    const publicKey = createPublicKey(input.publicKeyPem);
    if (publicKey.asymmetricKeyType !== "ed25519") return false;
    return verify(null, Buffer.from(input.canonical, "utf8"), publicKey, Buffer.from(input.signature, "base64url"));
  } catch {
    return false;
  }
};

export const deriveMiniAppSnapshotSubjectKey = (input: {
  secret: string | Buffer;
  tenantId: string;
  botId: string;
  telegramUserId: string;
}): string => {
  if (!isValidSnapshotTenantId(input.tenantId) || !isValidMiniAppSnapshotSyncBotId(input.botId) || !/^[1-9][0-9]{0,19}$/.test(input.telegramUserId)) {
    throw Object.assign(new Error("Snapshot subject-key inputs are invalid."), { code: "MINIAPP_SNAPSHOT_SUBJECT_KEY_INPUT_INVALID" });
  }
  const secret = Buffer.isBuffer(input.secret) ? input.secret : Buffer.from(input.secret, "utf8");
  if (secret.length < 32) {
    throw Object.assign(new Error("Snapshot subject-key secret must contain at least 256 bits."), { code: "MINIAPP_SNAPSHOT_SUBJECT_KEY_SECRET_WEAK" });
  }
  const digest = createHmac("sha256", secret)
    .update(`${input.tenantId}\n${input.botId}\n${input.telegramUserId}`, "utf8")
    .digest("base64url");
  return `sub_${digest}`;
};

export const parseMiniAppSnapshotSyncHeaders = (headers: Record<string, string | undefined>) => {
  const installationId = String(headers[MINIAPP_SNAPSHOT_SYNC_HEADERS.installationId] || "").trim();
  const credentialVersionRaw = String(headers[MINIAPP_SNAPSHOT_SYNC_HEADERS.credentialVersion] || "").trim();
  const requestId = String(headers[MINIAPP_SNAPSHOT_SYNC_HEADERS.requestId] || "").trim();
  const timestamp = String(headers[MINIAPP_SNAPSHOT_SYNC_HEADERS.timestamp] || "").trim();
  const bodySha256 = String(headers[MINIAPP_SNAPSHOT_SYNC_HEADERS.bodySha256] || "").trim().toLowerCase();
  const signature = String(headers[MINIAPP_SNAPSHOT_SYNC_HEADERS.signature] || "").trim();
  const credentialVersion = Number(credentialVersionRaw);
  return {
    installationId,
    credentialVersion,
    requestId,
    timestamp,
    bodySha256,
    signature,
    validShape: Boolean(
      /^inst_[A-Za-z0-9_-]{24}$/.test(installationId)
      && Number.isSafeInteger(credentialVersion) && credentialVersion >= 1
      && REQUEST_ID_PATTERN.test(requestId)
      && Number.isFinite(Date.parse(timestamp)) && new Date(Date.parse(timestamp)).toISOString() === timestamp
      && SHA256_PATTERN.test(bodySha256)
      && SIGNATURE_PATTERN.test(signature)
    ),
  };
};
