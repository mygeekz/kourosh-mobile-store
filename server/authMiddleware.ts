
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "./errors";

export interface AuthRequest extends Request {
  user?: { id: number; role: string };
}

export function requireAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header) throw new AppError("Unauthorized", 401);

  const token = header.replace("Bearer ", "");
  try {
    const payload: any = jwt.verify(token, process.env.JWT_SECRET || "secret");
    req.user = payload;
    next();
  } catch {
    throw new AppError("Invalid token", 401);
  }
}

export function requireRole(roles: string[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new AppError("Forbidden", 403);
    }
    next();
  };
}
