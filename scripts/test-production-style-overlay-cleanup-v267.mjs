#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const stale = path.join(root, "styles", "pages", "repairs.css");
const artifact = path.join(root, "dist-miniapp", "assets", "v267-style-audit-sentinel.css");
const originalStale = fs.existsSync(stale) ? fs.readFileSync(stale) : null;
const artifactExisted = fs.existsSync(artifact);
const originalArtifact = artifactExisted ? fs.readFileSync(artifact) : null;

try {
  fs.mkdirSync(path.dirname(stale), { recursive: true });
  fs.writeFileSync(stale, ".stale-v267 { color: red; }\n");
  fs.mkdirSync(path.dirname(artifact), { recursive: true });
  fs.writeFileSync(artifact, ".built-artifact { color: blue; }\n");

  const cleanup = spawnSync(process.execPath, ["scripts/cleanup-retired-style-files-v267.mjs"], { cwd: root, encoding: "utf8" });
  assert.equal(cleanup.status, 0, cleanup.stderr || cleanup.stdout);
  assert.equal(fs.existsSync(stale), false, "known retired CSS must be removed before style audit");

  const audit = spawnSync(process.execPath, ["scripts/audit-style-manifest.mjs"], { cwd: root, encoding: "utf8" });
  assert.equal(audit.status, 0, `dist-miniapp build artifact must not pollute source CSS inventory\n${audit.stderr}${audit.stdout}`);

  const unknown = path.join(root, "styles", "pages", "v267-unknown-unregistered.css");
  fs.writeFileSync(unknown, ".unknown { color: black; }\n");
  try {
    const unknownAudit = spawnSync(process.execPath, ["scripts/audit-style-manifest.mjs"], { cwd: root, encoding: "utf8" });
    assert.notEqual(unknownAudit.status, 0, "unknown unregistered source CSS must still fail closed");
    assert.match(`${unknownAudit.stderr}${unknownAudit.stdout}`, /unregistered CSS file: styles\/pages\/v267-unknown-unregistered\.css/);
  } finally {
    fs.rmSync(unknown, { force: true });
  }

  console.log(JSON.stringify({ status: "PASS", release: "v267", retiredOverlayCleanup: true, buildArtifactsExcluded: true, unknownCssFailsClosed: true }, null, 2));
} finally {
  if (originalStale) fs.writeFileSync(stale, originalStale); else fs.rmSync(stale, { force: true });
  if (artifactExisted) fs.writeFileSync(artifact, originalArtifact); else fs.rmSync(artifact, { force: true });
}
