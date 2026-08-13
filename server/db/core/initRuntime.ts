// Phase 1C: init runtime split orchestrator. Public exports remain compatible.

import sqlite3 from "sqlite3";
import {
  DB_PATH,
  getActiveDb,
  getCachedDbInstance,
  getDbInitializationPromise,
  getDatabaseMaintenancePromise,
  setActiveDb,
  setCachedDbInstance,
  setDbInitializationPromise,
} from "../connection";
import { applyDatabasePragmas, optimizeDatabasePlanner } from "./pragmas";
import { runDatabaseSchemaHealthPreflight } from "./schemaHealth";
import {
  createAuditSchema,
  createAuthSettingsServicesSchema,
  createCustomersSchema,
  createExpensesSchema,
  createInstallmentsSchema,
  createIntelligenceSchema,
  createInvoicesSchema,
  createLegacyPreludeSchema,
  createMessagesSchema,
  createPhonesSchema,
  createProductsSchema,
  createRepairsSchema,
  createSalesPurchasesInventorySchema,
  createTelegramIdentitySecuritySchema,
} from "../schema/index";
import {
  initializeSearchRuntime,
  runPostSeedDataRepairs,
} from "../migrations/index";
import {
  getOrCreateMobilePhoneCategory,
  seedDefaultCategories,
} from "../seeds/defaultCategories.seed";
import { seedInitialRoles } from "../seeds/defaultUsers.seed";
import { ensureDefaultBusinessSettings } from "../seeds/defaultSettings.seed";

export {
  DEFAULT_CATEGORIES,
  MOBILE_PHONE_CATEGORY_NAME,
  getOrCreateMobilePhoneCategory,
  seedDefaultCategories,
} from "../seeds/defaultCategories.seed";
export {
  ADMIN_ROLE_NAME,
  MANAGER_ROLE_NAME,
  MARKETER_ROLE_NAME,
  SALESPERSON_ROLE_NAME,
  TECHNICIAN_ROLE_NAME,
  WAREHOUSE_ROLE_NAME,
  seedInitialRoles,
} from "../seeds/defaultUsers.seed";
export { ensureDefaultBusinessSettings } from "../seeds/defaultSettings.seed";

export const initializeDatabaseInternal = async (): Promise<void> => {
  // Non-destructive: Use CREATE TABLE IF NOT EXISTS
  try {
    // Current init order preserved from the former monolith:
    // 1. PRAGMA setup
    // 2. legacy prelude schema/mixed compatibility guards
    // 3. products/inventory log schema
    // 4. phones/ownership/profit snapshot schema and phone defaults
    // 5. customers/telegram/customer ledger schema
    // 6. messages/SMS schema and guards
    // 7. expenses/debt snapshot schema and guards
    // 8. inventory ledger, sales, purchases, returns, stock count schema and guards
    // 9. services, settings, roles, users schema and guards
    // 10. installment schema and legacy FK/status migrations
    // 11. invoice, repair, audit, and predictive intelligence schema
    // 12. search runtime hooks
    // 13. default seeds and post-seed data repairs
    await runDatabaseSchemaHealthPreflight(DB_PATH);
    await applyDatabasePragmas();
    await createLegacyPreludeSchema();
    await createProductsSchema();
    await createPhonesSchema();
    await createCustomersSchema();
    await createMessagesSchema();
    await createExpensesSchema();
    await createSalesPurchasesInventorySchema();
    await createAuthSettingsServicesSchema();
    await createTelegramIdentitySecuritySchema();
    await createInstallmentsSchema();
    await createInvoicesSchema();
    await createRepairsSchema();
    await createAuditSchema();
    await createIntelligenceSchema();
  } catch (err: any) {
    console.error("Error during table creation phase:", err);
    throw new Error(`Failed during table creation: ${err.message}`);
  }

  await initializeSearchRuntime();

  // Seed initial data (idempotently)
  try {
    await getOrCreateMobilePhoneCategory();
    await seedDefaultCategories();
    // The call to seedDefaultSupplier() is removed from here.
    await seedInitialRoles();
    await ensureDefaultBusinessSettings();
    await runPostSeedDataRepairs();
    console.log("Initial data seeding completed/verified.");
  } catch (err: any) {
    console.error("Error seeding initial data:", err);
  }

  // Keep SQLite planner statistics aligned with the newly ensured indexes.
  // PRAGMA optimize is incremental; it does not force a full ANALYZE every boot.
  await optimizeDatabasePlanner();
};

