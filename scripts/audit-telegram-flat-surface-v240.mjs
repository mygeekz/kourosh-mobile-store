import fs from 'node:fs';
const read = (p) => fs.readFileSync(p, 'utf8');
const panel = read('pages/settings/SettingsTelegramPanel.tsx');
const tg = read('styles/system/ui-contracts/telegram-v82-final-visible-fixes.css');
const ui = read('styles/system/ui-personalization-foundation.css');
const version = read('KOUROSH_SOURCE_VERSION').trim();
const checks = {
  version: ['v240', 'v241'].includes(version),
  marker: panel.includes('data-ui-telegram-surface="flat-v240"') || panel.includes('data-ui-telegram-surface="compact-v241"'),
  rootFlat: tg.includes('#telegram-settings-form.telegram-redesign-v1.telegram-redesign-v2.telegram-apple-base-v29') && tg.includes('background: transparent !important;'),
  executiveCopyFlat: tg.includes('.telegram-executive-copy') && tg.includes('min-height: 0 !important;'),
  pulseNotCard: tg.includes('.telegram-executive-pulse') && tg.includes('border-inline-start: 1px solid var(--tg-v2-border) !important;'),
  workspaceFlat: ui.includes('[data-settings-active-tab="telegram"]') && ui.includes('Telegram workspace is structural, not another card'),
};
const failed = Object.entries(checks).filter(([, ok]) => !ok);
console.log(JSON.stringify(checks, null, 2));
if (failed.length) process.exit(1);
