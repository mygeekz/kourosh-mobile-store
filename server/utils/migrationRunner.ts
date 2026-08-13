import fs from "fs";
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
  // Safer splitter:
  // - ignores semicolons inside single/double-quoted strings
  // - strips line comments (--) and block comments (/* */)
  const stmts: string[] = [];
  let cur = "";
  let i = 0;
  let inSingle = false;
  let inDouble = false;
  let inLineComment = false;
  let inBlockComment = false;
  const push = () => {
    const s = cur.trim();
    if (s) stmts.push(s.endsWith(";") ? s : s + ";");
    cur = "";
  };
  while (i < sql.length) {
    const ch = sql[i];
    const next = i + 1 < sql.length ? sql[i + 1] : "";
    // End line comment
    if (inLineComment) {
      if (ch === "\n") {
        inLineComment = false;
        cur += "\n";
      }
      i++;
      continue;
    }
    // End block comment
    if (inBlockComment) {
      if (ch === "*" && next === "/") {
        inBlockComment = false;
        i += 2;
        continue;
      }
      i++;
      continue;
    }
    // Start comments (only if not inside strings)
    if (!inSingle && !inDouble) {
      if (ch === "-" && next === "-") {
        inLineComment = true;
        i += 2;
        continue;
      }
      if (ch === "/" && next === "*") {
        inBlockComment = true;
        i += 2;
        continue;
      }
    }
    // Toggle strings
    if (!inDouble && ch === "'") {
      // handle escaped single quote '' inside single-quoted strings
      if (inSingle && next === "'") {
        cur += "''";
        i += 2;
        continue;
      }
      inSingle = !inSingle;
      cur += ch;
      i++;
      continue;
    }
    if (!inSingle && ch === '"') {
      inDouble = !inDouble;
      cur += ch;
      i++;
      continue;
    }
    // Statement boundary
    if (!inSingle && !inDouble && ch === ";") {
      cur += ";";
      push();
      i++;
      continue;
    }
    cur += ch;
    i++;
  }
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
export async function runPendingMigrations(db: any, migrationsDir = DEFAULT_MIGRATIONS_DIR) {
  if (!fs.existsSync(migrationsDir)) return;
  await execDb(
    db,
    `
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      appliedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc'))
    );
  `,
  );
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.toLowerCase().endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b, "en"));
  for (const file of files) {
    const already = await getDb(
      db,
      "SELECT id FROM schema_migrations WHERE id = ? LIMIT 1",
      [file],
    );
    if (already) continue;
    const fullPath = join(migrationsDir, file);
    const sql = fs.readFileSync(fullPath, "utf8");
    // Safety: skip empty files
    if (!sql.trim()) {
      await runDb(db, "INSERT INTO schema_migrations (id) VALUES (?)", [file]);
      continue;
    }
    console.log(`[migrations] applying ${file} ...`);
    await execDb(db, "BEGIN");
    try {
      const stmts = splitSqlStatements(sql);
      for (const stmt of stmts) {
        try {
          await execDb(db, stmt);
        } catch (err) {
          if (isIgnorableMigrationError(stmt, err)) {
            console.warn(
              `[migrations] skipped (already applied): ${file} :: ${stmt.slice(0, 80)}...`,
            );
            continue;
          }
          throw err;
        }
      }
      await runDb(db, "INSERT INTO schema_migrations (id) VALUES (?)", [file]);
      await execDb(db, "COMMIT");
      console.log(`[migrations] applied ${file}`);
    } catch (e) {
      await execDb(db, "ROLLBACK");
      console.error(`[migrations] failed ${file}`, e);
      throw e;
    }
  }
}
