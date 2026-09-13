// Real built UI + real Worker + signed synthetic identities + in-memory D1.
// Only the live-origin transport and Telegram test public key are fixtures.
// No production requests, credentials, database writes or UI changes.
// Run with the same TS loader flags as test-miniapp-release-identity-e2e.mjs.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { generateKeyPairSync, randomBytes, sign } from 'node:crypto';
import puppeteer from 'puppeteer-core';
import { resolvePuppeteerBrowserExecutable, browserLaunchArgs } from './lib/resolve-browser-executable.mjs';
import { fixtures, permissions } from './fixtures/miniapp-manager-ui.mjs';
import { createMiniAppSnapshotSyncClient } from '../server/cloud/snapshots/miniAppSnapshotSyncClient.ts';

const output = await fs.mkdtemp(path.join(os.tmpdir(), 'kourosh-worker-provenance-'));
const dist = path.resolve('dist-miniapp');
const source = await fs.readFile('deployment/cloudflare-pages/_worker.js', 'utf8');
assert.equal(await fs.readFile(path.join(dist, '_worker.js'), 'utf8'), source, 'test the current deployed artifact');
const telegram = generateKeyPairSync('ed25519');
const publicHex = telegram.publicKey.export({ format: 'der', type: 'spki' }).subarray(-32).toString('hex');
const fixtureSource = source.replace(/const TELEGRAM_TEST_PUBLIC_KEY_HEX = "[a-f0-9]+";/, `const TELEGRAM_TEST_PUBLIC_KEY_HEX = "${publicHex}";`);
assert.notEqual(fixtureSource, source);
const { default: worker, openEdgeSession } = await import(`data:text/javascript;base64,${Buffer.from(fixtureSource).toString('base64')}`);
const db = new DatabaseSync(':memory:');
for (const file of ['0001_edge_snapshot.sql', '0002_manager_read_snapshot.sql']) db.exec(await fs.readFile(`deployment/cloudflare-pages/schema/${file}`, 'utf8'));
const connector = generateKeyPairSync('ed25519');
const installationId = 'inst_abcdefghijklmnopqrstuvwx', tenantId = 'tenant_ui', botId = '123456789', telegramUserId = '930001';
const origin = 'https://miniapp.example.com';
const generatedAt = new Date(Date.now() - 40 * 60000).toISOString();
db.prepare('INSERT INTO tenant_installations VALUES(?,?,?,?,?,?,?,?,?,?)').run(installationId, tenantId, 1, connector.publicKey.export({ format: 'pem', type: 'spki' }).toString(), botId, new URL(origin).hostname, 'https://live.example.com', 'active', generatedAt, generatedAt);
const env = {
  KOUROSH_TELEGRAM_ENVIRONMENT: 'test', KOUROSH_EDGE_SESSION_KEY: randomBytes(32).toString('base64url'), KOUROSH_EDGE_SUBJECT_PEPPER: randomBytes(32).toString('base64url'),
  KOUROSH_EDGE_DB: { prepare(sql) { return { bind(...args) { return {
    async first() { return db.prepare(sql).get(...args) || null; },
    async run() { return { meta: { changes: db.prepare(sql).run(...args).changes } }; },
  }; } }; } },
};
const client = createMiniAppSnapshotSyncClient({ endpoint: origin, installationId, credentialVersion: 1,
  signCanonical: value => sign(null, Buffer.from(value), connector.privateKey).toString('base64url'),
  fetchImpl: (url, options) => worker.fetch(new Request(url, options), env),
});
assert.equal((await client.syncCandidate({ schemaVersion: '1', tenantId, installationId, subjectKind: 'manager', localSubjectId: 1, telegramUserId,
  snapshotVersion: 1, generatedAt, authorizationValidUntil: new Date(new Date(generatedAt).getTime() + 3600000).toISOString(), state: 'active',
  data: { profile: { displayName: 'مدیر آزمایشی', roleName: 'Admin' }, permissions, dashboard: fixtures['/dashboard'], sales: {}, dues: {}, installmentDetails: {} },
}, { botId })).ok, true);
const fields = new URLSearchParams({ auth_date: String(Math.floor(Date.now() / 1000)), user: JSON.stringify({ id: Number(telegramUserId), first_name: 'Fixture' }) });
const canonical = `${botId}:WebAppData\n${[...fields].sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join('\n')}`;
fields.set('signature', sign(null, Buffer.from(canonical), telegram.privateKey).toString('base64url'));
const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
const server = http.createServer(async (req, res) => {
  const file = path.resolve(dist, '.' + new URL(req.url, 'http://localhost').pathname);
  if (!file.startsWith(dist + path.sep)) return res.writeHead(403).end();
  try { res.writeHead(200, { 'content-type': mime[path.extname(file)] || 'application/octet-stream' }).end(await fs.readFile(file)); }
  catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const localOrigin = `http://127.0.0.1:${server.address().port}`;
const originalFetch = globalThis.fetch, originalInfo = console.info;
let mode = 'live', trace = [], logs = [], liveCalls = [], browser;
const results = [], errors = [];
console.info = value => {
  const record = JSON.parse(value);
  // Persist only the existing Worker's allowlisted non-secret telemetry fields.
  if (String(record.event).startsWith('live_')) logs.push({ event: record.event, route: record.route, status: record.status, reason: record.reason, durationMs: record.durationMs });
};
globalThis.fetch = async (url, options) => {
  assert.equal(new URL(url).origin, 'https://live.example.com');
  assert.equal(options.redirect, 'manual', 'regression: workerd rejects redirect:error before network I/O');
  const route = new URL(url).pathname;
  liveCalls.push(route);
  if (mode === 'offline') throw new Error('fixture offline');
  if (mode === 'redirect') return new Response(null, { status: 302, headers: { location: 'https://untrusted.example/' } });
  if (route === '/api/miniapp/auth') return Response.json({ success: true, data: {
    identity: { kind: 'staff', subjectId: 1, telegramUserId, displayName: 'مدیر آزمایشی', roleName: 'Admin', permissions, capabilities: [] },
    sessionToken: 'fixture-local-session', expiresAt: new Date(Date.now() + 1800000).toISOString(),
  } });
  assert.equal(route, '/api/miniapp/manager/dashboard');
  assert.equal(options.headers.get('authorization'), 'Bearer fixture-local-session');
  if (mode === 'read-502') return Response.json({ success: false }, { status: 502 });
  return Response.json({ success: true, data: fixtures['/dashboard'] });
};
try {
  const executable = await resolvePuppeteerBrowserExecutable({ root: process.cwd() });
  browser = await puppeteer.launch({ executablePath: executable.executablePath, args: browserLaunchArgs(), headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });
  page.on('pageerror', () => errors.push('browser-render-error'));
  await page.evaluateOnNewDocument(initData => {
    const noop = () => {};
    window.Telegram = { WebApp: { initData, colorScheme: 'light', themeParams: {}, platform: 'android', version: '9.0', ready: noop, expand: noop, onEvent: noop, offEvent: noop, BackButton: { show: noop, hide: noop, onClick: noop, offClick: noop } } };
  }, fields.toString());
  await page.setRequestInterception(true);
  page.on('request', async request => {
    try {
      const url = new URL(request.url());
      if (url.protocol === 'data:') return request.continue();
      if (url.origin === 'https://telegram.org' && url.pathname === '/js/telegram-web-app.js') return request.respond({ status: 200, contentType: 'application/javascript', body: '' });
      assert.equal(url.origin, localOrigin, 'no external browser requests permitted');
      if (!url.pathname.startsWith('/api/')) return request.continue();
      const headers = new Headers(request.headers());
      headers.set('origin', origin); headers.delete('host'); headers.delete('referer');
      const response = await worker.fetch(new Request(origin + url.pathname + url.search, { method: request.method(), headers, ...(request.method() === 'POST' ? { body: request.postData() } : {}) }), env);
      const body = await response.text();
      const item = { route: url.pathname, status: response.status, source: response.headers.get('x-kourosh-data-source') };
      if (url.pathname === '/api/miniapp/auth' && response.ok) item.localSessionEstablished = Boolean((await openEdgeSession(env, JSON.parse(body).data.sessionToken)).localSessionToken);
      trace.push(item);
      // Crucially, forward the real Worker's metadata; never synthesize a live header.
      await request.respond({ status: response.status, headers: Object.fromEntries(response.headers), body });
    } catch {
      errors.push('fixture-request-failed');
      if (!request.isInterceptResolutionHandled()) await request.abort();
    }
  });
  const selector = 'section[aria-label="وضعیت تازگی اطلاعات"]';
  const verify = async (label, expected, reload) => {
    trace = []; logs = []; liveCalls = [];
    if (reload) await page.goto(localOrigin + '/miniapp.html');
    else await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await page.waitForFunction((selector, text) => document.querySelector(selector)?.innerText.includes(text) && document.querySelector(selector)?.getAttribute('aria-busy') !== 'true', {}, selector, expected === 'live' ? 'اتصال زنده برقرار است' : 'اتصال زنده برقرار نیست');
    await page.waitForSelector('[data-field="todayAmount"]');
    assert.deepEqual(errors, []);
    const read = trace.find(item => item.route === '/api/miniapp/manager/dashboard');
    assert.equal(read?.status, 200); assert.equal(read.source, expected);
    const text = await page.$eval(selector, el => el.innerText);
    assert.equal(text.includes('اطلاعات زنده'), expected === 'live');
    if (expected === 'snapshot') {
      assert.ok(text.includes('اطلاعات با تأخیر'));
      assert.ok(!text.includes('اتصال زنده برقرار است'));
    }
    await page.evaluate(async () => { await document.fonts.ready; window.scrollTo(0, 0); });
    await page.screenshot({ path: path.join(output, `${label}.png`), fullPage: false });
    results.push({ label, expected, trace, logs, liveCalls, renderedText: text });
  };
  mode = 'live'; await verify('live', 'live', true);
  assert.equal(trace.find(item => item.route.endsWith('/auth')).localSessionEstablished, true);
  mode = 'read-502'; await verify('auth-live-read-502', 'snapshot', true);
  assert.equal(trace.find(item => item.route.endsWith('/auth')).source, 'live', 'auth success must not mask read fallback');
  assert.ok(logs.some(item => item.event === 'live_read_5xx' && item.status === 502));
  mode = 'offline'; await verify('offline', 'snapshot', true);
  assert.equal(trace.find(item => item.route.endsWith('/auth')).localSessionEstablished, false);
  assert.ok(logs.some(item => item.reason === 'network_error'));
  mode = 'live'; await verify('reauth-recovery', 'live', false);
  assert.deepEqual(liveCalls, ['/api/miniapp/auth', '/api/miniapp/manager/dashboard']);
  mode = 'redirect'; await verify('redirect-rejected', 'snapshot', true);
  assert.ok(logs.some(item => item.reason === 'redirect_rejected'));
  console.log(`PASS: ${results.length} real Worker -> built browser provenance scenarios; screenshots: ${output}`);
} finally {
  await fs.writeFile(path.join(output, 'results.json'), JSON.stringify({ results, errors }, null, 2));
  await browser?.close(); await new Promise(resolve => server.close(resolve));
  globalThis.fetch = originalFetch; console.info = originalInfo; db.close();
}
