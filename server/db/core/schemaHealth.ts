import { allAsync } from "../query";

export const MALFORMED_SCHEMA_PATTERN = /malformed database schema/i;

export const isMalformedDatabaseSchemaError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return MALFORMED_SCHEMA_PATTERN.test(message);
};

export const extractMalformedSchemaObjectName = (error: unknown): string | null => {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const match = message.match(/malformed database schema\s*\(([^)]+)\)/i);
  return match?.[1]?.trim() || null;
};

export const buildSchemaCorruptionGuidance = (dbPath: string, error: unknown): string => {
  const objectName = extractMalformedSchemaObjectName(error);
  const objectHint = objectName
    ? ` Suspect schema object reported by SQLite: ${objectName}.`
    : "";
  return [
    `SQLite schema health preflight failed for ${dbPath}.${objectHint}`,
    "The database file was not migrated further to protect existing store data.",
    "Run `npm run db:schema-doctor` first to inspect and create a backup-backed repair plan.",
    "If the doctor reports a safe non-table malformed schema object, run `npm run db:schema-doctor:apply` to quarantine it, then start the server again.",
  ].join(" ");
};

export const runDatabaseSchemaHealthPreflight = async (dbPath: string): Promise<void> => {
  try {
    const rows = await allAsync("PRAGMA quick_check(1);");
    const firstValue = rows
      .flatMap((row) => Object.values(row ?? {}))
      .map((value) => String(value ?? "").trim())
      .find(Boolean);

    if (firstValue && firstValue.toLowerCase() !== "ok") {
      throw new Error(`SQLite quick_check failed: ${firstValue}`);
    }
  } catch (error: unknown) {
    if (isMalformedDatabaseSchemaError(error)) {
      throw new Error(buildSchemaCorruptionGuidance(dbPath, error));
    }
    throw error;
  }
};
