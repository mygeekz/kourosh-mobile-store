#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { KOUROSH_RELEASE, KOUROSH_ROOT_DIR } from "./lib/kourosh-release.mjs";

const checkOnly = process.argv.includes("--check");
const htmlPath = path.join(KOUROSH_ROOT_DIR, "miniapp.html");
const workerPath = path.join(KOUROSH_ROOT_DIR, "deployment", "cloudflare-pages", "_worker.js");

const targets = [
  {
    label: "miniapp.html",
    filePath: htmlPath,
    pattern: /(<meta\s+name="kourosh-release"\s+content=")[^"]+("\s*\/>)/,
    replacement: `$1${KOUROSH_RELEASE}$2`,
    expected: new RegExp(`name="kourosh-release"\\s+content="${KOUROSH_RELEASE}"`),
  },
  {
    label: "Cloudflare Edge worker",
    filePath: workerPath,
    pattern: /const EDGE_VERSION = "[^"]+";/,
    replacement: `const EDGE_VERSION = "${KOUROSH_RELEASE}";`,
    expected: new RegExp(`const EDGE_VERSION = "${KOUROSH_RELEASE}";`),
  },
];

const results = [];
for (const target of targets) {
  const before = fs.readFileSync(target.filePath, "utf8");
  if (!target.pattern.test(before)) throw new Error(`${target.label} release marker is missing.`);
  const alreadySynced = target.expected.test(before);
  if (checkOnly) {
    if (!alreadySynced) throw new Error(`${target.label} release marker is not synchronized with ${KOUROSH_RELEASE}.`);
    results.push({ target: target.label, changed: false, release: KOUROSH_RELEASE });
    continue;
  }
  const after = before.replace(target.pattern, target.replacement);
  if (!target.expected.test(after)) throw new Error(`${target.label} release marker could not be synchronized.`);
  if (after !== before) fs.writeFileSync(target.filePath, after, "utf8");
  results.push({ target: target.label, changed: after !== before, release: KOUROSH_RELEASE });
}

console.log(JSON.stringify({ status: "PASS", mode: checkOnly ? "check" : "sync", release: KOUROSH_RELEASE, results }, null, 2));
