import { createHash, randomUUID } from "node:crypto";
import { MINIAPP_SNAPSHOT_SYNC_HEADERS } from "./miniAppSnapshotSyncProtocol";

export const MINIAPP_DIAGNOSTICS_PROTOCOL_VERSION = 1 as const;
export const MINIAPP_DIAGNOSTICS_PATH = "/cloud/v1/miniapp/diagnostics" as const;
export const MINIAPP_DIAGNOSTICS_MAX_BODY_BYTES = 8 * 1024;
export const MINIAPP_DIAGNOSTICS_MAX_RESPONSE_BYTES = 32 * 1024;

const TELEGRAM_USER_ID = /^[1-9][0-9]{0,19}$/;
const BOT_ID = /^[1-9][0-9]{0,19}$/;
const REQUEST_ID = /^[A-Za-z0-9_-]{16,64}$/;
const SIGNATURE = /^[A-Za-z0-9_-]{80,96}$/;

export type MiniAppDiagnosticsSubjectKind = "customer" | "partner";

export type MiniAppDiagnosticsRequestBodyV1 = {
  protocolVersion: typeof MINIAPP_DIAGNOSTICS_PROTOCOL_VERSION;
  botId: string;
  subjectKind: MiniAppDiagnosticsSubjectKind;
  telegramUserId: string;
};

export const sha256DiagnosticBody = (body: string): string =>
  createHash("sha256").update(body, "utf8").digest("hex");

export const buildMiniAppDiagnosticsCanonicalRequest = (input: {
  installationId: string;
  credentialVersion: number;
  requestId: string;
  timestamp: string;
  bodySha256: string;
}): string => [
  "KOUROSH-MINIAPP-DIAGNOSTICS-V1",
  "POST",
  MINIAPP_DIAGNOSTICS_PATH,
  input.installationId,
  String(input.credentialVersion),
  input.requestId,
  input.timestamp,
  input.bodySha256,
].join("\n");

export const createSignedMiniAppDiagnosticsRequest = (input: {
  installationId: string;
  credentialVersion: number;
  botId: string;
  subjectKind: MiniAppDiagnosticsSubjectKind;
  telegramUserId: string;
  signCanonical: (canonical: string) => string;
  now?: Date;
  requestId?: string;
}) => {
  if (!/^inst_[A-Za-z0-9_-]{24}$/.test(String(input.installationId || ""))) {
    throw Object.assign(new Error("Mini App diagnostic installation id is invalid."), { code: "MINIAPP_DIAGNOSTIC_INSTALLATION_INVALID" });
  }
  if (!Number.isSafeInteger(input.credentialVersion) || input.credentialVersion < 1) {
    throw Object.assign(new Error("Mini App diagnostic credential version is invalid."), { code: "MINIAPP_DIAGNOSTIC_CREDENTIAL_VERSION_INVALID" });
  }
  if (!BOT_ID.test(String(input.botId || ""))) {
    throw Object.assign(new Error("Mini App diagnostic bot id is invalid."), { code: "MINIAPP_DIAGNOSTIC_BOT_ID_INVALID" });
  }
  if (!TELEGRAM_USER_ID.test(String(input.telegramUserId || ""))) {
    throw Object.assign(new Error("Mini App diagnostic Telegram user id is invalid."), { code: "MINIAPP_DIAGNOSTIC_TELEGRAM_ID_INVALID" });
  }
  if (!(["customer", "partner"] as const).includes(input.subjectKind)) {
    throw Object.assign(new Error("Mini App diagnostic subject kind is invalid."), { code: "MINIAPP_DIAGNOSTIC_SUBJECT_INVALID" });
  }
  const requestId = input.requestId || randomUUID();
  if (!REQUEST_ID.test(requestId)) {
    throw Object.assign(new Error("Mini App diagnostic request id is invalid."), { code: "MINIAPP_DIAGNOSTIC_REQUEST_ID_INVALID" });
  }
  const timestamp = (input.now || new Date()).toISOString();
  const payload: MiniAppDiagnosticsRequestBodyV1 = {
    protocolVersion: MINIAPP_DIAGNOSTICS_PROTOCOL_VERSION,
    botId: input.botId,
    subjectKind: input.subjectKind,
    telegramUserId: input.telegramUserId,
  };
  const body = JSON.stringify(payload);
  if (Buffer.byteLength(body, "utf8") > MINIAPP_DIAGNOSTICS_MAX_BODY_BYTES) {
    throw Object.assign(new Error("Mini App diagnostic request is too large."), { code: "MINIAPP_DIAGNOSTIC_BODY_TOO_LARGE" });
  }
  const bodySha256 = sha256DiagnosticBody(body);
  const canonical = buildMiniAppDiagnosticsCanonicalRequest({
    installationId: input.installationId,
    credentialVersion: input.credentialVersion,
    requestId,
    timestamp,
    bodySha256,
  });
  const signature = String(input.signCanonical(canonical) || "");
  if (!SIGNATURE.test(signature)) {
    throw Object.assign(new Error("Mini App diagnostic signature is invalid."), { code: "MINIAPP_DIAGNOSTIC_SIGNATURE_INVALID" });
  }
  return {
    method: "POST" as const,
    path: MINIAPP_DIAGNOSTICS_PATH,
    requestId,
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
    body,
  };
};
