import bcryptjs from "bcryptjs";

import { getDbInstance } from "../database";
import { execAsync, getAsync, runAsync } from "../db/query";
import { ADMIN_ROLE_NAME } from "../db/seeds/defaultUsers.seed";

export const INITIAL_SETUP_PASSWORD_MIN_LENGTH = 12;
export const INITIAL_SETUP_PASSWORD_MAX_BYTES = 72;

export type InitialSetupErrorCode =
  | "SETUP_ALREADY_COMPLETED"
  | "SETUP_INVALID_USERNAME"
  | "SETUP_INVALID_PASSWORD"
  | "SETUP_PASSWORD_MISMATCH"
  | "SETUP_ROLE_UNAVAILABLE";

export class InitialSetupError extends Error {
  constructor(
    public readonly code: InitialSetupErrorCode,
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "InitialSetupError";
  }
}

export type InitialAdminInput = {
  username: unknown;
  password: unknown;
  confirmPassword: unknown;
};

export type ValidatedInitialAdminInput = {
  username: string;
  password: string;
};

export type InitialAdminResult = {
  id: number;
  username: string;
  roleName: typeof ADMIN_ROLE_NAME;
};

const usernamePattern = /^[\p{L}\p{N}._-]+$/u;
const characterLength = (value: string): number => Array.from(value).length;

export const validateInitialAdminInput = (
  input: InitialAdminInput,
): ValidatedInitialAdminInput => {
  const username = typeof input.username === "string" ? input.username.trim() : "";
  const password = typeof input.password === "string" ? input.password : "";
  const confirmPassword =
    typeof input.confirmPassword === "string" ? input.confirmPassword : "";

  if (
    characterLength(username) < 3 ||
    characterLength(username) > 64 ||
    !usernamePattern.test(username)
  ) {
    throw new InitialSetupError(
      "SETUP_INVALID_USERNAME",
      "نام کاربری باید بین ۳ تا ۶۴ کاراکتر و فقط شامل حروف، عدد، نقطه، خط تیره یا زیرخط باشد.",
      400,
    );
  }

  if (password !== confirmPassword) {
    throw new InitialSetupError(
      "SETUP_PASSWORD_MISMATCH",
      "تکرار کلمه عبور با کلمه عبور یکسان نیست.",
      400,
    );
  }

  const normalizedPassword = password.toLocaleLowerCase("en-US");
  const normalizedUsername = username.toLocaleLowerCase("en-US");
  if (
    characterLength(password) < INITIAL_SETUP_PASSWORD_MIN_LENGTH ||
    Buffer.byteLength(password, "utf8") > INITIAL_SETUP_PASSWORD_MAX_BYTES ||
    !/\p{L}/u.test(password) ||
    !/\p{N}/u.test(password) ||
    normalizedPassword.includes(normalizedUsername)
  ) {
    throw new InitialSetupError(
      "SETUP_INVALID_PASSWORD",
      "کلمه عبور باید حداقل ۱۲ کاراکتر، شامل حرف و عدد، متفاوت از نام کاربری و حداکثر ۷۲ بایت باشد.",
      400,
    );
  }

  return { username, password };
};

export const isInitialSetupRequired = async (): Promise<boolean> => {
  await getDbInstance();
  const row = await getAsync("SELECT COUNT(*) AS userCount FROM users");
  return Number(row?.userCount || 0) === 0;
};

let setupQueue: Promise<void> = Promise.resolve();

const runSetupExclusively = async <T>(operation: () => Promise<T>): Promise<T> => {
  const previous = setupQueue;
  let releaseQueue: () => void = () => undefined;
  setupQueue = new Promise<void>((resolve) => {
    releaseQueue = resolve;
  });
  await previous;
  try {
    return await operation();
  } finally {
    releaseQueue();
  }
};

export const createInitialAdmin = async (
  rawInput: InitialAdminInput,
): Promise<InitialAdminResult> => {
  const input = validateInitialAdminInput(rawInput);

  return runSetupExclusively(async () => {
    await getDbInstance();
    if (!(await isInitialSetupRequired())) {
      throw new InitialSetupError(
        "SETUP_ALREADY_COMPLETED",
        "راه‌اندازی اولیه قبلاً انجام شده است.",
        409,
      );
    }

    // Hash before opening the write transaction so SQLite is not locked during
    // the intentionally expensive bcrypt operation. The user-count invariant is
    // checked again inside BEGIN IMMEDIATE before any insert is committed.
    const passwordHash = await bcryptjs.hash(input.password, 12);
    let transactionOpen = false;
    try {
      await execAsync("BEGIN IMMEDIATE TRANSACTION;");
      transactionOpen = true;

      const userCount = await getAsync("SELECT COUNT(*) AS userCount FROM users");
      if (Number(userCount?.userCount || 0) !== 0) {
        throw new InitialSetupError(
          "SETUP_ALREADY_COMPLETED",
          "راه‌اندازی اولیه قبلاً انجام شده است.",
          409,
        );
      }

      await runAsync("INSERT OR IGNORE INTO roles (name) VALUES (?)", [
        ADMIN_ROLE_NAME,
      ]);
      const role = await getAsync("SELECT id FROM roles WHERE name = ?", [
        ADMIN_ROLE_NAME,
      ]);
      if (!role?.id) {
        throw new InitialSetupError(
          "SETUP_ROLE_UNAVAILABLE",
          "نقش مدیر اصلی در دسترس نیست.",
          500,
        );
      }

      const result = await runAsync(
        "INSERT INTO users (username, passwordHash, roleId) VALUES (?, ?, ?)",
        [input.username, passwordHash, Number(role.id)],
      );
      await execAsync("COMMIT;");
      transactionOpen = false;

      return {
        id: Number(result.lastID),
        username: input.username,
        roleName: ADMIN_ROLE_NAME,
      };
    } catch (error) {
      if (transactionOpen) {
        await execAsync("ROLLBACK;").catch((rollbackError) => {
          console.error("[initial-setup] transaction rollback failed", rollbackError);
        });
      }
      throw error;
    }
  });
};
