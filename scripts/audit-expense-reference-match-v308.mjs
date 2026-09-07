import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (file) => fs.readFileSync(file, 'utf8');
const version = read('KOUROSH_SOURCE_VERSION').trim();
const versionNumber = Number(version.replace(/^v/, ''));
assert.ok(Number.isInteger(versionNumber) && versionNumber >= 308, `Expected v308+, found ${version}`);

const expenses = read('pages/Expenses.tsx');
assert.ok(expenses.includes('panelClassName="expense-entry-modal"'), 'Expense modal must use the canonical reference modifier');
assert.ok(expenses.includes('widthClass="max-w-5xl"'), 'Expense modal must preserve the approved v300/v304 declarative full-width token; v308 visual expansion is CSS-owned');
assert.ok(expenses.includes('data-expense-modal-canonical="v308"') || versionNumber > 308, 'Expense modal must publish v308 or successor contract');
assert.ok(expenses.includes('className="expense-entry-modal__actions"'), 'Expense action row must use the reference alignment hook');

const css = read('styles/components/modal-system.css');
assert.ok(css.includes('--kourosh-modal-width: 1280px !important;'), 'Expense modal desktop width must be 1280px');
assert.ok(css.includes('--modal-field-leading-column: 2;'), 'Single-icon fields must place their icon on the physical right');
assert.ok(css.includes('--modal-field-leading-column: 3;'), 'Leading+trailing fields must keep leading icon on physical right');
assert.ok(css.includes("[data-ui-filter-chip-appearance='segmented'] .ux-btn[aria-pressed='true']"), 'Payment segmented selected state must use reference styling');
assert.ok(css.includes('display: var(--modal-field-divider-display, block) !important;'), 'Canonical divider must respect its ownership variable');
assert.ok(css.includes('direction: ltr !important;\n}\n\n.kourosh-modal__panel .modal-template-metric__icon'), 'Summary metric grid must use physical column placement');

console.log('v308 expense reference-match audit passed.');
