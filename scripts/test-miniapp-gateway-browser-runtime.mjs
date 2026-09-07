#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";

const root = process.cwd();
const reservePort = () => new Promise((resolve, reject) => {
  const server = net.createServer();
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    const port = address && typeof address === "object" ? address.port : null;
    server.close((error) => error ? reject(error) : resolve(port));
  });
});

const port = await reservePort();
assert.ok(port);
const origin = `http://127.0.0.1:${port}`;
const gatewayLogs = [];
const gateway = spawn(process.execPath, [path.join(root, "scripts/serve-miniapp-gateway.mjs")], {
  cwd: root,
  env: {
    ...process.env,
    NODE_ENV: "test",
    KOUROSH_MINIAPP_GATEWAY_HOST: "127.0.0.1",
    KOUROSH_MINIAPP_GATEWAY_PORT: String(port),
    KOUROSH_MINIAPP_PUBLIC_HOST: `127.0.0.1:${port}`,
    KOUROSH_MINIAPP_EXTERNAL_PROTO: "http",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
gateway.stdout.on("data", (chunk) => gatewayLogs.push(String(chunk)));
gateway.stderr.on("data", (chunk) => gatewayLogs.push(String(chunk)));

const waitForGateway = async () => {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (gateway.exitCode !== null) throw new Error(`Gateway exited early:\n${gatewayLogs.join("")}`);
    try {
      const response = await fetch(`${origin}/healthz`);
      if (response.ok && await response.text() === "ok") return;
    } catch {
      // Starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Gateway did not become ready:\n${gatewayLogs.join("")}`);
};

try {
  await waitForGateway();
  const runtime = spawn(process.execPath, [path.join(root, "scripts/test-miniapp-foundation-runtime.mjs")], {
    cwd: root,
    env: { ...process.env, KOUROSH_MINIAPP_ORIGIN: origin },
    stdio: "inherit",
  });
  const exitCode = await new Promise((resolve, reject) => {
    runtime.once("error", reject);
    runtime.once("exit", (code) => resolve(code));
  });
  assert.equal(exitCode, 0, "Mini App browser matrix failed through the production Gateway");
} finally {
  gateway.kill("SIGTERM");
}

console.log("Mini App v150 production Gateway browser/runtime/network matrix passed");
