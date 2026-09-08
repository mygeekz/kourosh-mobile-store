import assert from "node:assert/strict";
import http from "node:http";
import {
  SystemTelegramTransport,
  getSystemTelegramTransportStatus,
  resetSystemTelegramTransportDiscovery,
} from "../server/telegram/SystemTelegramTransport.ts";

const proxyKeys = ["KOUROSH_TELEGRAM_PROXY_URL", "HTTPS_PROXY", "https_proxy", "ALL_PROXY", "all_proxy", "HTTP_PROXY", "http_proxy"];
const saved = Object.fromEntries(proxyKeys.map((key) => [key, process.env[key]]));
for (const key of proxyKeys) delete process.env[key];

const server = http.createServer((req, res) => {
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify({ ok: true, result: { username: "kourosh_test_bot", path: req.url } }));
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
assert.ok(address && typeof address === "object");

try {
  resetSystemTelegramTransportDiscovery();
  const transport = new SystemTelegramTransport({
    apiBaseUrl: `http://127.0.0.1:${address.port}`,
    environment: "test",
  });
  const result = await transport.request({
    botToken: "123456789:abcdefghijklmnopqrstuvwxyzABCDE",
    method: "getMe",
    httpMethod: "GET",
    timeoutMs: 2500,
  });
  assert.equal(result.success, true);
  assert.equal(result.details?.transportRoute, "system_network");
  assert.equal(getSystemTelegramTransportStatus().preferred?.source, "system_network");
  // Verify precedence and credential redaction without sending fixture credentials.
  process.env.KOUROSH_TELEGRAM_PROXY_URL = 'http://fixture-user:fixture-password@127.0.0.1:12345';
  resetSystemTelegramTransportDiscovery();
  const routes = [];
  const configured = new SystemTelegramTransport();
  configured.requestWithNetwork = async (_request, options) => {
    routes.push(options.proxyUrl);
    return { success: true, status: 200, data: { ok: true } };
  };
  assert.equal((await configured.request({ botToken: 'fixture', method: 'getMe' })).success, true);
  assert.equal(routes[0], process.env.KOUROSH_TELEGRAM_PROXY_URL);
  assert.doesNotMatch(JSON.stringify(getSystemTelegramTransportStatus()), /fixture-user|fixture-password/);
  process.env.KOUROSH_TELEGRAM_PROXY_URL = 'invalid-proxy';
  const invalid = await configured.request({ botToken: 'fixture', method: 'getMe' });
  assert.equal(invalid.success, false);
  assert.equal(invalid.errorCode, 'TELEGRAM_PROXY_NOT_CONFIGURED');
  assert.equal(routes.length, 1, 'invalid explicit proxy must fail before network access');
  delete process.env.KOUROSH_TELEGRAM_PROXY_URL;
  console.log(JSON.stringify({
    ok: true,
    release: "v359",
    fallbackRoute: result.details?.transportRoute,
    preferredRoute: getSystemTelegramTransportStatus().preferred?.source,
  }, null, 2));
} finally {
  await new Promise((resolve) => server.close(resolve));
  for (const key of proxyKeys) {
    if (saved[key] == null) delete process.env[key];
    else process.env[key] = saved[key];
  }
  resetSystemTelegramTransportDiscovery();
}
