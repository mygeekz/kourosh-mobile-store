import crypto from "crypto";
import type { Request, RequestHandler } from "express";
import { miniAppSecurityFieldsFromRequest, miniAppSecurityLog } from "../security/miniAppSecurityLogger";

export const MINIAPP_SESSION_DURATION_MS = 4 * 60 * 60 * 1000;
export const STAFF_MINIAPP_SESSION_DURATION_MS = 30 * 60 * 1000;

export type MiniAppIdentityKind = "customer" | "partner" | "staff";
export type MiniAppIdentity = {
  kind: MiniAppIdentityKind;
  subjectId: number;
  displayName: string;
  telegramUserId: string;
  roleName?: "Admin" | "Manager";
  capabilities: string[];
};

export type MiniAppSession = { identity: MiniAppIdentity; createdAt: number; expiresAt: number };
type Clock = () => number;

export interface MiniAppSessionStore {
  create(identity: MiniAppIdentity): { token: string; expiresAt: string };
  get(token: string): MiniAppSession | null;
  revokeToken(token: string): boolean;
  revokeIdentity(kind: MiniAppIdentityKind, subjectId: number): number;
  cleanup(): void;
  size(): number;
}

const digestToken = (token: string): string => crypto.createHash("sha256").update(token).digest("hex");

export const createMiniAppSessionStore = (clock: Clock = Date.now): MiniAppSessionStore & { revokeStaff(userId: number): number } => {
  const sessions = new Map<string, MiniAppSession>();
  const cleanup = () => {
    const now = clock();
    for (const [key, value] of sessions) if (value.expiresAt <= now) sessions.delete(key);
  };
  const create = (identity: MiniAppIdentity) => {
    cleanup();
    if (identity.kind === "staff") {
      for (const [key, value] of sessions) {
        if (value.identity.kind === "staff" && value.identity.subjectId === identity.subjectId && value.identity.telegramUserId === identity.telegramUserId) sessions.delete(key);
      }
    }
    const token = crypto.randomBytes(32).toString("base64url");
    const createdAt = clock();
    const duration = identity.kind === "staff" ? STAFF_MINIAPP_SESSION_DURATION_MS : MINIAPP_SESSION_DURATION_MS;
    const expiresAt = createdAt + duration;
    sessions.set(digestToken(token), { identity, createdAt, expiresAt });
    return { token, expiresAt: new Date(expiresAt).toISOString() };
  };
  const get = (token: string): MiniAppSession | null => {
    cleanup();
    return sessions.get(digestToken(token)) || null;
  };
  const revokeToken = (token: string): boolean => sessions.delete(digestToken(token));
  const revokeStaff = (userId: number): number => {
    return revokeIdentity("staff", userId);
  };
  const revokeIdentity = (kind: MiniAppIdentityKind, subjectId: number): number => {
    let count = 0;
    for (const [key, value] of sessions) {
      if (value.identity.kind === kind && value.identity.subjectId === subjectId) { sessions.delete(key); count += 1; }
    }
    return count;
  };
  return { create, get, revokeToken, revokeStaff, revokeIdentity, cleanup, size: () => sessions.size };
};

export const assertMiniAppMemorySessionDeployment = (environment: NodeJS.ProcessEnv = process.env): void => {
  const instances = Number(environment.KOUROSH_BACKEND_INSTANCE_COUNT || 1);
  if (!Number.isInteger(instances) || instances < 1) {
    throw new Error("KOUROSH_BACKEND_INSTANCE_COUNT_INVALID");
  }
  if (instances > 1) {
    throw new Error("MINIAPP_MEMORY_SESSION_STORE_REQUIRES_SINGLE_BACKEND_INSTANCE");
  }
};

const defaultStore = createMiniAppSessionStore();
export const createMiniAppSession = defaultStore.create;
export const revokeMiniAppStaffSessions = defaultStore.revokeStaff;
export const revokeMiniAppIdentitySessions = defaultStore.revokeIdentity;

export const getMiniAppBearerToken = (req: Pick<Request, "headers">): string | null => {
  const authorization = req.headers.authorization;
  if (typeof authorization !== "string") return null;
  return authorization.match(/^Bearer\s+([A-Za-z0-9_-]{32,256})$/)?.[1] || null;
};

export const revokeCurrentMiniAppSession = (req: Pick<Request, "headers">): boolean => {
  const token = getMiniAppBearerToken(req);
  return token ? defaultStore.revokeToken(token) : false;
};

declare module "express-serve-static-core" { interface Request { miniAppIdentity?: MiniAppIdentity; } }

export const requireMiniAppSession: RequestHandler = (req, res, next) => {
  const token = getMiniAppBearerToken(req);
  if (!token) {
    miniAppSecurityLog("session_invalid", miniAppSecurityFieldsFromRequest(req, res.locals.requestId, 401, "MINIAPP_AUTH_REQUIRED", res.locals.miniAppStartedAt));
    return res.status(401).json({ success: false, code: "MINIAPP_AUTH_REQUIRED", message: "نشست Mini App ارسال نشده است.", requestId: res.locals.requestId });
  }
  const session = defaultStore.get(token);
  if (!session) {
    miniAppSecurityLog("session_invalid", miniAppSecurityFieldsFromRequest(req, res.locals.requestId, 401, "MINIAPP_SESSION_INVALID", res.locals.miniAppStartedAt));
    return res.status(401).json({ success: false, code: "MINIAPP_SESSION_INVALID", message: "نشست Mini App معتبر نیست. برنامه را دوباره باز کنید.", requestId: res.locals.requestId });
  }
  req.miniAppIdentity = session.identity;
  return next();
};
