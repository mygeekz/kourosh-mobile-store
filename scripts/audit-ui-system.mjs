import { spawnSync } from 'node:child_process';

const checks = [
  ['UI manifest', 'scripts/audit-ui-manifest.mjs'],
  ['Style manifest', 'scripts/audit-style-manifest.mjs'],
  ['UI architecture lock', 'scripts/audit-ui-architecture-lock.mjs'],
  ['UI boundaries', 'scripts/audit-ui-boundaries.mjs'],
  ['UI foundation Phase 0 baseline', 'scripts/audit-ui-foundation-phase0-v268.mjs'],
  ['UI foundation Phase 1 form controls', 'scripts/audit-ui-foundation-phase1-v269.mjs'],
  ['UI foundation Phase 2 overlays', 'scripts/audit-ui-foundation-phase2-v270.mjs'],
  ['UI foundation Phase 3 validation/form grid/BiDi', 'scripts/audit-ui-foundation-phase3-v271.mjs'],
  ['UI foundation Phase 4 application forms', 'scripts/audit-ui-foundation-phase4-v272.mjs'],
  ['UI foundation Phase 5 dialog/modal/drawer hardening', 'scripts/audit-ui-foundation-phase5-v273.mjs'],
  ['Settings user-modal context regression', 'scripts/audit-settings-modal-context-v273.mjs'],
  ['Settings unresolved local identifier guard', 'scripts/audit-settings-context-free-identifiers-v273.mjs'],
  ['Repair intake temporary-draft persistence regression', 'scripts/audit-repair-intake-draft-save-v273.mjs'],
  ['Repair intake committed-save transition regression', 'scripts/audit-repair-intake-submit-transition-v273.mjs'],
  ['Repair receipt + Kanban runtime regression', 'scripts/audit-repair-runtime-kanban-v273.mjs'],
  ['Toast compositor / repair status white-screen regression', 'scripts/audit-toast-compositor-safety-v273.mjs'],
  ['Toast host / repair status white-screen regression v274', 'scripts/audit-toast-host-safety-v274.mjs'],
  ['Global selection/button runtime styling regression v275', 'scripts/audit-global-selection-button-v275.mjs'],
  ['Button/Template enforcement v285', 'scripts/audit-button-template-enforcement-v285.mjs'],
  ['Table System unification v286', 'scripts/audit-table-system-unification-v286.mjs'],
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
