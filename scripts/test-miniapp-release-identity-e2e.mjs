import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { generateKeyPairSync, randomBytes, sign } from 'node:crypto';
import { createMiniAppSnapshotSyncClient } from '../server/cloud/snapshots/miniAppSnapshotSyncClient.ts';
import { deriveMiniAppSnapshotSubjectKey } from '../server/cloud/snapshots/miniAppSnapshotSyncProtocol.ts';
import { buildMiniAppSnapshotRevocationCandidate } from '../server/cloud/snapshots/miniAppSnapshotBuilder.ts';

// Run the real Worker against the real SQL schemas in memory. Substitute ONLY
// Telegram's public verification key in the in-memory module with a fixture key;
// no production source, credentials, authentication checks or hashes are changed.
const telegramKeys = generateKeyPairSync('ed25519');
const publicHex = telegramKeys.publicKey.export({ format: 'der', type: 'spki' }).subarray(-32).toString('hex');
const workerSource = fs.readFileSync('deployment/cloudflare-pages/_worker.js', 'utf8');
const fixtureSource = workerSource.replace(/const TELEGRAM_TEST_PUBLIC_KEY_HEX = "[a-f0-9]+";/, `const TELEGRAM_TEST_PUBLIC_KEY_HEX = "${publicHex}";`);
assert.notEqual(fixtureSource, workerSource);
const { default: edge, deriveTelegramSubjectKey, openEdgeSession } = await import(`data:text/javascript;base64,${Buffer.from(fixtureSource).toString('base64')}`);
const db = new DatabaseSync(':memory:');
for (const file of ['0001_edge_snapshot.sql', '0002_manager_read_snapshot.sql']) db.exec(fs.readFileSync(`deployment/cloudflare-pages/schema/${file}`, 'utf8'));
const connector = generateKeyPairSync('ed25519');
const installationId = 'inst_abcdefghijklmnopqrstuvwx';
const tenantId = 'tenant_e2e';
const botId = '123456789';
const origin = 'https://miniapp.example.com';
const telegramUserId = '930001';
const now = new Date();
db.prepare('INSERT INTO tenant_installations VALUES(?,?,?,?,?,?,?,?,?,?)').run(installationId, tenantId, 1, connector.publicKey.export({ format: 'pem', type: 'spki' }).toString(), botId, new URL(origin).hostname, 'https://live.example.com', 'active', now.toISOString(), now.toISOString());
const env = {
  KOUROSH_TELEGRAM_ENVIRONMENT: 'test',
  KOUROSH_EDGE_SESSION_KEY: randomBytes(32).toString('base64url'),
  KOUROSH_EDGE_SUBJECT_PEPPER: randomBytes(32).toString('base64url'),
  KOUROSH_EDGE_DB: { prepare(sql) { return { bind(...args) { return {
    async first() { return db.prepare(sql).get(...args) || null; },
    async run() { return { meta: { changes: db.prepare(sql).run(...args).changes } }; },
  }; } }; } },
};
const expectedKey = deriveTelegramSubjectKey(env, tenantId, botId, telegramUserId);
assert.equal(expectedKey, deriveMiniAppSnapshotSubjectKey({ secret: Buffer.from(env.KOUROSH_EDGE_SUBJECT_PEPPER, 'base64url'), tenantId, botId, telegramUserId }));
for (const [tenant, bot, user] of [['other', botId, telegramUserId], [tenantId, '987654321', telegramUserId], [tenantId, botId, '930002']]) assert.notEqual(deriveTelegramSubjectKey(env, tenant, bot, user), expectedKey);
let lastSignedRequest;
const client = createMiniAppSnapshotSyncClient({ endpoint: origin + '/miniapp.html', installationId, credentialVersion: 1,
  signCanonical: value => sign(null, Buffer.from(value), connector.privateKey).toString('base64url'),
  fetchImpl: async (url, options) => {
    assert.equal(String(url), origin + '/cloud/v1/miniapp/snapshots');
    assert.equal(options.method, 'POST');
    assert.equal(options.headers['content-type'], 'application/json');
    lastSignedRequest = new Request(url, options);
    return edge.fetch(lastSignedRequest.clone(), env);
  },
});
const fields = new URLSearchParams({ auth_date: String(Math.floor(Date.now() / 1000)), user: JSON.stringify({ id: Number(telegramUserId), first_name: 'Fixture' }) });
const check = `${botId}:WebAppData\n${[...fields].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join('\n')}`;
fields.set('signature', sign(null, Buffer.from(check), telegramKeys.privateKey).toString('base64url'));
const auth = (workspaceKind, initData = fields.toString()) => edge.fetch(new Request(origin + '/api/miniapp/auth', { method: 'POST', headers: { 'content-type': 'application/json', origin }, body: JSON.stringify({ initData, ...(workspaceKind ? { workspaceKind } : {}) }) }), env);
const originalFetch = globalThis.fetch;
globalThis.fetch = async () => { throw new Error('fixture: live backend offline'); };
try {
  let version = 1;
  for (const kinds of [['manager'], ['partner'], ['customer'], ['manager', 'partner'], ['customer', 'partner'], ['manager', 'customer', 'partner']]) {
    db.exec('DELETE FROM manager_snapshots; DELETE FROM subject_snapshots;');
    for (const subjectKind of kinds) {
      const candidate = { schemaVersion: '1', tenantId, installationId, subjectKind, localSubjectId: 1, telegramUserId, snapshotVersion: version++, generatedAt: now.toISOString(), authorizationValidUntil: new Date(now.getTime() + (subjectKind === 'manager' ? 1 : 72) * 3600000).toISOString(), state: 'active', data: { profile: { displayName: subjectKind, ...(subjectKind === 'manager' ? { roleName: 'Admin' } : {}) }, ...(subjectKind === 'manager' ? { permissions: ['dashboard.read'], dashboard: {}, sales: {}, dues: {}, installmentDetails: {} } : {}) } };
      const synced = await client.syncCandidate(candidate, { botId });
      assert.equal(synced.ok, true, JSON.stringify(synced));
      const table = subjectKind === 'manager' ? 'manager_snapshots' : 'subject_snapshots';
      assert.equal(db.prepare(`SELECT subject_key FROM ${table} LIMIT 1`).get().subject_key, expectedKey);
    }
    const selected = kinds.includes('manager') ? 'manager' : kinds.includes('customer') ? 'customer' : 'partner';
    const response = await auth(); const body = await response.json();
    assert.equal(response.status, 200, JSON.stringify(body));
    assert.equal(body.data.identity.kind, selected === 'manager' ? 'staff' : selected);
    assert.equal(body.data.identity.workspaces[0].kind, selected);
    assert.equal((await openEdgeSession(env, body.data.sessionToken)).subjectKey, expectedKey);
    for (const kind of kinds) {
      const explicit = await (await auth(kind)).json();
      assert.equal(explicit.data.identity.kind, kind === 'manager' ? 'staff' : kind);
    }
    console.log(`PASS: signed sync -> D1 -> signed initData -> ${kinds.join('+')} authentication`);
  }
  // Workers rejects redirect:"error" before network I/O. Model that runtime
  // contract here so Node's more permissive fetch cannot hide this regression.
  const offlineAuth = await (await auth('manager')).json();
  let mode = 'live';
  let liveCalls = [];
  globalThis.fetch = async (url, options) => {
    if (options.redirect === 'error') throw new TypeError('Workers does not support redirect:error');
    assert.equal(options.redirect, 'manual');
    const route = new URL(url).pathname;
    liveCalls.push(route);
    if (mode === 'redirect' || (mode === 'read-redirect' && route !== '/api/miniapp/auth')) return new Response(null, { status: 302, headers: { location: 'https://untrusted.example/' } });
    if (mode === 'offline') throw new Error('fixture backend unavailable');
    if (route === '/api/miniapp/auth') return Response.json({ success: true, data: {
      identity: { kind: 'staff', subjectId: 1, telegramUserId, displayName: 'Fixture manager', roleName: 'Admin', capabilities: [], permissions: ['dashboard.read'] },
      sessionToken: 'fixture-local-session', expiresAt: new Date(Date.now() + 1800000).toISOString(),
    } });
    assert.equal(options.headers.get('authorization'), 'Bearer fixture-local-session');
    if (mode === 'read-5xx') return Response.json({ success: false }, { status: 502 });
    if (mode === 'read-timeout') throw new DOMException('fixture timeout', 'TimeoutError');
    return Response.json({ success: true, data: { liveFixture: true } });
  };
  const liveAuthResponse = await auth('manager');
  assert.equal(liveAuthResponse.headers.get('x-kourosh-data-source'), 'live');
  const liveAuthBody = await liveAuthResponse.json();
  assert.equal(Boolean((await openEdgeSession(env, liveAuthBody.data.sessionToken)).localSessionToken), true);
  const readDashboard = token => edge.fetch(new Request(origin + '/api/miniapp/manager/dashboard', { headers: { authorization: `Bearer ${token}` } }), env);
  const liveRead = await readDashboard(liveAuthBody.data.sessionToken);
  assert.equal(liveRead.headers.get('x-kourosh-data-source'), 'live');
  assert.equal((await liveRead.json()).data.liveFixture, true);
  liveCalls = [];
  assert.equal((await readDashboard(offlineAuth.data.sessionToken)).headers.get('x-kourosh-data-source'), 'live');
  assert.deepEqual(liveCalls, ['/api/miniapp/auth', '/api/miniapp/manager/dashboard'], 'snapshot session must reauthenticate before live read');
  for (mode of ['read-5xx', 'read-timeout', 'read-redirect', 'offline']) {
    liveCalls = [];
    const fallback = await readDashboard(liveAuthBody.data.sessionToken);
    assert.equal(fallback.status, 200);
    assert.equal(fallback.headers.get('x-kourosh-data-source'), 'snapshot');
    assert.equal(liveCalls.length, 1, 'redirect must never be followed');
  }
  mode = 'redirect'; liveCalls = [];
  const redirectedAuth = await auth('manager');
  assert.equal(redirectedAuth.headers.get('x-kourosh-data-source'), 'snapshot');
  assert.equal(liveCalls.length, 1);
  mode = 'offline';
  console.log('PASS: live auth/read, local session establishment, reauth, redirect rejection and unavailable read fallback');
  db.prepare('UPDATE manager_snapshots SET authorization_valid_until=?').run(new Date(now.getTime() - 1000).toISOString());
  assert.equal((await (await auth()).json()).data.identity.kind, 'customer');
  assert.equal((await auth('manager')).status, 503);
  const revoked = buildMiniAppSnapshotRevocationCandidate('manager', 1, { tenantId, installationId, telegramUserId, snapshotVersion: version++ });
  assert.equal((await client.syncCandidate(revoked, { botId })).ok, true);
  assert.equal((await auth('manager')).status, 403);
  assert.equal((await edge.fetch(lastSignedRequest.clone(), env)).status, 409, 'signed request replay must fail');
  const tampered = new URLSearchParams(fields); tampered.set('user', JSON.stringify({ id: 930002 }));
  assert.equal((await auth(undefined, tampered.toString())).status, 401);
  console.log('PASS: expired/revoked Manager, explicit workspace isolation, tampered Telegram signature and replay rejection');
} finally { globalThis.fetch = originalFetch; db.close(); }
