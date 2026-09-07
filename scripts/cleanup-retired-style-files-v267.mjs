#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const registryPath = path.join(projectRoot, "config", "ui", "retired-style-files.json");
const manifestPath = path.join(projectRoot, "styles", "manifest", "style-manifest.json");

const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const registered = new Set(manifest.localStyles.map((entry) => String(entry.path).replaceAll("\\", "/")));
const removed = [];

for (const entry of registry.files || []) {
  const relative = String(entry.path || "").replaceAll("\\", "/");
  if (!relative.endsWith(".css") || relative.startsWith("/") || relative.includes("../")) {
    throw new Error(`Invalid retired style path: ${relative}`);
  }
  if (registered.has(relative)) {
    throw new Error(`Retired style is still registered in style manifest: ${relative}`);
  }
  const absolute = path.resolve(projectRoot, relative);
  const allowedRoot = path.resolve(projectRoot, "styles") + path.sep;
  if (!absolute.startsWith(allowedRoot)) {
    throw new Error(`Refusing to delete retired style outside styles/: ${relative}`);
  }
  if (fs.existsSync(absolute)) {
    const stat = fs.statSync(absolute);
    if (!stat.isFile()) throw new Error(`Retired style path is not a file: ${relative}`);
    fs.rmSync(absolute, { force: true });
    removed.push(relative);
  }
}

console.log(`[styles] Retired-style cleanup complete: ${removed.length} stale file(s) removed.`);
for (const file of removed) console.log(`[styles] removed ${file}`);
