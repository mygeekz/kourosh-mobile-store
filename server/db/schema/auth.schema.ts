// Extracted from server/db/core/initRuntime.ts. Preserve SQL/order exactly.
import { runAsync } from "../query";

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const isDuplicateColumnError = (error: unknown): boolean =>
  getErrorMessage(error).includes("duplicate column name");

export const createAuthSettingsServicesSchema = async (): Promise<void> => {
  await runAsync(`
    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      price REAL NOT NULL DEFAULT 0
    );
  `);
  console.log("Services table ensured.");
  await runAsync(
    "CREATE INDEX IF NOT EXISTS idx_services_name_nocase ON services(name COLLATE NOCASE);",
  );

  await runAsync(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT
    );
  `);
  console.log("Settings table ensured.");

  await runAsync(`
    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    );
  `);
  console.log("Roles table ensured.");

  await runAsync(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      passwordHash TEXT NOT NULL,
      roleId INTEGER NOT NULL,
      dateAdded TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      FOREIGN KEY (roleId) REFERENCES roles(id) ON DELETE RESTRICT -- Prevent role deletion if in use
    );
  `);
  console.log("Users table ensured.");
  await runAsync(`
    CREATE TABLE IF NOT EXISTS user_dashboard_layouts (
      userId INTEGER PRIMARY KEY,
      layoutJson TEXT NOT NULL,
      updatedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%SZ', 'now', 'utc')),
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
  console.log("User dashboard layouts table ensured.");

  try {
    await runAsync("ALTER TABLE users ADD COLUMN avatarPath TEXT");
    console.log("Column 'avatarPath' added to 'users' table.");
  } catch (error: unknown) {
    if (!isDuplicateColumnError(error)) {
      console.error("Error adding avatarPath column to users:", error);
    }
  }

  try {
    await runAsync("ALTER TABLE users ADD COLUMN firstName TEXT");
    console.log("Column 'firstName' added to 'users' table.");
  } catch (error: unknown) {
    if (!isDuplicateColumnError(error)) {
      console.error("Error adding firstName column to users:", error);
    }
  }

  try {
    await runAsync("ALTER TABLE users ADD COLUMN lastName TEXT");
    console.log("Column 'lastName' added to 'users' table.");
  } catch (error: unknown) {
    if (!isDuplicateColumnError(error)) {
      console.error("Error adding lastName column to users:", error);
    }
  }

  try {
    await runAsync("ALTER TABLE users ADD COLUMN lastLoginAt TEXT");
    console.log("Column 'lastLoginAt' added to 'users' table.");
  } catch (error: unknown) {
    if (!isDuplicateColumnError(error)) {
      console.error("Error adding lastLoginAt column to users:", error);
    }
  }
};
