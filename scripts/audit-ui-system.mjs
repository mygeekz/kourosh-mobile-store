import { spawnSync } from 'node:child_process';

const checks = [
  ['UI manifest', 'scripts/audit-ui-manifest.mjs'],
  ['Style manifest', 'scripts/audit-style-manifest.mjs'],
  ['UI architecture lock', 'scripts/audit-ui-architecture-lock.mjs'],
  ['UI boundaries', 'scripts/audit-ui-boundaries.mjs'],
  ['Dialog foundation', 'scripts/audit-dialog-foundation.mjs'],
  ['Modal field foundation', 'scripts/audit-modal-field-foundation.mjs'],
  ['Dialog form primitives', 'scripts/audit-dialog-form-primitives.mjs'],
  ['Settings and inventory form primitives', 'scripts/audit-settings-inventory-form-primitives.mjs'],
  ['Messaging and report filter primitives', 'scripts/audit-messaging-report-filter-primitives.mjs'],
  ['Report tooling filter primitives', 'scripts/audit-report-tooling-filter-primitives.mjs'],
  ['Percent formatter contract', 'scripts/audit-percent-format-contract.mjs'],
  ['Core workspace primitives and installment dark contract', 'scripts/audit-core-workspace-primitives-and-installment-dark.mjs'],
  ['Installment sales UI contract', 'scripts/audit-installment-sales-ui-contract.mjs'],
  ['Installment sale create contract', 'scripts/audit-installment-sale-create-contract.mjs'],
  ['Sales, cart and repair select primitives', 'scripts/audit-sales-cart-repair-select-primitives.mjs'],
  ['Select foundation completion', 'scripts/audit-select-foundation-completion.mjs'],
  ['People, partner and repair modal dark contract', 'scripts/audit-people-partner-repair-modal-dark.mjs'],
  ['Dashboard surface contract', 'scripts/audit-dashboard-surface-contract.mjs'],
  ['Dashboard widget contract', 'scripts/audit-dashboard-widgets-contract.mjs'],
  ['Dashboard clock contract', 'scripts/audit-dashboard-clock-contract.mjs'],
  ['Header contract', 'scripts/audit-header-contract.mjs'],
  ['Tooltip contract', 'scripts/audit-tooltip-contract.mjs'],
  ['Command palette contract', 'scripts/audit-command-palette-ui-contract.mjs'],
  ['Sidebar contract', 'scripts/audit-sidebar-contract.mjs'],
];

for (const [label, script] of checks) {
  console.log(`\n[UI system] ${label}`);
  const result = spawnSync(process.execPath, [script], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log('\nUI governance audits passed.');
