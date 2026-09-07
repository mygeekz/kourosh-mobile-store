import assert from "node:assert/strict";
import fs from "node:fs";
import { KOUROSH_RELEASE } from "./lib/kourosh-release.mjs";

const read = (file) => fs.readFileSync(file, "utf8");
const html = read("miniapp.html");
const worker = read("deployment/cloudflare-pages/_worker.js");
const gateway = read("scripts/serve-miniapp-gateway.mjs");
const launcher = read("scripts/windows-miniapp-gateway-launcher.mjs");
const prepare = read("scripts/prepare-miniapp-cloudflare-pages-v167.mjs");
const pkg = JSON.parse(read("package.json"));

assert.equal(KOUROSH_RELEASE, "v260");
assert.match(html, /name="kourosh-release"\s+content="v260"/);
assert.match(worker, /const EDGE_VERSION = "v260";/);
assert.match(worker, /X-Kourosh-Release/);
assert.match(gateway, /MINIAPP_GATEWAY_RUNTIME_VERSION = KOUROSH_RELEASE/);
assert.match(launcher, /EXPECTED_MINIAPP_GATEWAY_RUNTIME_VERSION = KOUROSH_RELEASE/);
assert.doesNotMatch(gateway, /MINIAPP_GATEWAY_RUNTIME_VERSION = "v\d+"/);
assert.doesNotMatch(launcher, /EXPECTED_MINIAPP_GATEWAY_RUNTIME_VERSION = "v\d+"/);
assert.equal(pkg.scripts["miniapp:cloudflare:prepare"], "node scripts/prepare-miniapp-cloudflare-pages-v167.mjs");
assert.equal(pkg.scripts["miniapp:cloudflare:prepare-v167"], "npm run miniapp:cloudflare:prepare");
assert.match(pkg.scripts["build:miniapp"], /^npm run sync:miniapp-release && /);
assert.match(prepare, /builtRelease !== release/);
assert.match(prepare, /Run npm run build:miniapp before Cloudflare prepare/);

console.log(JSON.stringify({
  status: "PASS",
  release: KOUROSH_RELEASE,
  sourceOfTruth: "KOUROSH_SOURCE_VERSION",
  htmlReleaseSynchronized: true,
  edgeReleaseSynchronized: true,
  cloudflareStaleBuildGuard: true,
}, null, 2));
