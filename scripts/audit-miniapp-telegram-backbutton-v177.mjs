import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const telegram = fs.readFileSync(path.join(root, "miniapp/telegram.ts"), "utf8");
const shell = fs.readFileSync(path.join(root, "miniapp/components/MiniAppShell.tsx"), "utf8");
const boundary = fs.readFileSync(path.join(root, "miniapp/components/MiniAppErrorBoundary.tsx"), "utf8");

assert.match(telegram, /configureTelegramBackButton/);
assert.match(telegram, /typeof backButton\.onClick !== "function" \|\| typeof backButton\.offClick !== "function"/);
assert.match(telegram, /backButton\.hide\?\.\(\)/);
assert.match(telegram, /backButton\.show\?\.\(\)/);
assert.match(telegram, /backButton\.offClick\?\.\(options\.onBack\)/);
assert.match(shell, /return configureTelegramBackButton\(webApp, \{ isHome, onBack: goBack \}\);/);
assert.doesNotMatch(shell, /webApp\.BackButton\.(?:show|hide|onClick|offClick)\(/);
assert.match(boundary, /\[miniapp-render-error\]/);
console.log("Mini App Telegram BackButton compatibility audit passed.");
