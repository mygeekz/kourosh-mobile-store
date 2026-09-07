// Extracted from server/db/core/initRuntime.ts. Preserve SQL/order exactly.
import { runAsync } from "../query";

export const createRepairsSchema = async (): Promise<void> => {
  // New Repair Center Tables
  await runAsync(`
    CREATE TABLE IF NOT EXISTS repairs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customerId INTEGER NOT NULL,
      deviceModel TEXT NOT NULL,
      deviceColor TEXT,
      serialNumber TEXT,
      problemDescription TEXT NOT NULL,
      technicianNotes TEXT,
      status TEXT NOT NULL,
      estimatedCost REAL,
      finalCost REAL,
      dateReceived TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      dateCompleted TEXT,
      technicianId INTEGER,
      laborFee REAL,
      FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE RESTRICT,
      FOREIGN KEY (technicianId) REFERENCES partners(id) ON DELETE SET NULL
    );
  `);
  console.log("Repairs table ensured.");

  try {
    await runAsync(
      "ALTER TABLE repairs ADD COLUMN technicianId INTEGER REFERENCES partners(id) ON DELETE SET NULL",
    );
    console.log("Column 'technicianId' added to 'repairs' table.");
  } catch (e: any) {
    if (!e.message.includes("duplicate column name"))
      console.error("Error adding technicianId column to repairs:", e);
  }
  try {
    await runAsync("ALTER TABLE repairs ADD COLUMN laborFee REAL");
    console.log("Column 'laborFee' added to 'repairs' table.");
  } catch (e: any) {
    if (!e.message.includes("duplicate column name"))
      console.error("Error adding laborFee column to repairs:", e);
  }

  await runAsync(`
    CREATE TABLE IF NOT EXISTS repair_parts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      repairId INTEGER NOT NULL,
      productId INTEGER NOT NULL,
      quantityUsed INTEGER NOT NULL,
      FOREIGN KEY (repairId) REFERENCES repairs(id) ON DELETE CASCADE,
      FOREIGN KEY (productId) REFERENCES products(id) ON DELETE RESTRICT
    );
  `);
  console.log("Repair_parts table ensured.");
};
