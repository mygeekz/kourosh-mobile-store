import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import express from "express";
import { createMiniAppGateway, resolveGatewayClientIp } from "../../scripts/serve-miniapp-gateway.mjs";
import { createLoginRateLimiter } from "../middleware/loginRateLimiter.ts";
import { configureTrustedProxy } from "../middleware/trustedProxy.ts";

const listen = (server) => new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => resolve(server.address()));
});
const close = (server) => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));

const distDir = fs.mkdtempSync(path.join(os.tmpdir(), "kourosh-miniapp-gateway-"));
fs.mkdirSync(path.join(distDir, "assets"));
fs.mkdirSync(path.join(distDir, "fonts"));
fs.writeFileSync(path.join(distDir, "miniapp.html"), "<!doctype html><title>Mini App</title>");
fs.writeFileSync(path.join(distDir, "assets/app-12345678.js"), "console.log('miniapp')");
fs.writeFileSync(path.join(distDir, "assets/app-12345678.css"), "body{margin:0}");
fs.writeFileSync(path.join(distDir, "assets/home-hero-12345678.webp"), Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]));
fs.writeFileSync(path.join(distDir, "favicon.svg"), "<svg xmlns='http://www.w3.org/2000/svg'/>");
fs.writeFileSync(path.join(distDir, "kourosh-logo.svg"), "<svg xmlns='http://www.w3.org/2000/svg'/>");
fs.writeFileSync(path.join(distDir, "fonts/Vazir-FD-WOL.woff2"), Buffer.from([0, 1, 2]));

const upstreamRequests = [];
const upstreamApp = express();
configureTrustedProxy(upstreamApp);
upstreamApp.use(express.text({ type: "*/*", limit: "64kb" }));
upstreamApp.use((req, res, next) => {
  upstreamRequests.push({ url: req.url, method: req.method, headers: req.headers, body: req.body, clientIp: req.ip });
  res.setHeader("Cache-Control", "public, max-age=9999");
  next();
});
upstreamApp.post("/api/miniapp/auth", createLoginRateLimiter({ windowMs: 60_000, maxAttempts: 2 }), (req, res) => {
  res.status(401).json({ success: false, code: "INVALID", requestId: req.headers["x-request-id"] });
});
upstreamApp.get("/api/miniapp/*", (req, res) => res.json({ success: true, path: req.url, requestId: req.headers["x-request-id"] }));
const upstream = http.createServer(upstreamApp);
const upstreamAddress = await listen(upstream);
assert.ok(upstreamAddress && typeof upstreamAddress === "object");

const logs = [];
const gateway = createMiniAppGateway({
  distDir,
  apiHost: "127.0.0.1",
  apiPort: upstreamAddress.port,
  publicHost: "miniapp.test",
  trustedEdgeMode: "cloudflare",
  externalProto: "https",
  logSink: (line) => logs.push(line),
});
const gatewayAddress = await listen(gateway);
assert.ok(gatewayAddress && typeof gatewayAddress === "object");

const request = ({ path: requestPath = "/", method = "GET", host = "miniapp.test", headers = {}, body }) => new Promise((resolve, reject) => {
  const req = http.request({
    host: "127.0.0.1",
    port: gatewayAddress.port,
    path: requestPath,
    method,
    headers: { Host: host, ...headers },
  }, (res) => {
    const chunks = [];
    res.on("data", (chunk) => chunks.push(chunk));
    res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString("utf8") }));
  });
  req.on("error", reject);
  if (body !== undefined) req.write(body);
  req.end();
});

