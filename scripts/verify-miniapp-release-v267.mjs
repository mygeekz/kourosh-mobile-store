#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(root, "config", "quality", "miniapp-release-gate-v267.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const mode = process.argv.includes("--full") ? "full" : "source";
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const entries = mode === "full" ? [...manifest.sourceGate, ...manifest.fullGate] : manifest.sourceGate;

const startedAt = Date.now();
const results = [];
const seen = new Set();

console.log(`Kourosh MiniApp ${manifest.release} release gate (${mode})`);
console.log(`Root: ${root}`);
console.log(`Checks: ${entries.length}`);

for (let index = 0; index < entries.length; index += 1) {
  const entry = entries[index];
  if (seen.has(entry.script)) {
    console.error(`FAIL duplicate release-gate script: ${entry.script}`);
    process.exit(1);
  }
  seen.add(entry.script);
  const label = `[${String(index + 1).padStart(2, "0")}/${entries.length}] ${entry.area} :: ${entry.script}`;
  console.log(`\n${label}`);
  const checkStartedAt = Date.now();
  const child = spawnSync(npm, ["run", "--silent", entry.script], {
    cwd: root,
    env: process.env,
    encoding: "utf8",
    stdio: "pipe",
  });
  if (child.stdout) process.stdout.write(child.stdout);
  if (child.stderr) process.stderr.write(child.stderr);
  const durationMs = Date.now() - checkStartedAt;
  const status = child.status === 0 ? "PASS" : "FAIL";
  results.push({ area: entry.area, script: entry.script, status, exitCode: child.status, durationMs });
  console.log(`${status} ${entry.script} (${durationMs}ms)`);
  if (child.status !== 0) {
    console.error(`\nMiniApp ${mode} release gate stopped at ${entry.script}.`);
    console.error("No failed check is converted to a warning or silently skipped.");
    console.error(JSON.stringify({ release: manifest.release, mode, status: "FAIL", failed: results.at(-1), completed: results.length, total: entries.length }, null, 2));
    process.exit(child.status || 1);
  }
}

const summary = {
  release: manifest.release,
  mode,
  status: "PASS",
  checks: results.length,
  durationMs: Date.now() - startedAt,
  areas: [...new Set(results.map((item) => item.area))],
};
console.log(`\n${JSON.stringify(summary, null, 2)}`);
