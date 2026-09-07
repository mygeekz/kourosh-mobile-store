import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));
const stripComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
for (const file of [
  "server/telegram/DirectTelegramTransport.ts",
  "server/telegram/ProxyTelegramTransport.ts",
  "server/miniapp/miniAppGatewayRuntimeConfig.mjs",
  "server/miniapp/miniAppGatewayRuntimeConfig.d.mts",
  "scripts/serve-miniapp-gateway.mjs",
  "server/routes/settings.routes.ts",
  "scripts/test-connectivity-runtime-v160.mjs",
]) assert(exists(file), `${file} missing`);

const direct = stripComments(read("server/telegram/DirectTelegramTransport.ts"));
assert(direct.includes('from "node:http"') && direct.includes('from "node:https"'), "Direct must own native HTTP(S) client");
assert(direct.includes("agent: false"), "Direct must use a one-shot native Agent boundary");
assert(!/\bfetch\s*\(/.test(direct), "Direct transport must not use global fetch");
assert(!/process\.env\.(?:HTTP_PROXY|HTTPS_PROXY|http_proxy|https_proxy|TG_PROXY|NODE_USE_ENV_PROXY)/.test(direct), "Direct must not inspect or inherit ENV proxy controls");
assert(!/setGlobalDispatcher|delete\s+process\.env/.test(direct), "Direct must not mutate global Node proxy state");
assert(direct.includes("multipart/form-data") && direct.includes("request.timeoutMs"), "Direct must preserve multipart and per-request timeout/long-poll behavior");

const proxy = stripComments(read("server/telegram/ProxyTelegramTransport.ts"));
assert(proxy.includes("TELEGRAM_PROXY_NOT_CONFIGURED"), "Proxy must remain explicit/fail closed");
assert(!/directTelegramTransport|return\s+super\.request\(/.test(proxy), "Proxy must not fallback to Direct");
assert(direct.includes("HttpsProxyAgent") && direct.includes("SocksProxyAgent") && direct.includes("nodeFetch"), "Proxy branch must keep explicit application proxy agents");

const runtime = read("server/miniapp/miniAppGatewayRuntimeConfig.mjs");
for (const mode of ["disabled", "self_hosted", "external_tunnel", "relay"]) assert(runtime.includes(`"${mode}"`), `Gateway runtime mode missing: ${mode}`);
assert(runtime.includes("fs.renameSync(temp, file)"), "Gateway runtime config must commit atomically by temp+rename");
assert(runtime.includes("0o700") && runtime.includes("0o600"), "Gateway runtime config permissions must be conservative best-effort");
assert(!/Bot Token|telegram_bot_token|proxy_password|initData|financial/i.test(runtime), "Gateway runtime config module must not persist secrets/business data");
assert(!/\/proc\/|cloudRuntimeState|abstract unix/i.test(runtime), "Store Gateway runtime config must remain platform-neutral");

const gateway = read("scripts/serve-miniapp-gateway.mjs");
assert(gateway.includes("readMiniAppGatewayRuntimeConfig"), "Standalone Gateway must consume server-owned runtime config");
assert(gateway.indexOf("readMiniAppGatewayRuntimeConfig") < gateway.indexOf("process.env.KOUROSH_MINIAPP_PUBLIC_HOST"), "Runtime config must be part of Gateway resolution before legacy ENV fallback declaration");
assert(gateway.includes('runtime.mode === "disabled"') && gateway.includes('runtime.mode === "external_tunnel"') && gateway.includes('runtime.mode === "relay"'), "Gateway mode mapping incomplete");
assert(gateway.includes('gatewayMode === "disabled"') && gateway.includes('503'), "Disabled runtime must fail closed");
assert(!/req\.headers\s*\[\s*["'"]x-forwarded-host["'"]\s*\]/i.test(stripComments(gateway)), "Gateway must not trust public X-Forwarded-Host");
assert(gateway.includes("x-kourosh-relay-auth") && gateway.includes("readGatewayRelayAssignment"), "Relay Gateway auth/assignment must remain mandatory");

const routes = read("server/routes/settings.routes.ts");
assert(routes.includes("writeMiniAppGatewayRuntimeConfigFromSettings(savedSettings)"), "Settings save must write standalone Gateway runtime config");
assert(routes.includes("gatewayRestartRequired: false"), "Settings response must report live runtime-config application");
assert(routes.indexOf("const savedKeys = await persistScopedSettings(scoped)") < routes.indexOf("writeMiniAppGatewayRuntimeConfigFromSettings(savedSettings)"), "Runtime config write must follow successful Settings persistence");

const settingsScope = read("server/connectivity/settingsScopes.ts");
assert(settingsScope.includes("miniapp_public_access_mode") && /key\.startsWith\("telegram_"\)/.test(settingsScope), "Mini App runtime config must remain within existing Settings isolation model");
const connectorRuntime = read("server/cloud/cloudConnectorRuntime.ts");
assert(connectorRuntime.includes("relayRequiredByStrategies"), "Relay Connector lifecycle must remain strategy-driven");

const packageJson = JSON.parse(read("package.json"));
assert(String(packageJson.engines?.node || "").includes(">=24.0.0"), "Store engine must preserve Node 26 compatibility");

console.log(JSON.stringify({
  ok: true,
  directGlobalFetch: false,
  directEnvProxyInheritance: false,
  directGlobalProxyMutation: false,
  settingsDrivenGatewayRuntime: true,
  atomicGatewayRuntimeConfig: true,
  gatewayRuntimeConfigSecrets: 0,
  gatewayStrictHostValidationPreserved: true,
  relayInternalAuthPreserved: true,
  storeGatewayLinuxRuntimeImports: 0,
}, null, 2));
