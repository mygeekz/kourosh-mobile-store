import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { KOUROSH_RELEASE } from "./lib/kourosh-release.mjs";
import { prepareMiniAppCloudflarePages } from "./prepare-miniapp-cloudflare-pages-v167.mjs";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "kourosh-miniapp-prepare-v249-"));
try {
  const workerDir = path.join(root, "deployment", "cloudflare-pages");
  const distDir = path.join(root, "dist-miniapp");
  fs.mkdirSync(workerDir, { recursive: true });
  fs.mkdirSync(distDir, { recursive: true });
  fs.writeFileSync(path.join(workerDir, "_worker.js"), 'const EDGE_VERSION = "v197";\nexport default {};\n', "utf8");

  const html = (release) => `<!doctype html><html><head><meta name="kourosh-release" content="${release}" /></head><body>${"x".repeat(400)}</body></html>`;
  fs.writeFileSync(path.join(distDir, "miniapp.html"), html("v248"), "utf8");

  assert.throws(
    () => prepareMiniAppCloudflarePages({ root }),
    /dist-miniapp release mismatch: built=v248, source=v249/,
  );
  assert.equal(fs.existsSync(path.join(distDir, "_worker.js")), false, "stale build must not produce a deployable worker");

  fs.writeFileSync(path.join(distDir, "miniapp.html"), html(KOUROSH_RELEASE), "utf8");
  const prepared = prepareMiniAppCloudflarePages({ root });
  assert.equal(prepared.release, KOUROSH_RELEASE);
  assert.equal(prepared.buildReleaseVerified, true);
  assert.match(fs.readFileSync(path.join(distDir, "_worker.js"), "utf8"), new RegExp(`const EDGE_VERSION = "${KOUROSH_RELEASE}";`));

  console.log(JSON.stringify({
    status: "PASS",
    release: KOUROSH_RELEASE,
    staleBuildRejected: true,
    currentBuildPrepared: true,
    workerReleaseInjected: true,
  }, null, 2));
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
