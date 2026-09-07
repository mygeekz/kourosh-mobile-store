import fs from "fs";
import { createHash } from "node:crypto";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DEFAULT_MIGRATIONS_DIR = join(__dirname, "..", "migrations");

const execDb = (db: any, sql: string) =>
  new Promise<void>((resolve, reject) =>
    db.exec(sql, (err: any) => (err ? reject(err) : resolve())),
  );
const runDb = (db: any, sql: string, params: any[] = []) =>
  new Promise<void>((resolve, reject) =>
    db.run(sql, params, (err: any) => (err ? reject(err) : resolve())),
  );
const getDb = <T = any>(db: any, sql: string, params: any[] = []) =>
  new Promise<T | undefined>((resolve, reject) =>
    db.get(sql, params, (err: any, row: any) =>
      err ? reject(err) : resolve(row),
    ),
  );
export function splitSqlStatements(sql: string): string[] {
  // SQL-aware splitter used by the migration registry.
  // - ignores semicolons inside quoted strings
  // - strips SQL comments
  // - keeps CREATE TRIGGER ... BEGIN ...; ... END; as one SQLite statement
  //   (splitting a trigger body on its internal semicolons makes startup fail)
  const stmts: string[] = [];
  let cur = "";
  let i = 0;
  let inSingle = false;
  let inDouble = false;
  let inLineComment = false;
  let inBlockComment = false;
  let word = "";
  let recentWords: string[] = [];
  let triggerCandidate = false;
  let inTriggerBody = false;
  let triggerCaseDepth = 0;
  let triggerEndReady = false;

  const push = () => {
    const statement = cur.trim();
    if (statement) stmts.push(statement.endsWith(";") ? statement : statement + ";");
    cur = "";
    word = "";
    recentWords = [];
    triggerCandidate = false;
    inTriggerBody = false;
    triggerCaseDepth = 0;
    triggerEndReady = false;
  };

  const consumeWord = () => {
    if (!word) return;
    const upper = word.toUpperCase();
    recentWords.push(upper);
    if (recentWords.length > 4) recentWords.shift();

    if (!triggerCandidate) {
      const joined = recentWords.join(" ");
      if (
        joined.endsWith("CREATE TRIGGER") ||
        joined.endsWith("CREATE TEMP TRIGGER") ||
        joined.endsWith("CREATE TEMPORARY TRIGGER")
      ) {
        triggerCandidate = true;
      }
    }

    if (triggerCandidate && !inTriggerBody && upper === "BEGIN") {
      inTriggerBody = true;
      triggerCaseDepth = 0;
      triggerEndReady = false;
    } else if (inTriggerBody) {
      if (upper === "CASE") {
        triggerCaseDepth += 1;
        triggerEndReady = false;
      } else if (upper === "END") {
        if (triggerCaseDepth > 0) {
          triggerCaseDepth -= 1;
          triggerEndReady = false;
        } else {
          triggerEndReady = true;
        }
      } else if (triggerEndReady) {
        // END followed by another token was not the trigger-closing END.
        triggerEndReady = false;
      }
    }
    word = "";
  };

  while (i < sql.length) {
    const ch = sql[i];
    const next = i + 1 < sql.length ? sql[i + 1] : "";

    if (inLineComment) {
      if (ch === "\n") {
        inLineComment = false;
        cur += "\n";
      }
      i += 1;
      continue;
    }
    if (inBlockComment) {
      if (ch === "*" && next === "/") {
        inBlockComment = false;
        i += 2;
        continue;
      }
      i += 1;
      continue;
    }

    if (!inSingle && !inDouble) {
      if (ch === "-" && next === "-") {
        consumeWord();
        inLineComment = true;
        i += 2;
        continue;
      }
      if (ch === "/" && next === "*") {
        consumeWord();
        inBlockComment = true;
        i += 2;
        continue;
      }
    }

    if (!inDouble && ch === "'") {
      consumeWord();
      if (inSingle && next === "'") {
        cur += "''";
        i += 2;
        continue;
      }
      inSingle = !inSingle;
      cur += ch;
      i += 1;
      continue;
    }
    if (!inSingle && ch === '"') {
      consumeWord();
      inDouble = !inDouble;
      cur += ch;
      i += 1;
      continue;
    }

    if (!inSingle && !inDouble) {
      if (/[A-Za-z_]/.test(ch)) {
        word += ch;
      } else {
        consumeWord();
      }

      if (ch === ";") {
        cur += ";";
        if (!inTriggerBody || triggerEndReady) push();
        i += 1;
        continue;
      }
    }

    cur += ch;
    i += 1;
  }
  consumeWord();
  push();
  return stmts;
}
export function isIgnorableMigrationError(stmt: string, err: any): boolean {
  const msg = String(err?.message || err || "").toLowerCase();
  // 1) SQLite: ALTER TABLE ... ADD COLUMN X -> duplicate column name: X
  if (
    msg.includes("duplicate column name") &&
    /alter\s+table\s+\w+\s+add\s+column/i.test(stmt)
  )
    return true;
  // 2) Some sqlite builds report "already exists" on ADD COLUMN
  if (
    msg.includes("already exists") &&
    /alter\s+table\s+\w+\s+add\s+column/i.test(stmt)
  )
    return true;
  // 3) DB variants: column name differences between legacy schemas.
  // If an index targets a column that doesn't exist in this DB, skip it
  // (we prefer the server to start; you can add a follow-up migration later).
  if (
    msg.includes("no such column") &&
    /create\s+(unique\s+)?index/i.test(stmt)
  )
    return true;
  return false;
}
export type MigrationSafetyEvidence = {
  backupFileName?: string | null;
  backupSha256?: string | null;
  checksumVerified?: boolean | null;
};

