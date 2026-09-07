import type { Request } from "express";

export type MiniAppSecurityEvent =
  | "auth_success"
  | "auth_invalid_init_data"
  | "auth_rate_limited"
  | "auth_unlinked"
  | "session_invalid"
  | "fresh_binding_failed"
  | "staff_role_denied"
  | "capability_denied";

type SecurityLogFields = {
  requestId?: unknown;
  route?: unknown;
  method?: unknown;
  status?: unknown;
  identityKind?: unknown;
  subjectId?: unknown;
  reasonCode?: unknown;
  durationMs?: unknown;
};

const clean = (value: unknown, maxLength: number): string | undefined => {
  const text = String(value ?? "").replace(/[\r\n\u2028\u2029]/g, " ").trim();
  return text ? text.slice(0, maxLength) : undefined;
};

export const miniAppSecurityLog = (
  event: MiniAppSecurityEvent,
  fields: SecurityLogFields,
  sink: (line: string) => void = console.warn,
): void => {
  const subjectId = Number(fields.subjectId);
  const status = Number(fields.status);
  const durationMs = Number(fields.durationMs);
  const record = {
    timestamp: new Date().toISOString(),
    event,
    requestId: clean(fields.requestId, 128),
    route: clean(fields.route, 160),
    method: clean(fields.method, 12),
    status: Number.isInteger(status) ? status : undefined,
    identityKind: ["customer", "partner", "staff"].includes(String(fields.identityKind)) ? String(fields.identityKind) : undefined,
    subjectId: Number.isInteger(subjectId) && subjectId > 0 ? subjectId : undefined,
    reasonCode: clean(fields.reasonCode, 80),
    durationMs: Number.isFinite(durationMs) ? Math.max(0, Math.round(durationMs)) : undefined,
  };
  sink(JSON.stringify(Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined))));
};

export const miniAppSecurityFieldsFromRequest = (
  req: Pick<Request, "method" | "originalUrl" | "miniAppIdentity">,
  requestId: unknown,
  status: number,
  reasonCode: string,
  startedAt?: number,
): SecurityLogFields => ({
  requestId,
  route: String(req.originalUrl || "").split("?", 1)[0],
  method: req.method,
  status,
  identityKind: req.miniAppIdentity?.kind,
  subjectId: req.miniAppIdentity?.subjectId,
  reasonCode,
  durationMs: startedAt ? Date.now() - startedAt : undefined,
});
