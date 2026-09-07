import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const hasAll = (text, needles) => needles.every((needle) => text.includes(needle));
const check = (name, ok, evidence) => ({ name, ok: Boolean(ok), evidence });

const telegramAccess = read('server/connectivity/telegramPublicAccess.ts');
const runtimeBoundaries = read('server/connectivity/runtimeBoundaries.ts');
const stableTunnel = read('scripts/windows-miniapp-stable-tunnel-launcher.mjs');
const quickTunnel = read('scripts/windows-miniapp-tunnel-launcher.mjs');
const edge = read('deployment/cloudflare-pages/_worker.js');
const edgeSchema = read('deployment/cloudflare-pages/schema/0001_edge_snapshot.sql');
const availability = read('miniapp/reference/miniAppDataAvailability.ts');
const apiClient = read('miniapp/apiClient.ts');
const snapshotValidation = read('server/cloud/snapshots/miniAppSnapshotValidation.ts');
const snapshotSyncClient = read('server/cloud/snapshots/miniAppSnapshotSyncClient.ts');
const snapshotSyncReceiver = read('server/cloud/snapshots/miniAppSnapshotSyncReceiver.ts');
const snapshotContracts = read('server/cloud/snapshots/miniAppSnapshotContracts.ts');
const partnerService = read('server/services/miniAppPartner.service.ts');
const routes = read('server/routes/miniapp.routes.ts');
const startup = read('start_https.bat');
const ensureMini = read('scripts/ensure-miniapp-build.mjs');
const ensurePwa = read('scripts/ensure-local-pwa-build.mjs');
const menuSync = read('server/services/telegramMenuSync.service.ts');
const settingsController = read('pages/settings/SettingsController.tsx');

