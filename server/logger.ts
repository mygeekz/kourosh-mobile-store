type LogLevel = "debug" | "info" | "warn" | "error";

type LogMetadata = Record<string, unknown> | unknown;

const LOG_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const normalizeLogLevel = (value: unknown): LogLevel => {
  const normalized = String(value || "info").trim().toLowerCase();
  return normalized === "debug" || normalized === "warn" || normalized === "error"
    ? normalized
    : "info";
};

const configuredLevel = normalizeLogLevel(process.env.LOG_LEVEL);

const serializeError = (error: Error) => ({
  name: error.name,
  message: error.message,
  stack: error.stack,
  ...(error.cause !== undefined ? { cause: error.cause } : {}),
});

const normalizeValue = (value: unknown): unknown => {
  if (value instanceof Error) return serializeError(value);
  return value;
};

const safeStringify = (value: unknown): string => {
  const seen = new WeakSet<object>();
  try {
    return JSON.stringify(value, (_key, item) => {
      const normalized = normalizeValue(item);
      if (typeof normalized === "bigint") return normalized.toString();
      if (normalized && typeof normalized === "object") {
        if (seen.has(normalized)) return "[Circular]";
        seen.add(normalized);
      }
      return normalized;
    });
  } catch {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "error",
      message: "Unable to serialize log entry",
    });
  }
};

const writeLog = (level: LogLevel, message: unknown, metadata?: LogMetadata) => {
  if (LOG_PRIORITY[level] < LOG_PRIORITY[configuredLevel]) return;

  const normalizedMessage = message instanceof Error
    ? message.message
    : String(message ?? "");

  const entry: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    level,
    message: normalizedMessage,
  };

  if (message instanceof Error) entry.error = serializeError(message);
  if (metadata !== undefined) entry.metadata = normalizeValue(metadata);

  const output = safeStringify(entry);
  if (level === "error") console.error(output);
  else if (level === "warn") console.warn(output);
  else if (level === "debug") console.debug(output);
  else console.info(output);
};

export const logger = Object.freeze({
  debug: (message: unknown, metadata?: LogMetadata) => writeLog("debug", message, metadata),
  info: (message: unknown, metadata?: LogMetadata) => writeLog("info", message, metadata),
  warn: (message: unknown, metadata?: LogMetadata) => writeLog("warn", message, metadata),
  error: (message: unknown, metadata?: LogMetadata) => writeLog("error", message, metadata),
});
