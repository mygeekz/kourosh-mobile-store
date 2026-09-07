import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { KOUROSH_RELEASE } from "./lib/kourosh-release.mjs";

const root = process.cwd();
const dist = path.join(root, "dist-miniapp");
assert.ok(fs.existsSync(dist) && fs.statSync(dist).isDirectory(), "dist-miniapp must exist after build");
const htmlPath = path.join(dist, "miniapp.html");
const workerPath = path.join(dist, "_worker.js");
assert.ok(fs.existsSync(htmlPath), "dist-miniapp/miniapp.html is missing");
assert.ok(fs.existsSync(workerPath), "dist-miniapp/_worker.js is missing; run miniapp:cloudflare:prepare");
const html = fs.readFileSync(htmlPath, "utf8");
const worker = fs.readFileSync(workerPath, "utf8");
assert.match(html, new RegExp(`name="kourosh-release"\\s+content="${KOUROSH_RELEASE}"`));
assert.match(worker, new RegExp(`const EDGE_VERSION = "${KOUROSH_RELEASE}";`));
assert.match(worker, /X-Kourosh-Release/);
assert.doesNotMatch(html + worker, /EDGE_VERSION = "v(?:19[0-9]|2[0-4][0-9])"/);
console.log(JSON.stringify({ status: "PASS", release: KOUROSH_RELEASE, builtHtmlRelease: true, preparedEdgeRelease: true }, null, 2));
