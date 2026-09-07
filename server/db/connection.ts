import type sqlite3 from "sqlite3";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const defaultDbPath = join(__dirname, "..", "kourosh_inventory.db");
const isolatedTestDbPath =
  process.env.NODE_ENV === "test"
    ? String(process.env.KOUROSH_TEST_DB_PATH || "").trim()
    : "";

// Production and normal development always keep the historical database path.
// Tests may opt into an explicit copied database so schema/seed initialization
// can never mutate the store database by accident.
export const DB_PATH = isolatedTestDbPath
  ? resolve(isolatedTestDbPath)
  : defaultDbPath;

let activeDb: sqlite3.Database | null = null;
let cachedDbInstance: sqlite3.Database | null = null;
let dbInitializationPromise: Promise<sqlite3.Database | null> | null = null;
let databaseMaintenancePromise: Promise<void> | null = null;
let finishDatabaseMaintenance: (() => void) | null = null;
let databaseMaintenanceReason = "";

export const getActiveDb = (): sqlite3.Database | null => activeDb;
export const setActiveDb = (database: sqlite3.Database | null): void => {
  activeDb = database;
};

export const getCachedDbInstance = (): sqlite3.Database | null => cachedDbInstance;
export const setCachedDbInstance = (database: sqlite3.Database | null): void => {
  cachedDbInstance = database;
};

export const getDbInitializationPromise = (): Promise<sqlite3.Database | null> | null =>
  dbInitializationPromise;

export const getDatabaseMaintenancePromise = (): Promise<void> | null =>
  databaseMaintenancePromise;

export const getDatabaseMaintenanceReason = (): string => databaseMaintenanceReason;

/**
 * Prevents another connection from being opened while the live SQLite file is
 * being replaced. The returned release function is idempotent and must be
 * called from a finally block.
 */
export const beginDatabaseMaintenance = (reason = "database maintenance"): (() => void) => {
  if (databaseMaintenancePromise) {
    throw new Error(
      `Database maintenance is already active${databaseMaintenanceReason ? ` (${databaseMaintenanceReason})` : ""}.`,
    );
  }

  databaseMaintenanceReason = String(reason || "database maintenance");
  databaseMaintenancePromise = new Promise<void>((resolve) => {
    finishDatabaseMaintenance = resolve;
  });

  let released = false;
  return () => {
    if (released) return;
    released = true;
    const finish = finishDatabaseMaintenance;
    finishDatabaseMaintenance = null;
    databaseMaintenancePromise = null;
    databaseMaintenanceReason = "";
    finish?.();
  };
};
export const setDbInitializationPromise = (
  promise: Promise<sqlite3.Database | null> | null,
): void => {
  dbInitializationPromise = promise;
};
export const db = new Proxy({} as sqlite3.Database, {
  get(_target, property, receiver) {
    const database = getActiveDb();
    if (!database) {
      throw new Error("Database not initialized. Call getDbInstance first.");
    }
    const value = Reflect.get(database, property, receiver);
    return typeof value === "function" ? value.bind(database) : value;
  },
});