export const getDbInstance = (
  forceNew: boolean = false,
): Promise<sqlite3.Database | null> => {
  const cachedDb = getCachedDbInstance();
  if (cachedDb && !forceNew) return Promise.resolve(cachedDb);

  const pendingInitialization = getDbInitializationPromise();
  if (pendingInitialization && !forceNew) return pendingInitialization;

  // During a live restore the active handle and caches are intentionally
  // detached before the file switch. Make new callers wait instead of opening
  // a second connection to the database that is about to be renamed.
  const maintenancePromise = getDatabaseMaintenancePromise();
  if (maintenancePromise && !forceNew && !getActiveDb()) {
    return maintenancePromise.then(() => getDbInstance(false));
  }

  const initializationPromise = new Promise<sqlite3.Database | null>(
    (resolveConnection, rejectConnection) => {
      const connect = () => {
        const newDb = new sqlite3.Database(
          DB_PATH,
          sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
          async (err: Error | null) => {
            if (err) {
              console.error("Error opening database connection:", err);
              setDbInitializationPromise(null);
              return rejectConnection(
                new Error(`Failed to open DB: ${err.message}`),
              );
            }
            console.log(
              "Connected to the SQLite database: kourosh_inventory.db",
            );
            setActiveDb(newDb);
            try {
              await initializeDatabaseInternal();
              setCachedDbInstance(newDb);
              resolveConnection(newDb);
            } catch (initErr: any) {
              console.error("Database initialization process failed:", initErr);
              setDbInitializationPromise(null);
              setCachedDbInstance(null);
              if (getActiveDb() === newDb) setActiveDb(null);
              newDb.close(() => undefined);
              rejectConnection(new Error(`DB init failed: ${initErr.message}`));
            }
          },
        );
      };

      const activeDb = getActiveDb();
      if (activeDb && forceNew) {
        const previousCachedDb = getCachedDbInstance();
        const previousInitializationPromise = getDbInitializationPromise();

        // Detach the shared handle before closing it. Otherwise requests and
        // recurring workers can continue queuing statements on a connection
        // that is already shutting down, which can stall a live restore.
        setActiveDb(null);
        setCachedDbInstance(null);
        setDbInitializationPromise(null);

        activeDb.close((closeErr: Error | null) => {
          if (closeErr) {
            console.error(
              "Error closing existing DB for re-initialization:",
              closeErr,
            );
            setActiveDb(activeDb);
            setCachedDbInstance(previousCachedDb || activeDb);
            setDbInitializationPromise(
              previousInitializationPromise || Promise.resolve(activeDb),
            );
            rejectConnection(
              new Error(`Failed to close DB for re-initialization: ${closeErr.message}`),
            );
            return;
          }
          console.log(
            "Existing DB connection closed for re-initialization.",
          );
          connect();
        });
      } else {
        connect();
      }
    },
  );
  setDbInitializationPromise(initializationPromise);
  return initializationPromise;
};

export type CloseDbConnectionOptions = {
  /** Cancel a long-running statement if graceful close is still waiting. */
  interruptPending?: boolean;
  /** Delay before interrupting pending work; defaults to 1500ms. */
  interruptAfterMs?: number;
  reason?: string;
};

export const closeDbConnection = (
  options: CloseDbConnectionOptions = {},
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const activeDb = getActiveDb();
    if (!activeDb) {
      // Clear any stale cache/promise left by an already-closed connection.
      setCachedDbInstance(null);
      setDbInitializationPromise(null);
      resolve();
      return;
    }

    const previousCachedDb = getCachedDbInstance();
    const previousInitializationPromise = getDbInitializationPromise();

    // Make the closing handle unavailable immediately. This is the critical
    // restore safety boundary: no new route or scheduler may enqueue more work
    // while sqlite3 is draining the connection.
    setActiveDb(null);
    setCachedDbInstance(null);
    setDbInitializationPromise(null);

    const interruptDelay = Math.max(0, Number(options.interruptAfterMs ?? 1500));
    const interruptTimer = options.interruptPending
      ? setTimeout(() => {
          try {
            activeDb.interrupt();
            console.warn(
              `Interrupted pending SQLite work while closing${options.reason ? ` (${options.reason})` : ""}.`,
            );
          } catch {
            // The connection may have completed closing before the timer fired.
          }
        }, interruptDelay)
      : null;

    activeDb.close((err: Error | null) => {
      if (interruptTimer) clearTimeout(interruptTimer);
      if (err) {
        console.error("Error closing the database connection:", err);
        // sqlite3 leaves the handle open when close fails (for example,
        // SQLITE_BUSY). Reattach it so the server is not left without a DB.
        setActiveDb(activeDb);
        setCachedDbInstance(previousCachedDb || activeDb);
        setDbInitializationPromise(
          previousInitializationPromise || Promise.resolve(activeDb),
        );
        reject(new Error(`Failed to close DB: ${err.message}`));
        return;
      }
      console.log(
        `Database connection closed${options.reason ? ` (${options.reason})` : ""}.`,
      );
      resolve();
    });
  });
};
