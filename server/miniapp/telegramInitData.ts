import crypto from "crypto";

const DEFAULT_MAX_AGE_SECONDS = 5 * 60;
const MAX_FUTURE_SKEW_SECONDS = 30;
const MAX_INIT_DATA_LENGTH = 16_384;

export type TelegramMiniAppUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  allows_write_to_pm?: boolean;
  photo_url?: string;
};

export type ValidatedTelegramInitData = {
  authDate: number;
  queryId: string | null;
  startParam: string | null;
  user: TelegramMiniAppUser;
};

export type ValidateTelegramInitDataOptions = {
  nowSeconds?: number;
  maxAgeSeconds?: number;
};

export class TelegramInitDataError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "TelegramInitDataError";
  }
}

const buildDataCheckString = (params: URLSearchParams): string =>
  [...params.entries()]
    .filter(([key]) => key !== "hash")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

const computeTelegramHash = (dataCheckString: string, botToken: string): Buffer => {
  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();
  return crypto.createHmac("sha256", secretKey).update(dataCheckString).digest();
};

const safeHashMatches = (expectedHash: string, actual: Buffer): boolean => {
  if (!/^[a-f0-9]{64}$/i.test(expectedHash)) return false;
  const expected = Buffer.from(expectedHash, "hex");
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
};

const parseTelegramUser = (raw: string | null): TelegramMiniAppUser => {
  if (!raw) {
    throw new TelegramInitDataError(
      "MINIAPP_TELEGRAM_USER_MISSING",
      "اطلاعات کاربر تلگرام ارسال نشده است.",
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new TelegramInitDataError(
      "MINIAPP_TELEGRAM_USER_INVALID",
      "اطلاعات کاربر تلگرام معتبر نیست.",
    );
  }

  const user = parsed as Partial<TelegramMiniAppUser>;
  if (
    !Number.isSafeInteger(user.id) ||
    Number(user.id) <= 0 ||
    typeof user.first_name !== "string" ||
    !user.first_name.trim()
  ) {
    throw new TelegramInitDataError(
      "MINIAPP_TELEGRAM_USER_INVALID",
      "شناسه کاربر تلگرام معتبر نیست.",
    );
  }

  return {
    ...user,
    id: Number(user.id),
    first_name: user.first_name.trim(),
  } as TelegramMiniAppUser;
};

export const validateTelegramInitData = (
  initData: string,
  botToken: string,
  options: ValidateTelegramInitDataOptions = {},
): ValidatedTelegramInitData => {
  const rawInitData = String(initData || "").trim();
  const token = String(botToken || "").trim();
  if (!token) {
    throw new TelegramInitDataError(
      "MINIAPP_BOT_NOT_CONFIGURED",
      "ربات تلگرام برای Mini App تنظیم نشده است.",
    );
  }
  if (!rawInitData || rawInitData.length > MAX_INIT_DATA_LENGTH) {
    throw new TelegramInitDataError(
      "MINIAPP_INIT_DATA_INVALID",
      "داده ورود Telegram Mini App معتبر نیست.",
    );
  }

  const params = new URLSearchParams(rawInitData);
  const receivedHash = String(params.get("hash") || "").trim();
  // Bot-token validation and third-party Ed25519 validation are separate
  // Telegram contracts. For the bot-token HMAC path every received field,
  // including the optional `signature`, participates; only `hash` is omitted.
  const telegramHash = computeTelegramHash(buildDataCheckString(params), token);
  if (!safeHashMatches(receivedHash, telegramHash)) {
    throw new TelegramInitDataError(
      "MINIAPP_INIT_DATA_SIGNATURE_INVALID",
      "امضای Telegram Mini App معتبر نیست.",
    );
  }

  const authDate = Number(params.get("auth_date"));
  const nowSeconds = Math.floor(options.nowSeconds ?? Date.now() / 1000);
  const maxAgeSeconds = Math.max(30, options.maxAgeSeconds ?? DEFAULT_MAX_AGE_SECONDS);
  if (!Number.isSafeInteger(authDate) || authDate <= 0) {
    throw new TelegramInitDataError(
      "MINIAPP_AUTH_DATE_INVALID",
      "زمان احراز هویت تلگرام معتبر نیست.",
    );
  }
  if (authDate > nowSeconds + MAX_FUTURE_SKEW_SECONDS) {
    throw new TelegramInitDataError(
      "MINIAPP_AUTH_DATE_FUTURE",
      "زمان احراز هویت تلگرام معتبر نیست.",
    );
  }
  if (nowSeconds - authDate > maxAgeSeconds) {
    throw new TelegramInitDataError(
      "MINIAPP_INIT_DATA_EXPIRED",
      "اطلاعات ورود تلگرام منقضی شده است. Mini App را دوباره باز کنید.",
    );
  }

  return {
    authDate,
    queryId: params.get("query_id") || null,
    startParam: params.get("start_param") || null,
    user: parseTelegramUser(params.get("user")),
  };
};
