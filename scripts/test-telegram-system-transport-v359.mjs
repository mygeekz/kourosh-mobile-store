import assert from "node:assert/strict";
import http from "node:http";
import {
  SystemTelegramTransport,
  getSystemTelegramTransportStatus,
  resetSystemTelegramTransportDiscovery,
} from "../server/telegram/SystemTelegramTransport.ts";

const proxyKeys = ["HTTPS_PROXY", "https_proxy", "ALL_PROXY", "all_proxy", "HTTP_PROXY", "http_proxy"];
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
