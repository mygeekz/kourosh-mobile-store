import type { Express } from "express";

const normalizeAddress = (address: string): string =>
  address.trim().replace(/^::ffff:/, "");

export const isTrustedLoopbackProxy = (address: string): boolean => {
  const normalized = normalizeAddress(address);
  return (
    normalized === "::1" ||
    normalized === "localhost" ||
    normalized.startsWith("127.")
  );
};

export const configureTrustedProxy = (app: Express): void => {
  app.set("trust proxy", (address: string) => isTrustedLoopbackProxy(address));
};
