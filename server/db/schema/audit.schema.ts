// Extracted from server/db/core/initRuntime.ts. Preserve SQL/order exactly.
import { runAsync } from "../query";

export const createAuditSchema = async (): Promise<void> => {
  // --- Audit Logs Table ---
  // This table stores a record of user actions for accountability and debugging. Each row
  // captures the user performing the action, their role at the time, the type of action
  // (create/update/delete/login/etc.), the affected entity and its ID (if applicable),
  // a free‑form description of the operation, and a timestamp. See
  // audit_logs.ts for insertion helper. A foreign key links to users table.
  await runAsync(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      username TEXT,
      role TEXT,
      action TEXT NOT NULL,
      entityType TEXT,
      entityId INTEGER,
      description TEXT,
      createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      FOREIGN KEY (userId) REFERENCES users(id)
    );
  `);
  console.log("Audit_logs table ensured.");
};
