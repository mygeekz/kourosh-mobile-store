import { getLocalTenantIdentity } from "../connectivity/localTenantIdentity";
import { runAsync } from "../db/query";

export type ManagementAuditActor = {
  id?: number | null;
  username?: string | null;
  roleName?: string | null;
};

export type ManagementAuditInput = {
  actor?: ManagementAuditActor | null;
  action: string;
  entityType: string;
  entityId?: number | null;
  description?: string | null;
  source?: string | null;
  requestId?: string | null;
  before?: unknown;
  after?: unknown;
  metadata?: unknown;
};

const SECRET_KEY = /(password|passcode|token|secret|authorization|cookie|telegram_bot_token|botToken|api[_-]?key)/i;
const MAX_JSON_LENGTH = 24_000;

const sanitize = (value: unknown, depth = 0): unknown => {
  if (depth > 8) return "[max-depth]";
  if (Array.isArray(value)) return value.slice(0, 200).map((item) => sanitize(item, depth + 1));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>).slice(0, 200)) {
      out[key] = SECRET_KEY.test(key) ? "[REDACTED]" : sanitize(item, depth + 1);
    }
    return out;
  }
  if (typeof value === "string" && value.length > 4_000) return `${value.slice(0, 4_000)}…`;
  return value;
};

const json = (value: unknown): string | null => {
  if (value === undefined) return null;
  try {
    const serialized = JSON.stringify(sanitize(value));
    return serialized.length <= MAX_JSON_LENGTH ? serialized : `${serialized.slice(0, MAX_JSON_LENGTH)}…`;
  } catch {
    return JSON.stringify({ serializationError: true });
  }
};

export const addManagementAuditLog = async (input: ManagementAuditInput): Promise<void> => {
  const { tenantId } = await getLocalTenantIdentity();
  const actor = input.actor || null;
  await runAsync(
    `INSERT INTO audit_logs(
       userId,username,role,action,entityType,entityId,description,tenantId,source,requestId,beforeJson,afterJson,metadataJson
     ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      actor?.id ?? null,
      actor?.username ?? null,
      actor?.roleName ?? null,
      input.action,
      input.entityType,
      input.entityId ?? null,
      input.description ?? null,
      tenantId,
      input.source || "management",
      input.requestId ?? null,
      json(input.before),
      json(input.after),
      json(input.metadata),
    ],
  );
};
