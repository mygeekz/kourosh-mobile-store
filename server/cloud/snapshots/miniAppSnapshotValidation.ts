import { createHash } from "node:crypto";
import { isValidInstallationId } from "../../connectivity/installationIdentity";
import {
  MINIAPP_SNAPSHOT_AUTHORIZATION_LEASE_MS,
  MINIAPP_SNAPSHOT_MAX_BYTES,
  MINIAPP_SNAPSHOT_SCHEMA_VERSION,
  type MiniAppSnapshotCandidateV1,
  type MiniAppStoredSnapshotV1,
} from "./miniAppSnapshotContracts";

export type MiniAppSnapshotValidationResult = {
  ok: boolean;
  issues: string[];
  encodedBytes: number;
};

// Log only known issue codes. Forbidden-key paths can contain record identifiers
// or arbitrary property names, so omit paths and all candidate values.
const LOGGABLE_CANDIDATE_ISSUES = new Set([
  "snapshot_candidate_object_required", "schema_version_invalid", "tenant_id_invalid",
  "installation_id_invalid", "subject_kind_invalid", "snapshot_version_invalid",
  "generated_at_invalid", "authorization_valid_until_invalid", "authorization_lease_invalid",
  "authorization_lease_exceeds_maximum", "manager_authorization_lease_exceeds_maximum",
  "state_invalid", "active_snapshot_data_required", "revoked_snapshot_data_must_be_null",
  "forbidden_data_key", "manager_read_permissions_invalid", "manager_profit_permission_required",
  "local_subject_id_invalid", "telegram_user_id_invalid", "candidate_contains_storage_fields",
  "snapshot_size_limit_exceeded",
]);

export const sanitizeMiniAppSnapshotValidationIssues = (issues: unknown): string[] => {
  if (!Array.isArray(issues)) return [];
  return [...new Set(issues.filter((issue): issue is string => typeof issue === "string")
    .map((issue) => issue.startsWith("forbidden_data_key:") ? "forbidden_data_key" : issue)
    .filter((issue) => LOGGABLE_CANDIDATE_ISSUES.has(issue)))];
};

const FORBIDDEN_DATA_KEYS = new Set([
  "password",
  "passwordHash",
  "password_hash",
  "botToken",
  "bot_token",
  "initData",
  "init_data",
  "sessionToken",
  "session_token",
  "privateKey",
  "private_key",
  "relayCredential",
  "relayCredentials",
  "proxyCredential",
  "proxyCredentials",
  "purchasePrice",
  "purchase_price",
  "currentPurchasePrice",
  "current_purchase_price",
  "internalProfit",
  "internal_profit",
  "phoneNumber",
  "phone_number",
  "email",
  "contactName",
  "contact_name",
  "telegramUserId",
  "telegram_user_id",
  "localSubjectId",
  "local_subject_id",
]);

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const MANAGER_PROFIT_KEYS = new Set([
  "grossProfit", "gross_profit", "todayGrossProfit", "profitShareAccrued", "sharedProfitAccrued",
  "ownerGainAccrued", "explicitProfitLedger", "totalProfitAmount",
]);

const containsManagerProfitData = (value: unknown): boolean => {
  if (Array.isArray(value)) return value.some(containsManagerProfitData);
  if (!isPlainObject(value)) return false;
  for (const [key, child] of Object.entries(value)) {
    if (MANAGER_PROFIT_KEYS.has(key) || containsManagerProfitData(child)) return true;
  }
  return false;
};

const isIsoDateTime = (value: unknown): value is string => {
  if (typeof value !== "string" || !value.trim()) return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
};

export const isValidSnapshotTenantId = (value: unknown): value is string =>
  typeof value === "string"
  && value.length >= 3
  && value.length <= 128
  && /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value);

export const isValidSnapshotSubjectKey = (value: unknown): value is string =>
  typeof value === "string" && /^sub_[A-Za-z0-9_-]{32,128}$/.test(value);

export const isValidTelegramUserIdForSnapshotSync = (value: unknown): value is string =>
  typeof value === "string" && /^[1-9][0-9]{0,19}$/.test(value);

const encodedBytes = (value: unknown): number => Buffer.byteLength(JSON.stringify(value), "utf8");

const scanForbiddenDataKeys = (value: unknown, path: string, issues: string[]): void => {
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanForbiddenDataKeys(item, `${path}[${index}]`, issues));
    return;
  }
  if (!isPlainObject(value)) return;
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_DATA_KEYS.has(key)) issues.push(`forbidden_data_key:${path}.${key}`);
    scanForbiddenDataKeys(child, `${path}.${key}`, issues);
  }
};

