import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const database = String(process.argv[2] || process.env.KOUROSH_D1_DATABASE || "kourosh-miniapp-edge").trim();
const migration = path.resolve("deployment/cloudflare-pages/schema/0002_manager_read_snapshot.sql");
const npx = process.platform === "win32" ? "npx.cmd" : "npx";
if (!database) throw new Error("D1 database name is required.");
if (!fs.existsSync(migration)) throw new Error(`Migration not found: ${migration}`);

const run = (args, { inherit = false } = {}) => {
  const result = spawnSync(npx, ["wrangler", ...args], inherit
    ? { stdio: "inherit", shell: false }
    : { encoding: "utf8", shell: false, maxBuffer: 4 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    if (!inherit) {
      if (result.stdout) process.stderr.write(result.stdout);
      if (result.stderr) process.stderr.write(result.stderr);
    }
    throw new Error(`Wrangler failed (${result.status}) for D1 ${database}`);
  }
  return result.stdout || "";
};

const parseRows = (stdout) => {
  const trimmed = String(stdout || "").trim();
  const start = Math.min(...[trimmed.indexOf("["), trimmed.indexOf("{")].filter((v) => v >= 0));
  if (!Number.isFinite(start)) throw new Error("Wrangler did not return JSON output.");
  const parsed = JSON.parse(trimmed.slice(start));
  const items = Array.isArray(parsed) ? parsed : [parsed];
  return items.flatMap((item) => item?.results || item?.result?.results || []);
};

const inspectSchema = () => {
  const sql = "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('tenant_installations','subject_snapshots','snapshot_sync_replays','manager_snapshots') ORDER BY name";
  const rows = parseRows(run(["d1", "execute", database, "--remote", `--command=${sql}`, "--json"]));
  return new Set(rows.map((row) => String(row?.name || "")));
};

console.log(`[v363] Verifying target D1 before migration: ${database}`);
const before = inspectSchema();
if (!before.has("tenant_installations")) {
  throw new Error(`D1 '${database}' is not the active Kourosh Edge database: tenant_installations is missing. Use the D1 database actually bound to Pages as KOUROSH_EDGE_DB.`);
}

console.log(`[v363] Applying Manager read snapshot migration to D1: ${database}`);
run(["d1", "execute", database, "--remote", `--file=${migration}`], { inherit: true });

console.log(`[v363] Verifying Manager schema on remote D1: ${database}`);
const after = inspectSchema();
for (const required of ["tenant_installations", "subject_snapshots", "snapshot_sync_replays", "manager_snapshots"]) {
  if (!after.has(required)) throw new Error(`Remote D1 verification failed: missing table '${required}' on ${database}.`);
}
console.log(JSON.stringify({ status: "PASS", release: "v363", database, managerSnapshotsReady: true }, null, 2));
