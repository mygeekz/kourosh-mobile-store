import fs from 'node:fs';

const read = (p) => fs.readFileSync(p, 'utf8');
const failures = [];
const assert = (ok, msg) => { if (!ok) failures.push(msg); };

const version = read('KOUROSH_SOURCE_VERSION').trim();
const panel = read('pages/settings/SettingsTelegramPanel.tsx');
const logs = read('components/TelegramLogsPanel.tsx');
const operations = read('pages/settings/useSettingsTelegramOperationActions.ts');
const connectionViewModels = read('pages/settings/settingsTelegramConnectionViewModels.ts');
const currentTelegramSources = [panel, logs, operations, connectionViewModels].join('\n');

assert(version === 'v245', `KOUROSH_SOURCE_VERSION must be v245; found ${version || '(missing)'}`);
assert(panel.includes('id="telegram-settings-form-standard"'), 'Telegram settings must use the standard form id.');
assert(!panel.includes('id="telegram-settings-form"'), 'Legacy telegram-settings-form id must not remain.');
assert(!panel.includes('telegram-redesign-v1') && !panel.includes('telegram-redesign-v2') && !panel.includes('telegram-apple-base'), 'Legacy Telegram redesign wrappers must be removed.');

const customClassPattern = /(className|wrapperClassName|contentClassName)\s*=\s*(?:"[^"]*\b(?:telegram-|tg-|ops-)[^"]*"|\{`[^`]*\b(?:telegram-|tg-|ops-)[^`]*`\})/g;
assert(!customClassPattern.test(panel), 'SettingsTelegramPanel still contains Telegram/ops custom CSS class names.');
customClassPattern.lastIndex = 0;
assert(!customClassPattern.test(logs), 'TelegramLogsPanel still contains Telegram/ops custom CSS class names.');
assert(!/classList\.(?:add|remove|toggle)\([^\n]*(?:telegram-|tg-|ops-)/.test(logs), 'TelegramLogsPanel still mutates Telegram-specific custom CSS classes at runtime.');

for (const legacyPrefix of ['tg-anchor-', 'tg-item-', 'tg-audience-']) {
  assert(!currentTelegramSources.includes(legacyPrefix), `Legacy CSS target prefix ${legacyPrefix} must not remain in current Telegram sources.`);
}

for (const arbitrary of ['rounded-[', 'grid-cols-[', 'shadow-[', 'text-[', 'min-h-[', 'max-h-[', 'w-[', 'h-[', 'gap-[']) {
  assert(!panel.includes(arbitrary), `Telegram settings must not use arbitrary Tailwind value ${arbitrary}.`);
  assert(!logs.includes(arbitrary), `Telegram logs must not use arbitrary Tailwind value ${arbitrary}.`);
}

assert(panel.includes('variant="secondary" size="xs" leftIcon={<i className="fa-solid fa-star" />}>رفتن به مهم‌ترین‌ها'), 'Smart navigation action must use readable secondary button styling.');
assert(panel.includes('variant="secondary" size="xs" leftIcon={<i className="fa-solid fa-filter-circle-xmark" />}>تمرکز روی ناقص‌ها'), 'Incomplete-filter action must use readable secondary button styling.');
assert(panel.includes('className={`flex min-h-10 items-center gap-2 rounded-xl border px-3 py-2 text-right text-sm font-black transition'), 'Template mode tiles must use compact horizontal icon/title layout.');
assert(panel.includes('grid w-full grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4'), 'Template mode layout must remain responsive.');
assert(panel.includes('grid grid-cols-2 gap-px overflow-hidden rounded-xl border'), 'Template summary metrics must use one compact grouped surface instead of four oversized cards.');
assert(panel.includes('grid grid-cols-1 gap-3 sm:grid-cols-3'), 'Top Telegram status cards must remain compact and responsive.');
assert(logs.includes('overflow-x-auto rounded-xl border'), 'Telegram logs table must use local horizontal scrolling.');
assert(!logs.includes('tg-logs-detail-modal-overlay') && !logs.includes('tg-log-modal-open'), 'Telegram logs modal must use the shared Modal/DialogShell without custom overlay/body CSS hooks.');
assert(!logs.includes('tg-quick-fix-spotlight'), 'Telegram quick-fix navigation must not depend on custom spotlight CSS.');

if (failures.length) {
  console.error(JSON.stringify({ audit: 'telegram-standard-ui-v245', ok: false, failures }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({
  audit: 'telegram-standard-ui-v245',
  ok: true,
  checks: {
    legacyTelegramCssDependencyRemoved: true,
    customTelegramClassNamesRemoved: true,
    legacyIdCssTargetsRemoved: true,
    arbitraryTelegramUtilitiesRemoved: true,
    smartButtonsReadable: true,
    compactIconTitleTiles: true,
    groupedCompactMetrics: true,
    responsiveCards: true,
    logsUseLocalTableScroll: true,
    logsUseSharedModalBehavior: true,
  },
}, null, 2));
