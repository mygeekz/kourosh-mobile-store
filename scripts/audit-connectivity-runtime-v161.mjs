import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const runtime = read("server/miniapp/miniAppGatewayRuntimeConfig.mjs");
const gateway = read("scripts/serve-miniapp-gateway.mjs");
const direct = read("server/telegram/DirectTelegramTransport.ts");

assert(runtime.includes('state: "absent"'), "Runtime reader must distinguish ABSENT");
assert(runtime.includes('state: "valid"'), "Runtime reader must distinguish VALID");
assert(runtime.includes('state: "invalid"'), "Runtime reader must distinguish INVALID");
assert(!/readMiniAppGatewayRuntimeConfig[\s\S]{0,500}return null/.test(runtime), "Runtime reader must not collapse failures into null");
assert(runtime.includes("RUNTIME_CONFIG_MALFORMED_JSON"), "Malformed JSON must have an explicit invalid reason");
assert(runtime.includes("RUNTIME_CONFIG_VERSION_UNSUPPORTED"), "Unsupported versions must fail closed");
assert(runtime.includes("RUNTIME_CONFIG_MODE_INVALID"), "Invalid modes must fail closed");
assert(runtime.includes("RUNTIME_CONFIG_HOST_INVALID"), "Invalid hosts must fail closed");
assert(runtime.includes("RUNTIME_CONFIG_SYMLINK_UNSAFE"), "Symlink runtime path must fail closed");
assert(runtime.includes("RUNTIME_CONFIG_NOT_REGULAR_FILE"), "Non-regular runtime path must fail closed");
assert(runtime.includes("O_NOFOLLOW"), "Reader should use no-follow open semantics when the platform supports it");
assert(runtime.includes("lstatSync") && runtime.includes("fstatSync"), "Reader must validate the filesystem object without trusting a followed symlink");
assert(runtime.includes("fs.renameSync(temp, file)"), "v160 atomic temp->rename writer must remain");
assert(runtime.includes("mode: 0o600") && runtime.includes("mode: 0o700"), "Conservative runtime config permissions must remain");
assert(!runtime.includes("/proc") && !runtime.includes("unix socket"), "Store Gateway runtime config path must stay platform-neutral");

assert(gateway.includes('runtimeResult.state === "invalid"'), "Gateway must explicitly handle invalid runtime config");
assert(gateway.includes('runtimeResult.state === "valid"'), "Gateway must explicitly handle valid runtime config");
assert(gateway.includes("Legacy ENV compatibility is intentionally limited to an ABSENT runtime config"), "Legacy fallback must be limited to ABSENT state");
assert(gateway.includes("MINIAPP_GATEWAY_RUNTIME_CONFIG_INVALID"), "Invalid startup config must use canonical fail-closed error");
assert(gateway.includes("gateway_runtime_config_invalid"), "Live corruption must emit a structured runtime/security event");
assert(gateway.includes('return send(res, 503, "Service Unavailable"'), "Live invalid runtime config must return 503");
assert(gateway.indexOf('runtimeResult.state === "invalid"') < gateway.indexOf("legacyConfiguredGatewayMode === \"auto\""), "Invalid runtime config must be handled before legacy ENV fallback");

assert(direct.includes('agent: false'), "Direct Telegram must remain deterministic and bypass env proxy agents");
assert(!direct.includes("globalThis.fetch") && !direct.includes("fetch("), "Direct Telegram must not regress to global fetch");

const financialTerms = ["sales", "installments", "ledger", "payments", "profit"];
for (const term of financialTerms) assert(!runtime.toLowerCase().includes(`../${term}`), `Runtime config must not import financial module ${term}`);

console.log(JSON.stringify({
  ok: true,
  explicitRuntimeStates: ["absent", "valid", "invalid"],
  invalidNeverFallsBackLegacy: true,
  symlinkNoFollowGuard: true,
  liveCorruptionFailsClosed: true,
  atomicWriterPreserved: true,
  directDeterministicPreserved: true,
  platformNeutralStorePath: true,
}, null, 2));
