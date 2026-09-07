import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { normalizeMiniAppStaticPublicPath } from "../server/miniapp/miniAppGatewayPolicy.mjs";
import { createMiniAppGateway } from "./serve-miniapp-gateway.mjs";

assert.equal(normalizeMiniAppStaticPublicPath("/assets/home-hero-12345678.webp"), "/assets/home-hero-12345678.webp");
assert.equal(normalizeMiniAppStaticPublicPath("/assets/home-hero.webp"), "/assets/home-hero.webp");
assert.equal(normalizeMiniAppStaticPublicPath("/assets/home-hero-12345678.png"), null, "only explicitly reviewed image formats are allowed");
assert.equal(normalizeMiniAppStaticPublicPath("/assets/%2e%2e/package.json"), null);

const distDir = fs.mkdtempSync(path.join(os.tmpdir(), "kourosh-webp-gateway-"));
fs.mkdirSync(path.join(distDir, "assets"), { recursive: true });
fs.writeFileSync(path.join(distDir, "miniapp.html"), "<!doctype html><title>Mini App</title>");
const expected = Buffer.from([0x52,0x49,0x46,0x46,0x04,0x00,0x00,0x00,0x57,0x45,0x42,0x50,0x56,0x50,0x38,0x20]);
fs.writeFileSync(path.join(distDir, "assets/home-hero-12345678.webp"), expected);

const server = createMiniAppGateway({
  distDir,
  publicHost: "miniapp.test",
  gatewayMode: "self_hosted",
  trustedEdgeMode: "none",
  logSink: () => {},
});
await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
});
const address = server.address();
assert.ok(address && typeof address === "object");
const response = await new Promise((resolve, reject) => {
  const req = http.request({
    host: "127.0.0.1",
    port: address.port,
    path: "/assets/home-hero-12345678.webp",
    method: "GET",
    headers: { Host: "miniapp.test" },
  }, (res) => {
    const chunks = [];
    res.on("data", (chunk) => chunks.push(chunk));
    res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
  });
  req.on("error", reject);
  req.end();
});
assert.equal(response.status, 200);
assert.equal(response.headers["content-type"], "image/webp");
assert.match(String(response.headers["cache-control"]), /immutable/);
assert.deepEqual(response.body, expected);

await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
fs.rmSync(distDir, { recursive: true, force: true });
console.log("Mini App v186 WebP Gateway regression passed: 200 image/webp + immutable cache.");
