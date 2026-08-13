// Extracted from server/db/core/initRuntime.ts. Preserve SQL/order exactly.
import { runAsync } from "../query";

export const applyDatabasePragmas = async (): Promise<void> => {
  await runAsync("PRAGMA foreign_keys = ON;");
  console.log("Foreign key support enabled.");
};

export const optimizeDatabasePlanner = async (): Promise<void> => {
  try {
    // Lets SQLite refresh planner statistics only when it considers it useful.
    // Safe to run repeatedly and intentionally avoids a full ANALYZE on every startup.
    await runAsync("PRAGMA optimize;");
    console.log("SQLite query planner optimization checked.");
  } catch (error: unknown) {
    // Optimization must never block application startup on older SQLite builds.
    console.warn(
      "SQLite planner optimization skipped:",
      error instanceof Error ? error.message : String(error),
    );
  }
};