export type MigrationRunnerOptions = {
  beforeApplyBatch?: (context: { pendingFiles: string[] }) => Promise<MigrationSafetyEvidence | void>;
};

const getTotalChanges = async (db: any): Promise<number> => {
  const row = await getDb<{ value?: number }>(db, "SELECT total_changes() AS value");
  return Math.max(0, Number(row?.value || 0));
};

const addRegistryColumn = async (db: any, definition: string) => {
  try {
    await execDb(db, `ALTER TABLE schema_migrations ADD COLUMN ${definition};`);
  } catch (error) {
    if (!String((error as any)?.message || error).toLowerCase().includes("duplicate column name")) throw error;
  }
};

export async function runPendingMigrations(
  db: any,
  migrationsDir = DEFAULT_MIGRATIONS_DIR,
  options: MigrationRunnerOptions = {},
) {
  if (!fs.existsSync(migrationsDir)) return { applied: [], pending: [], safetyEvidence: null };
  await execDb(
    db,
    `
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      sha256 TEXT,
      affectedRows INTEGER NOT NULL DEFAULT 0,
      result TEXT NOT NULL DEFAULT 'applied',
      backupFileName TEXT,
      backupSha256 TEXT,
      appliedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc'))
    );
  `,
  );
  // Registry upgrades are non-destructive and apply to historical databases too.
  await addRegistryColumn(db, "sha256 TEXT");
  await addRegistryColumn(db, "affectedRows INTEGER NOT NULL DEFAULT 0");
  await addRegistryColumn(db, "result TEXT NOT NULL DEFAULT 'applied'");
  await addRegistryColumn(db, "backupFileName TEXT");
  await addRegistryColumn(db, "backupSha256 TEXT");

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.toLowerCase().endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b, "en"));

  const pending: Array<{ file: string; sql: string; sha256: string }> = [];
  for (const file of files) {
    const fullPath = join(migrationsDir, file);
    const sql = fs.readFileSync(fullPath, "utf8");
    const sha256 = createHash("sha256").update(sql).digest("hex");
    const already = await getDb<{ id: string; sha256?: string | null; result?: string | null; affectedRows?: number | null }>(
      db,
      "SELECT id, sha256, result, affectedRows FROM schema_migrations WHERE id = ? LIMIT 1",
      [file],
    );
    if (already) {
      const storedChecksum = String(already.sha256 || "").trim().toLowerCase();
      if (storedChecksum && storedChecksum !== sha256) {
        throw new Error(`[migrations] checksum mismatch for ${file}: expected ${storedChecksum}, actual ${sha256}`);
      }
      if (!storedChecksum) {
        await runDb(db, "UPDATE schema_migrations SET sha256 = ?, result = COALESCE(NULLIF(result,''),'legacy_baseline'), affectedRows = COALESCE(affectedRows,0) WHERE id = ?", [sha256, file]);
      }
      continue;
    }
    pending.push({ file, sql, sha256 });
  }

  let safetyEvidence: MigrationSafetyEvidence | null = null;
  if (pending.length > 0 && options.beforeApplyBatch) {
    const provided = await options.beforeApplyBatch({ pendingFiles: pending.map((item) => item.file) });
    safetyEvidence = provided ? { ...provided } : null;
    if (!safetyEvidence?.checksumVerified || !/^[a-f0-9]{64}$/i.test(String(safetyEvidence.backupSha256 || ""))) {
      throw new Error("[migrations] safety backup is missing or its SHA256 was not verified; migration batch aborted");
    }
  }

  const applied: Array<{ id: string; affectedRows: number; result: string; sha256: string }> = [];
  for (const plan of pending) {
    const { file, sql, sha256 } = plan;
    if (!sql.trim()) {
      await runDb(
        db,
        "INSERT INTO schema_migrations (id, sha256, affectedRows, result, backupFileName, backupSha256) VALUES (?, ?, 0, 'empty', ?, ?)",
        [file, sha256, safetyEvidence?.backupFileName || null, safetyEvidence?.backupSha256 || null],
      );
      applied.push({ id: file, affectedRows: 0, result: "empty", sha256 });
      continue;
    }

    console.log(`[migrations] applying ${file} ...`);
    const beforeChanges = await getTotalChanges(db);
    await execDb(db, "BEGIN");
    try {
      const stmts = splitSqlStatements(sql);
      for (const stmt of stmts) {
        try {
          await execDb(db, stmt);
        } catch (err) {
          if (isIgnorableMigrationError(stmt, err)) {
            console.warn(`[migrations] skipped (already applied): ${file} :: ${stmt.slice(0, 80)}...`);
            continue;
          }
          throw err;
        }
      }
      const afterChanges = await getTotalChanges(db);
      const affectedRows = Math.max(0, afterChanges - beforeChanges);
      await runDb(
        db,
        "INSERT INTO schema_migrations (id, sha256, affectedRows, result, backupFileName, backupSha256) VALUES (?, ?, ?, 'applied', ?, ?)",
        [file, sha256, affectedRows, safetyEvidence?.backupFileName || null, safetyEvidence?.backupSha256 || null],
      );
      await execDb(db, "COMMIT");
      applied.push({ id: file, affectedRows, result: "applied", sha256 });
      console.log(`[migrations] applied ${file} (${affectedRows} affected rows)`);
    } catch (e) {
      await execDb(db, "ROLLBACK");
      console.error(`[migrations] failed ${file}`, e);
      throw e;
    }
  }
  return { applied, pending: pending.map((item) => item.file), safetyEvidence };
}
