// Keep operational failures visible without logging bot/link credentials or payloads.
export const reportTelegramBotFailure = (
  event: string,
  error: unknown,
  context: Record<string, string | number | undefined> = {},
): void => {
  const details = error && typeof error === "object"
    ? error as { message?: unknown; errorCode?: unknown; code?: unknown; status?: unknown }
    : { message: error };
  const redact = (value: unknown) => String(value || "")
    .replace(/\b\d+:[A-Za-z0-9_-]+\b/g, "[REDACTED_BOT_TOKEN]")
    .replace(/\b(?:staff|plink|link)_[A-Za-z0-9_-]+/g, "[REDACTED_LINK]")
    .replace(/Bearer\s+\S+/gi, "Bearer [REDACTED]")
    .slice(0, 500);
  console.error("[TelegramBot]", {
    event,
    ...context,
    code: redact(details.errorCode || details.code),
    status: typeof details.status === "number" ? details.status : undefined,
    message: redact(details.message) || "Telegram operation failed",
  });
};
