import type { RequestHandler } from "express";

export type AuthorizeRole = (allowed: string[]) => RequestHandler;

export type IntelligenceRouteDeps = {
  authorizeRole: AuthorizeRole;
};
