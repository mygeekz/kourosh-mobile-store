#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { KOUROSH_RELEASE } from "./lib/kourosh-release.mjs";

const requiredChecks = [
  "telegram.android.customer_live",
  "telegram.android.customer_offline_snapshot",
  "telegram.android.partner_live",
  "telegram.android.partner_offline_snapshot",
  "telegram.android.new_partner_identity_sync",
  "telegram.android.staff_live",
  "telegram.android.staff_offline_denied",
  "telegram.ios.customer_reconnect",
  "telegram.ios.partner_reconnect",
  "telegram.ios.staff_reconnect",
  "telegram.desktop.smoke",
  "identity.unlink_revokes_access",
  "identity.relink_new_user_recovers",
  "infrastructure.local_origin_stop_start",
  "infrastructure.snapshot_missing_message",
  "infrastructure.diagnostic_center_probe",
  "windows.tunnel_process_checks",
  "windows.startup_order",
  "build.verify_miniapp_pass",
  "deploy.cloudflare_pages_success",
  "deploy.edge_release_v267",
  "messaging.sms_installment_due_notice",
  "messaging.sms_repair_cost_notice",
  "messaging.sms_check_failed",
  "messaging.sms_invoice_created",
  "messaging.sms_test_allowlist_allowed",
  "messaging.sms_test_allowlist_blocked",
  "messaging.telegram_payment_received",
  "messaging.telegram_check_failed",
  "ui.form_fields.desktop_no_clipping",
  "ui.form_fields.mobile_no_clipping",
  "ui.form_fields.zoom_200_no_clipping",
];

const evidencePath = path.resolve(process.env.KOUROSH_MINIAPP_RC_EVIDENCE || "config/quality/miniapp-rc-evidence-v267.json");
if (!fs.existsSync(evidencePath)) {
  console.error(JSON.stringify({
    status: "FAIL",
    release: KOUROSH_RELEASE,
    reason: "RC_EVIDENCE_FILE_MISSING",
    expectedPath: evidencePath,
    template: "config/quality/miniapp-rc-evidence-v267.example.json",
  }, null, 2));
  process.exit(1);
}

const evidence = JSON.parse(fs.readFileSync(evidencePath, "utf8"));
const releaseNumber = Number.parseInt(String(KOUROSH_RELEASE).replace(/^v/, ""), 10);
assert.ok(Number.isInteger(releaseNumber) && releaseNumber >= 267, `KOUROSH_RELEASE must be v267 or a successor; found ${KOUROSH_RELEASE}`);
assert.equal(evidence.schemaVersion, 1);
assert.equal(evidence.release, KOUROSH_RELEASE);
assert.ok(Number.isFinite(Date.parse(evidence.testedAt)), "testedAt must be a real ISO date/time");
const publicUrl = new URL(String(evidence.publicUrl || ""));
assert.equal(publicUrl.protocol, "https:");
assert.equal(String(evidence.cloudflareProject || ""), "kourosh");

const expectedAliases = { A: "staff-admin", B: "partner-existing", C: "partner-newly-linked", D: "customer" };
for (const [alias, role] of Object.entries(expectedAliases)) {
  assert.equal(evidence.accountAliases?.[alias]?.role, role, `account alias ${alias} role mismatch`);
  assert.equal(evidence.accountAliases?.[alias]?.status, "PASS", `account alias ${alias} was not verified`);
}

const checks = new Map((evidence.checks || []).map((item) => [String(item.id || ""), item]));
assert.equal(checks.size, (evidence.checks || []).length, "duplicate RC evidence check ids");
for (const id of requiredChecks) {
  const item = checks.get(id);
  assert.ok(item, `missing RC evidence check: ${id}`);
  assert.equal(item.status, "PASS", `RC evidence check did not pass: ${id}`);
  assert.ok(String(item.evidence || "").trim().length >= 4, `RC evidence note is missing: ${id}`);
}

// Keep evidence non-sensitive: aliases and descriptive notes only, not Telegram IDs/tokens.
const raw = JSON.stringify(evidence);
for (const forbidden of ["botToken", "bot_token", "sessionToken", "session_token", "initData", "privateKey", "private_key"]) {
  assert.equal(raw.includes(`\"${forbidden}\"`), false, `RC evidence must not contain sensitive field ${forbidden}`);
}

console.log(JSON.stringify({
  status: "PASS",
  release: KOUROSH_RELEASE,
  evidencePath,
  accountAliases: Object.keys(expectedAliases),
  requiredChecks: requiredChecks.length,
  testedAt: evidence.testedAt,
  publicHost: publicUrl.host,
}, null, 2));
