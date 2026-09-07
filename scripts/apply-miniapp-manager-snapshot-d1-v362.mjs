import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const database = String(process.argv[2] || process.env.KOUROSH_D1_DATABASE || "kourosh-miniapp-edge").trim();
const migration = path.resolve("deployment/cloudflare-pages/schema/0002_manager_read_snapshot.sql");
if (!database) throw new Error("D1 database name is required.");
if (!fs.existsSync(migration)) throw new Error(`Migration not found: ${migration}`);
const npx = process.platform === "win32" ? "npx.cmd" : "npx";
console.log(`[v362] Applying Manager read snapshot migration to D1: ${database}`);
const result = spawnSync(npx, ["wrangler", "d1", "execute", database, "--remote", `--file=${migration}`], { stdio: "inherit", shell: false });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status || 1);
console.log("[v362] D1 migration applied successfully.");
