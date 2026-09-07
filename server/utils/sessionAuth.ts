import crypto from "crypto";
import type { Request, RequestHandler, Response } from "express";

export interface ActiveSession {
  userId: number;
  username: string;
  roleName: string;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  expires: number;
}

export const activeSessions: Record<string, ActiveSession> = {};

export const generateToken = () => crypto.randomBytes(32).toString("hex");

export const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24h

export type SessionUserSnapshot = Omit<ActiveSession, "expires">;

const authFailure = (
  res: Response,
  status: 401 | 403,
  code: string,
  message: string,
) => res.status(status).json({ success: false, code, message });

export const getBearerToken = (req: Pick<Request, "headers">): string | null => {
  const authorization = req.headers.authorization;
  if (typeof authorization !== "string") return null;
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
};

const getLegacySessionToken = (req: Request): string | null => {
  const headerToken = req.headers["x-session-token"];
  if (typeof headerToken === "string" && headerToken.trim()) {
    return headerToken.trim();
  }

  const queryToken = req.query.token;
  if (typeof queryToken === "string" && queryToken.trim()) {
    return queryToken.trim();
  }

  return null;
};

export const revokeSession = (token: string | null | undefined): boolean => {
  if (!token || !activeSessions[token]) return false;
  delete activeSessions[token];
  return true;
};

export const revokeAllSessions = (): number => {
  const tokens = Object.keys(activeSessions);
  for (const token of tokens) delete activeSessions[token];
  return tokens.length;
};

export const revokeUserSessions = (
  userId: number,
  exceptToken?: string | null,
): number => {
  let revoked = 0;
  for (const [token, session] of Object.entries(activeSessions)) {
    if (session.userId !== userId || token === exceptToken) continue;
    delete activeSessions[token];
    revoked += 1;
  }
  return revoked;
};

export const synchronizeSession = (
  token: string | null | undefined,
  user: SessionUserSnapshot,
): boolean => {
  if (!token || !activeSessions[token]) return false;
  activeSessions[token] = {
    ...activeSessions[token],
    ...user,
  };
  return true;
};

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        username: string;
        roleName: string;
        firstName?: string | null;
        lastName?: string | null;
        avatarUrl?: string | null;
      };
    }
  }
}

export const requireAuth: RequestHandler = (req, res, next) => {
  try {
    const token = getBearerToken(req) || getLegacySessionToken(req);
    if (!token) {
      return authFailure(
        res,
        401,
        "AUTH_REQUIRED",
        "برای ادامه وارد حساب کاربری شوید.",
      );
    }
    const session = activeSessions[token];
    if (!session) {
      return authFailure(
        res,
        401,
        "AUTH_SESSION_INVALID",
        "نشست کاربری معتبر نیست. دوباره وارد شوید.",
      );
    }
    if (session.expires && Date.now() > session.expires) {
      revokeSession(token);
      return authFailure(
        res,
        401,
        "AUTH_SESSION_EXPIRED",
        "نشست کاربری منقضی شده است. دوباره وارد شوید.",
      );
    }
    req.user = {
      id: session.userId,
      username: session.username,
      roleName: session.roleName,
      avatarUrl: session.avatarUrl,
    };
    return next();
  } catch (error: unknown) {
    return next(error);
  }
};

export const authenticateToken: RequestHandler = (req, res, next) => {
  const token = getBearerToken(req);
  if (!token) {
    return authFailure(
      res,
      401,
      "AUTH_REQUIRED",
      "توکن دسترسی ارائه نشده است.",
    );
  }
  const session = activeSessions[token];
  if (!session) {
    return authFailure(
      res,
      401,
      "AUTH_SESSION_INVALID",
      "نشست کاربری معتبر نیست. دوباره وارد شوید.",
    );
  }
  if (session.expires < Date.now()) {
    revokeSession(token);
    return authFailure(
      res,
      401,
      "AUTH_SESSION_EXPIRED",
      "نشست کاربری منقضی شده است. دوباره وارد شوید.",
    );
  }
  session.expires = Date.now() + SESSION_DURATION_MS;
  req.user = {
    id: session.userId,
    username: session.username,
    roleName: session.roleName,
    firstName: session.firstName,
    lastName: session.lastName,
    avatarUrl: session.avatarUrl,
  };
  return next();
};

export const authorizeRole = (allowed: string[]): RequestHandler => {
  return (req, res, next) => {
    if (
      !req.user ||
      !req.user.roleName ||
      !allowed.includes(req.user.roleName)
    ) {
      return res.status(403).json({
        success: false,
        code: "AUTH_ROLE_FORBIDDEN",
        message: `عدم دسترسی مجاز. شما نقش مورد نیاز (${allowed.join(" یا ")}) را ندارید.`,
      });
    }
    return next();
  };
};
