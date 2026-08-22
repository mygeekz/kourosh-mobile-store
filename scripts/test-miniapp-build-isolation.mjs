import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dist = path.join(root, "dist-miniapp");
assert.ok(fs.statSync(dist).isDirectory(), "dist-miniapp must exist");

const files = fs.readdirSync(dist, { recursive: true }).map(String).filter((entry) => fs.statSync(path.join(dist, entry)).isFile()).sort();
assert.ok(files.includes("miniapp.html"));
assert.ok(files.includes("favicon.svg"));
assert.ok(files.includes("kourosh-logo.svg"));
assert.ok(files.includes("fonts/Vazir-FD-WOL.woff2"));
assert.ok(files.some((entry) => /^assets\/.+\.js$/.test(entry)));
assert.ok(files.some((entry) => /^assets\/.+\.css$/.test(entry)));
assert.equal(files.some((entry) => /^assets\/home-hero(?:-[A-Za-z0-9_-]+)?\.webp$/.test(entry)), false, "home hero must be inlined and must not require a separate WebP request");

for (const forbidden of ["index.html", "sw.js", "manifest.webmanifest", "package.json", ".env", "server/index.ts"]) {
  assert.equal(files.includes(forbidden), false, `${forbidden} must not be in the Mini App build`);
}
assert.equal(files.some((entry) => entry.endsWith(".map")), false, "public source maps must be absent");
assert.equal(files.some((entry) => /(?:settings|backup|admin|reports|users?management)/i.test(path.basename(entry))), false, "Dashboard/admin chunks must be absent");
assert.equal(files.every((entry) => entry === "miniapp.html" || entry === "favicon.svg" || entry === "kourosh-logo.svg" || entry === "fonts/Vazir-FD-WOL.woff2" || /^assets\/[A-Za-z0-9_-]+\.(?:js|css|webp)$/.test(entry)), true, `unexpected Mini App output: ${files.join(", ")}`);

const textFiles = files.filter((entry) => /\.(?:html|js|css|svg)$/.test(entry));
const content = textFiles.map((entry) => fs.readFileSync(path.join(dist, entry), "utf8")).join("\n");
assert.doesNotMatch(content, /localhost:3001|127\.0\.0\.1:3001|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}/i);
assert.doesNotMatch(content, /telegram_bot_token|bot\d+:[A-Za-z0-9_-]{20,}|private[-_ ]key|\.pem\b/i);
assert.doesNotMatch(content, /serviceWorker|manifest\.webmanifest|registerSW/i);
for (const match of content.matchAll(/["'`](\/api\/[A-Za-z0-9_?&=./:${}-]+)/g)) {
  assert.ok(match[1].startsWith("/api/miniapp/"), `non-Mini-App API path leaked into build: ${match[1]}`);
}

console.log(`Mini App v150 isolated build passed: ${files.length} files, no Dashboard/PWA/source-map/internal-host exposure`);
