import type { MiniAppIdentityRecord } from "../miniapp/miniAppIdentityResolver";

type MiniAppIdentityRepositoryDependencies = {
  ensureDatabase: () => Promise<unknown>;
  readRows: (sql: string, params: unknown[]) => Promise<unknown[]>;
};

const loadRuntimeModule = (specifier: string): Promise<Record<string, unknown>> => import(specifier);

const defaultDependencies: MiniAppIdentityRepositoryDependencies = {
  ensureDatabase: async () => {
    const module = await loadRuntimeModule("../database");
    return (module.getDbInstance as () => Promise<unknown>)();
  },
  readRows: async (sql, params) => {
    const module = await loadRuntimeModule("../db/query");
    return (module.allAsync as (query: string, values: unknown[]) => Promise<unknown[]>)(sql, params);
  },
};

export const isMissingCompatibilityColumnError = (error: unknown): boolean => {
  const candidate = error as { code?: unknown; message?: unknown } | null;
  const code = String(candidate?.code || "").toUpperCase();
  const message = String(candidate?.message || error || "");
  return (code === "SQLITE_ERROR" || !code) && /no such column\s*:/i.test(message);
};

const readCompatibilityColumn = async (
  readRows: MiniAppIdentityRepositoryDependencies["readRows"],
  sql: string,
  telegramUserId: string,
): Promise<MiniAppIdentityRecord[]> => {
  try {
    return (await readRows(sql, [telegramUserId])) as MiniAppIdentityRecord[];
  } catch (error) {
    // Approved legacy databases do not necessarily have every compatibility
    // column. Only that exact schema-compatibility error is treated as no match.
    if (isMissingCompatibilityColumnError(error)) return [];
    throw error;
  }
};

const uniqueRecords = (records: MiniAppIdentityRecord[]): MiniAppIdentityRecord[] => {
  const byId = new Map<number, MiniAppIdentityRecord>();
  for (const record of records) {
    const id = Number(record?.id || 0);
    if (!Number.isInteger(id) || id <= 0 || byId.has(id)) continue;
    const normalized: MiniAppIdentityRecord = { id, displayName: record.displayName || null };
    if (record.roleName) normalized.roleName = record.roleName;
    byId.set(id, normalized);
  }
  return [...byId.values()];
};

export const createMiniAppIdentityRepository = (
  dependencies: MiniAppIdentityRepositoryDependencies = defaultDependencies,
) => ({
  findCustomerIdentities: async (
    telegramUserId: string,
  ): Promise<MiniAppIdentityRecord[]> => {
    await dependencies.ensureDatabase();
    const authoritative = uniqueRecords(await readCompatibilityColumn(
      dependencies.readRows,
      "SELECT id, fullName AS displayName FROM customers WHERE telegram_user_id = ? ORDER BY id ASC",
      telegramUserId,
    ));
    return authoritative;
  },

  findPartnerIdentities: async (
    telegramUserId: string,
  ): Promise<MiniAppIdentityRecord[]> => {
    await dependencies.ensureDatabase();
    const authoritative = uniqueRecords(await readCompatibilityColumn(
      dependencies.readRows,
      "SELECT id, partnerName AS displayName FROM partners WHERE telegram_user_id = ? ORDER BY id ASC",
      telegramUserId,
    ));
    return authoritative;
  },

  findStaffIdentities: async (telegramUserId: string): Promise<MiniAppIdentityRecord[]> => {
    await dependencies.ensureDatabase();
    const rows = await dependencies.readRows(
      `SELECT u.id, TRIM(COALESCE(u.firstName,'') || ' ' || COALESCE(u.lastName,'')) AS displayName,
              r.name AS roleName
       FROM user_telegram_links l
       JOIN users u ON u.id=l.user_id JOIN roles r ON r.id=u.roleId
       WHERE l.telegram_user_id=? ORDER BY u.id ASC`,
      [telegramUserId],
    );
    return uniqueRecords(rows as MiniAppIdentityRecord[]);
  },
});

export const miniAppIdentityRepo = createMiniAppIdentityRepository();
