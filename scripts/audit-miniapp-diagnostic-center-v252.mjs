import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const routes = read("server/routes/settings.routes.ts");
const service = read("server/services/miniAppDiagnostics.service.ts");
const runtime = read("server/cloud/snapshots/miniAppSnapshotRuntime.ts");
const worker = read("deployment/cloudflare-pages/_worker.js");
const component = read("components/MiniAppDiagnosticCenter.tsx");
const panel = read("pages/settings/SettingsTelegramPanel.tsx");

assert.match(routes, /\/api\/settings\/miniapp-diagnostics\/subjects/);
assert.match(routes, /\/api\/settings\/miniapp-diagnostics\/run/);
assert.match(routes, /miniapp-diagnostics\/run", authorizeRole\(\["Admin"\]\)/);
assert.match(routes, /miniapp-diagnostics\/subjects", authorizeRole\(\["Admin"\]\)/);
assert.match(service, /correlationId/);
assert.match(service, /resolveMiniAppIdentity/);
assert.match(service, /getMiniAppSnapshotSubjectDiagnostic/);
assert.match(service, /\/healthz/);
assert.match(service, /createSignedMiniAppDiagnosticsRequest/);
assert.match(runtime, /getMiniAppSnapshotSubjectDiagnostic/);
assert.match(worker, /KOUROSH-MINIAPP-DIAGNOSTICS-V1/);
assert.match(worker, /DIAGNOSTICS_PATH/);
assert.match(worker, /payload_json/); // storage exists
const diagnosticBlock = worker.slice(worker.indexOf("const inspectDiagnosticSnapshot"), worker.indexOf("const handleApi"));
assert.doesNotMatch(diagnosticBlock, /payload_json|subjectKey\s*[,}]/, "diagnostic response must not expose payload or subject key");
assert.match(component, /مرکز عیب‌یابی MiniApp/);
assert.match(component, /بازسازی و همگام‌سازی Snapshot/);
assert.match(component, /کپی گزارش/);
assert.match(component, /Telegram initData/);
assert.match(panel, /<MiniAppDiagnosticCenter setNotification=\{setNotification\} \/>/);
assert.doesNotMatch(component, /style=\{\{/);

console.log(JSON.stringify({ status: "PASS", adminOnly: true, signedEdgeProbe: true, noEdgePayloadLeak: true, noCustomCss: true, correlationId: true }, null, 2));
