import crypto from "node:crypto";

import bcryptjs from "bcryptjs";

export const PASSWORD_HASH_COST = 12;

export type PasswordVerificationResult =
  | { verified: false; needsUpgrade: false }
  | { verified: true; needsUpgrade: boolean };

export const isBcryptPasswordHash = (value: unknown): value is string =>
  typeof value === "string" && /^\$2[aby]\$\d{2}\$/.test(value);

const constantTimeTextEqual = (left: string, right: string): boolean => {
  const leftBytes = Buffer.from(left, "utf8");
  const rightBytes = Buffer.from(right, "utf8");
  if (leftBytes.length !== rightBytes.length) return false;
  return crypto.timingSafeEqual(leftBytes, rightBytes);
};

export const verifyStoredPassword = async (
  plainPassword: string,
  storedPassword: unknown,
): Promise<PasswordVerificationResult> => {
  if (typeof storedPassword !== "string" || storedPassword.length === 0) {
    return { verified: false, needsUpgrade: false };
  }

  if (isBcryptPasswordHash(storedPassword)) {
    try {
      return {
        verified: await bcryptjs.compare(plainPassword, storedPassword),
        needsUpgrade: false,
      };
    } catch {
      return { verified: false, needsUpgrade: false };
    }
  }

  if (!constantTimeTextEqual(plainPassword, storedPassword)) {
    return { verified: false, needsUpgrade: false };
  }
  return { verified: true, needsUpgrade: true };
};

export const hashPasswordForStorage = (plainPassword: string): Promise<string> =>
  bcryptjs.hash(plainPassword, PASSWORD_HASH_COST);