const validateCommon = (
  value: Record<string, unknown>,
  issues: string[],
  options: { stored: boolean },
): void => {
  if (value.schemaVersion !== MINIAPP_SNAPSHOT_SCHEMA_VERSION) issues.push("schema_version_invalid");
  if (!isValidSnapshotTenantId(value.tenantId)) issues.push("tenant_id_invalid");
  if (!isValidInstallationId(value.installationId)) issues.push("installation_id_invalid");
  if (!["customer", "partner", "manager"].includes(String(value.subjectKind || ""))) issues.push("subject_kind_invalid");
  if (!Number.isSafeInteger(value.snapshotVersion) || Number(value.snapshotVersion) < 1) issues.push("snapshot_version_invalid");
  if (!isIsoDateTime(value.generatedAt)) issues.push("generated_at_invalid");
  if (!isIsoDateTime(value.authorizationValidUntil)) issues.push("authorization_valid_until_invalid");
  if (isIsoDateTime(value.generatedAt) && isIsoDateTime(value.authorizationValidUntil)) {
    const leaseMs = Date.parse(value.authorizationValidUntil) - Date.parse(value.generatedAt);
    if (leaseMs <= 0) issues.push("authorization_lease_invalid");
    if (leaseMs > MINIAPP_SNAPSHOT_AUTHORIZATION_LEASE_MS) issues.push("authorization_lease_exceeds_maximum");
    if (value.subjectKind === "manager" && leaseMs > 60 * 60 * 1000) issues.push("manager_authorization_lease_exceeds_maximum");
  }
  if (value.state !== "active" && value.state !== "revoked") issues.push("state_invalid");
  if (value.state === "active" && !isPlainObject(value.data)) issues.push("active_snapshot_data_required");
  if (value.state === "revoked" && value.data !== null) issues.push("revoked_snapshot_data_must_be_null");
  if (isPlainObject(value.data)) {
    scanForbiddenDataKeys(value.data, "data", issues);
    const permissions = Array.isArray((value.data as Record<string, unknown>).permissions)
      ? ((value.data as Record<string, unknown>).permissions as unknown[]).map(String)
      : [];
    if (value.subjectKind === "manager") {
      if (!permissions.length || permissions.some((permission) => !permission.endsWith(".read"))) issues.push("manager_read_permissions_invalid");
      if (containsManagerProfitData(value.data) && !permissions.includes("profits.read")) issues.push("manager_profit_permission_required");
    } else if (containsManagerProfitData(value.data)) {
      issues.push("manager_profit_permission_required");
    }
  }

  if (options.stored) {
    if (!isValidSnapshotSubjectKey(value.subjectKey)) issues.push("subject_key_invalid");
    if (!isIsoDateTime(value.receivedAt)) issues.push("received_at_invalid");
    if (typeof value.contentHash !== "string" || !/^[a-f0-9]{64}$/.test(value.contentHash)) issues.push("content_hash_invalid");
    if ("telegramUserId" in value || "localSubjectId" in value) issues.push("stored_snapshot_contains_local_identity");
  } else {
    if (!Number.isSafeInteger(value.localSubjectId) || Number(value.localSubjectId) < 1) issues.push("local_subject_id_invalid");
    if (!isValidTelegramUserIdForSnapshotSync(value.telegramUserId)) issues.push("telegram_user_id_invalid");
    if ("subjectKey" in value || "receivedAt" in value || "contentHash" in value) issues.push("candidate_contains_storage_fields");
  }
};

const withSizeCheck = (value: unknown, issues: string[]): number => {
  const bytes = encodedBytes(value);
  if (bytes > MINIAPP_SNAPSHOT_MAX_BYTES) issues.push("snapshot_size_limit_exceeded");
  return bytes;
};

export const validateMiniAppSnapshotCandidate = (value: unknown): MiniAppSnapshotValidationResult => {
  const issues: string[] = [];
  if (!isPlainObject(value)) return { ok: false, issues: ["snapshot_candidate_object_required"], encodedBytes: 0 };
  validateCommon(value, issues, { stored: false });
  const bytes = withSizeCheck(value, issues);
  return { ok: issues.length === 0, issues, encodedBytes: bytes };
};

export const validateStoredMiniAppSnapshot = (value: unknown): MiniAppSnapshotValidationResult => {
  const issues: string[] = [];
  if (!isPlainObject(value)) return { ok: false, issues: ["stored_snapshot_object_required"], encodedBytes: 0 };
  validateCommon(value, issues, { stored: true });
  const bytes = withSizeCheck(value, issues);
  if (issues.length === 0) {
    const expected = computeStoredMiniAppSnapshotContentHash(value as unknown as MiniAppStoredSnapshotV1);
    if (expected !== value.contentHash) issues.push("content_hash_mismatch");
  }
  return { ok: issues.length === 0, issues, encodedBytes: bytes };
};

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
};

export const computeStoredMiniAppSnapshotContentHash = (
  snapshot: Omit<MiniAppStoredSnapshotV1, "contentHash"> | MiniAppStoredSnapshotV1,
): string => {
  const { contentHash: _ignored, receivedAt: _receiptTime, ...hashable } = snapshot as MiniAppStoredSnapshotV1;
  return createHash("sha256").update(JSON.stringify(canonicalize(hashable)), "utf8").digest("hex");
};

export const assertValidMiniAppSnapshotCandidate = <T extends MiniAppSnapshotCandidateV1>(value: T): T => {
  const result = validateMiniAppSnapshotCandidate(value);
  if (!result.ok) throw Object.assign(new Error(`MINIAPP_SNAPSHOT_CANDIDATE_INVALID:${result.issues.join(",")}`), {
    code: "MINIAPP_SNAPSHOT_CANDIDATE_INVALID",
    issues: result.issues,
  });
  return value;
};

export const assertValidStoredMiniAppSnapshot = <T extends MiniAppStoredSnapshotV1>(value: T): T => {
  const result = validateStoredMiniAppSnapshot(value);
  if (!result.ok) throw Object.assign(new Error(`MINIAPP_STORED_SNAPSHOT_INVALID:${result.issues.join(",")}`), {
    code: "MINIAPP_STORED_SNAPSHOT_INVALID",
    issues: result.issues,
  });
  return value;
};
