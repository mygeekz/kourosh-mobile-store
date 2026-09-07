import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const assert = (ok, message) => { if (!ok) throw new Error(message); };

const marker = read('KOUROSH_SOURCE_VERSION').trim();
const panel = read('pages/settings/SettingsTelegramPanel.tsx');
const telegramCss = read('styles/pages/telegram.css');

assert(marker === 'v239', `Expected KOUROSH_SOURCE_VERSION=v239, got ${marker || '(empty)'}`);
assert(panel.includes('data-ui-telegram-connectivity="flat"'), 'Flat Telegram connectivity marker is missing.');
assert(panel.includes('mt-5 space-y-4 border-t border-slate-200 pt-5'), 'v238/v239 flat connectivity section classes are missing.');
assert(!panel.includes('mt-4 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm'), 'Legacy nested connectivity shell is still present.');
assert(telegramCss.includes('--tg-v83-muted: var(--ds-text-secondary);'), 'Telegram muted token is not using the text-secondary token.');

console.log(JSON.stringify({
  ok: true,
  sourceVersion: marker,
  flatConnectivityDom: true,
  legacyConnectivityShellRemoved: true,
  mutedTextTokenFixed: true,
}, null, 2));
