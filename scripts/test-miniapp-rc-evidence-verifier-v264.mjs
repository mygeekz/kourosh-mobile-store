import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const template = JSON.parse(fs.readFileSync(path.join(root, "config/quality/miniapp-rc-evidence-v264.example.json"), "utf8"));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "kourosh-v264-rc-evidence-"));
const run = (file) => spawnSync(process.execPath, [path.join(root, "scripts/verify-miniapp-rc-evidence-v264.mjs")], {
  cwd: root,
  env: { ...process.env, KOUROSH_MINIAPP_RC_EVIDENCE: file },
  encoding: "utf8",
});
try {
  const valid = structuredClone(template);
  valid.testedAt = new Date().toISOString();
  valid.publicUrl = "https://miniapp.example.com/miniapp.html";
  for (const alias of Object.values(valid.accountAliases)) alias.status = "PASS";
  for (const check of valid.checks) { check.status = "PASS"; check.evidence = `verified ${check.id}`; }
  const validPath = path.join(tmp, "valid.json");
  fs.writeFileSync(validPath, JSON.stringify(valid, null, 2));
  const validRun = run(validPath);
  assert.equal(validRun.status, 0, validRun.stderr || validRun.stdout);
  assert.match(validRun.stdout, /"status": "PASS"/);

  const pending = structuredClone(valid);
  pending.checks[0].status = "PENDING";
  const pendingPath = path.join(tmp, "pending.json");
  fs.writeFileSync(pendingPath, JSON.stringify(pending, null, 2));
  const pendingRun = run(pendingPath);
  assert.notEqual(pendingRun.status, 0, "PENDING external evidence must fail closed");

  const sensitive = structuredClone(valid);
  sensitive.botToken = "redacted-test-value";
  const sensitivePath = path.join(tmp, "sensitive.json");
  fs.writeFileSync(sensitivePath, JSON.stringify(sensitive, null, 2));
  const sensitiveRun = run(sensitivePath);
  assert.notEqual(sensitiveRun.status, 0, "sensitive RC evidence fields must be rejected");

  console.log(JSON.stringify({
    status: "PASS",
    release: "v264",
    validEvidenceAccepted: true,
    pendingEvidenceRejected: true,
    sensitiveEvidenceRejected: true,
  }, null, 2));
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