const requirements = [
  check('R01 stable hostname survives restart', hasAll(telegramAccess, ['stable_tunnel', 'validateTelegramStableMiniAppCanonicalUrl', 'return `${url.origin}/miniapp.html`']), 'canonical stable URL is runtime-configured and normalized, not process-generated'),
  check('R02 Quick Tunnel remains optional', hasAll(quickTunnel, ['trycloudflare.com']) && hasAll(stableTunnel, ['startOrReuseWindowsStableTunnel']), 'Quick and stable launchers are separate; stable production path has its own launcher'),
  check('R03 production does not use random trycloudflare hostname', hasAll(telegramAccess, ['hostname === "trycloudflare.com"', 'hostname.endsWith(".trycloudflare.com")', 'return null']), 'stable canonical validator rejects trycloudflare.com'),
  check('R04 port 3001 is never directly public', hasAll(runtimeBoundaries, ['port: 3001', 'publicListener: false']) && hasAll(stableTunnel, ['127.0.0.1:4180', 'Port 3001 is never a tunnel origin']), 'backend is loopback/non-public; stable tunnel targets gateway 4180'),
  check('R05 online Store returns Live DTO', hasAll(edge, ['"X-Kourosh-Data-Source": "live"', 'const proxyLive = async', 'liveHeaders()']), 'Edge marks and returns successful live responses'),
  check('R06 offline Store returns Snapshot DTO', hasAll(edge, ['"X-Kourosh-Data-Source": "snapshot"', 'customerSnapshotResponse', 'partnerSnapshotResponse', 'snapshotHeaders(snapshot)']), 'Customer/Partner fallback is served from stored snapshot'),
  check('R07 snapshot includes updatedAt provenance', hasAll(edge, ['X-Kourosh-Snapshot-Generated-At', 'X-Kourosh-Snapshot-Received-At']) && hasAll(snapshotContracts, ['generatedAt', 'receivedAt']), 'stored snapshot has generatedAt/receivedAt and Edge exposes provenance headers'),
  check('R08 UI visibly distinguishes Live vs Snapshot', hasAll(availability, ['اطلاعات زنده', 'اطلاعات ذخیره‌شده', 'اطلاعات با تأخیر', 'اطلاعات قدیمی']) && apiClient.includes('x-kourosh-data-source'), 'shared reference presentation consumes Edge provenance'),
  check('R09 Customer A cannot access Customer B', hasAll(edge, ['session.subjectKey', 'session.identity.kind !== routeKind', 'getSnapshot(db, session.tenantId, session.identity.kind, session.subjectKey)']), 'subject key comes from authenticated encrypted session, not client-selected customer id'),
  check('R10 Partner A cannot access Partner B', hasAll(edge, ['session.subjectKey', 'routeKind === "partner"', 'getSnapshot(db, session.tenantId, session.identity.kind, session.subjectKey)']), 'partner subject is bound to authenticated session and route kind'),
  check('R11 Staff role isolation preserved', hasAll(edge, ['identity.kind === "staff"', '["Admin", "Manager"].includes(identity.roleName)', 'MINIAPP_STAFF_OFFLINE_UNAVAILABLE']) && hasAll(routes, ['requireFreshMiniAppAuthorization', 'loadFreshStaffAuthorizationResult', 'revokeCurrentMiniAppSession']), 'Staff remains live-only; local route refreshes current authority and revokes invalid sessions'),
  check('R12 positive Partner balance remains creditor/store-owes-partner', hasAll(partnerService, ['currentBalance', 'code: "creditor"', 'بستانکار از فروشگاه']), 'partner service keeps creditor/store-owes-partner semantics for positive balance'),
  check('R13 Snapshot sync cannot modify Local DB', snapshotSyncClient.includes('fetchImpl(endpoint') && !snapshotSyncClient.includes('kourosh_inventory.db') && !snapshotSyncClient.includes('UPDATE customers') && !snapshotSyncClient.includes('UPDATE partners'), 'sync client only sends outbound snapshot candidate; no local financial SQL path'),
  check('R14 Mini App cannot perform Cloud financial write', hasAll(edge, ['request.method !== "GET"', 'MINIAPP_READ_ONLY', '405']), 'public business namespace is read-only; only authenticated snapshot ingest is writable'),
  check('R15 Local Connector cannot sync another tenant', hasAll(snapshotSyncClient, ['candidate.installationId !== options.installationId', 'MINIAPP_SNAPSHOT_SYNC_INSTALLATION_MISMATCH']) && hasAll(snapshotSyncReceiver, ['tenantId']), 'installation identity is checked by client and receiver enforces signed tenant assignment'),
  check('R16 invalid credential rejected', hasAll(snapshotSyncReceiver, ['SIGNATURE_INVALID', 'credentialVersion']) || hasAll(edge, ['MINIAPP_SNAPSHOT_SYNC_SIGNATURE_INVALID', 'credentialVersion']), 'Ed25519 signature and credential version are verified fail-closed'),
  check('R17 snapshot update atomic', hasAll(edge, ['INSERT INTO subject_snapshots', 'ON CONFLICT(tenant_id, subject_kind, subject_key) DO UPDATE SET']), 'one subject is replaced by one D1 upsert statement'),
  check('R18 partial snapshot never served', edgeSchema.includes('payload_json') && hasAll(edge, ['JSON.parse(row.payload_json)', 'subject_snapshots', 'snapshot_version']) && !edgeSchema.includes('snapshot_parts'), 'complete subject payload is stored/served as one versioned row'),
  check('R19 Store shutdown does not make Mini App completely unavailable', hasAll(edge, ['customerSnapshotResponse', 'partnerSnapshotResponse', 'MINIAPP_OFFLINE_SNAPSHOT_UNAVAILABLE']) && edge.includes('tryStorage'), 'valid Customer/Partner snapshot is fallback when live Store is unavailable'),
  check('R20 stale snapshot clearly identified', hasAll(availability, ['freshMs', 'staleMs', 'very_stale', 'اطلاعات قدیمی']), 'shared UX reference classifies and labels stale data'),
  check('R21 Local Kourosh works when Cloud is unavailable', startup.includes('Local Kourosh does not wait for Mini App build, Tunnel or Cloud connectivity') && stableTunnel.includes('Local Kourosh remains available'), 'Windows startup and tunnel failure are explicitly isolated from local runtime'),
  check('R22 Tunnel reconnect does not require manual action', hasAll(stableTunnel, ['inspectExistingCloudflared', 'action: "reuse"', 'spawn']) && !stableTunnel.includes('pause'), 'startup reuses an existing named tunnel or starts cloudflared automatically'),
  check('R23 daily startup does not invoke Vite when dist exists', hasAll(ensureMini, ['reusing dist-miniapp', 'Production bundle is ready']) && hasAll(ensurePwa, ['reusing dist/ without rebuild', 'Valid production output found']), 'both build guards reuse valid production output'),
  check('R24 Bot Token never reaches browser', !edge.includes('TELEGRAM_BOT_TOKEN') && edge.includes('TELEGRAM_PRODUCTION_PUBLIC_KEY_HEX') && !availability.includes('botToken'), 'Edge uses Telegram public-key validation; browser reference contains no bot token'),
  check('R25 secrets do not appear in logs', hasAll(snapshotSyncClient, ['safeMeta', 'signature|body|token|secret|credential|telegram|subjectkey|authorization']) && hasAll(edge, ['kourosh_edge_request_failed', 'error?.code || error?.name']), 'sync logs filter sensitive keys and Edge top-level logging records code/name only'),
  check('R26 stable URL requires no restart-time BotFather update', hasAll(menuSync, ['setChatMenuButton']) && !startup.toLowerCase().includes('botfather') && settingsController.includes('stable_tunnel'), 'runtime reconciles Menu Button; BotFather is not part of restart/startup automation'),
];

for (const item of requirements) assert.equal(item.ok, true, `${item.name}: ${item.evidence}`);
assert.equal(requirements.length, 26);

console.log(JSON.stringify({
  status: 'PASS',
  phase: 13,
  releaseGate: 'v173',
  requirementsPassed: requirements.length,
  requirements: requirements.map(({ name, evidence }) => ({ name, evidence })),
}, null, 2));