try {
  const root = await request({ path: "/" });
  assert.equal(root.status, 200);
  assert.match(root.body, /Mini App/);
  assert.match(String(root.headers["cache-control"]), /no-store/);
  assert.equal(root.headers["x-content-type-options"], "nosniff");
  assert.equal(root.headers["referrer-policy"], "no-referrer");
  assert.match(String(root.headers["permissions-policy"]), /camera=\(\)/);
  assert.match(String(root.headers["content-security-policy"]), /https:\/\/telegram\.org/);
  assert.match(String(root.headers["content-security-policy"]), /connect-src 'self'/);
  assert.equal(root.headers["x-frame-options"], undefined);

  const asset = await request({ path: "/assets/app-12345678.js" });
  assert.equal(asset.status, 200);
  assert.match(String(asset.headers["cache-control"]), /immutable/);
  assert.match(String(asset.headers["content-type"]), /javascript/);

  const webpAsset = await request({ path: "/assets/home-hero-12345678.webp" });
  assert.equal(webpAsset.status, 200);
  assert.equal(String(webpAsset.headers["content-type"]), "image/webp");
  assert.match(String(webpAsset.headers["cache-control"]), /immutable/);

  const health = await request({ path: "/healthz" });
  assert.equal(health.status, 200);
  assert.equal(health.body, "ok");
  assert.equal(health.headers["x-kourosh-gateway-version"], "v197");
  assert.doesNotMatch(health.body, /database|token|host|version|session/i);

  for (const route of ["/api/miniapp/me", "/api/miniapp/customer/home", "/api/miniapp/partner/home", "/api/miniapp/staff/home"]) {
    const response = await request({ path: route, headers: { Authorization: "Bearer safe-test-token", Cookie: "must-not-forward=1", "CF-Connecting-IP": "198.51.100.20", "X-Request-ID": "client-spoof-request-id" } });
    assert.equal(response.status, 200, route);
    assert.match(String(response.headers["cache-control"]), /no-store/);
  }
  const latest = upstreamRequests.at(-1);
  assert.equal(latest.headers.cookie, undefined);
  assert.equal(latest.headers.authorization, "Bearer safe-test-token");
  assert.equal(latest.headers["x-forwarded-for"], "198.51.100.20");
  assert.equal(latest.headers["x-forwarded-proto"], "https");
  assert.match(String(latest.headers["x-request-id"]), /^[0-9a-f-]{36}$/);

  const authHeaders = { "Content-Type": "application/json", "CF-Connecting-IP": "203.0.113.10", "X-Forwarded-For": "9.9.9.9" };
  assert.equal((await request({ path: "/api/miniapp/auth", method: "POST", headers: authHeaders, body: "{}" })).status, 401);
  assert.equal((await request({ path: "/api/miniapp/auth", method: "POST", headers: authHeaders, body: "{}" })).status, 401);
  assert.equal((await request({ path: "/api/miniapp/auth", method: "POST", headers: authHeaders, body: "{}" })).status, 429);
  assert.equal((await request({ path: "/api/miniapp/auth", method: "POST", headers: { ...authHeaders, "CF-Connecting-IP": "203.0.113.11" }, body: "{}" })).status, 401);
  assert.equal(upstreamRequests.filter((entry) => entry.url === "/api/miniapp/auth").at(-1).clientIp, "203.0.113.11");
  assert.equal(upstreamRequests.some((entry) => entry.clientIp === "9.9.9.9"), false, "client X-Forwarded-For must never win");

  assert.equal(resolveGatewayClientIp({ socket: { remoteAddress: "127.0.0.1" }, headers: { "x-forwarded-for": "8.8.8.8" } }, "none"), "127.0.0.1");
  assert.equal(resolveGatewayClientIp({ socket: { remoteAddress: "127.0.0.1" }, headers: { "cf-connecting-ip": "bad,1.1.1.1" } }, "cloudflare"), "127.0.0.1");

  for (const forbidden of ["/api/settings", "/api/users", "/api/backup", "/api/customers", "/uploads/avatar.png", "/index.html", "/sw.js", "/manifest.webmanifest", "/package.json", "/server/index.ts", "/.env", "/kourosh_inventory.db", "/assets/%2e%2e/package.json", "/assets/%252e%252e/package.json", "/assets/%00.js"]) {
    assert.equal((await request({ path: forbidden })).status, 404, forbidden);
  }
  for (const method of ["PUT", "PATCH", "DELETE"]) {
    assert.equal((await request({ path: "/api/miniapp/staff/home", method })).status, 405, method);
  }
  assert.equal((await request({ path: "/api/miniapp/me", method: "POST" })).status, 405);
  assert.equal((await request({ path: "/api/miniapp/me", method: "GET", headers: { "Content-Length": "2" }, body: "{}" })).status, 400);
  assert.equal((await request({ path: "/", method: "POST" })).status, 405);
  assert.equal((await request({ path: "/", host: "evil.example" })).status, 421);
  const oversized = await request({ path: "/api/miniapp/auth", method: "POST", headers: { "Content-Type": "application/json", "Content-Length": String(33 * 1024) }, body: "x".repeat(33 * 1024) });
  assert.equal(oversized.status, 413);

  assert.ok(logs.some((line) => line.includes('"event":"gateway_bad_host"')));
  assert.ok(logs.some((line) => line.includes('"event":"gateway_body_too_large"')));
  assert.ok(logs.some((line) => line.includes('"event":"gateway_rejected_path"')));
  assert.equal(logs.some((line) => /Bearer|safe-test-token|initData|Cookie|9\.9\.9\.9/.test(line)), false);
} finally {
  await close(gateway);
  await close(upstream);
  fs.rmSync(distDir, { recursive: true, force: true });
}

console.log("Mini App v150 gateway allowlist, host, body, IP, rate-limit isolation, static boundary and header tests passed");
