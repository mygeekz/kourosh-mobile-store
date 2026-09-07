import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (file) => fs.readFileSync(file, 'utf8');
const version = read('KOUROSH_SOURCE_VERSION').trim();
const versionNumber = Number(version.replace(/^v/, ''));
assert.ok(Number.isInteger(versionNumber) && versionNumber >= 307, `KOUROSH_SOURCE_VERSION must be v307 or successor; found ${version}`);

const expenses = read('pages/Expenses.tsx');
const start = expenses.indexOf('{isExpenseModalOpen ? (');
assert.ok(start >= 0, 'Expense modal source window must exist');
const expense = expenses.slice(start);
assert.ok(expense.includes('data-expense-modal-canonical="v307"') || versionNumber > 307, 'Expense modal must publish v307 canonical polish contract');
assert.ok(expense.includes('hideCloseButton'), 'Redundant close X must stay hidden');
assert.ok(expense.includes('<ModalTemplateSummary'), 'Expense summary must stay on the canonical summary primitive');
assert.ok(expense.includes('appearance="segmented"'), 'Payment methods must stay on canonical segmented control');
assert.ok(expense.includes('hideIcon'), 'Expense date field must use one canonical icon owner');
assert.ok(!expense.includes('trailingAction={<span className="text-xs font-black text-slate-500">تومان</span>}'), 'Expense amount must not add a redundant currency suffix inside the field');

const templates = read('components/modals/ModalTemplates.tsx');
assert.ok(templates.includes('data-ui-modal-template-summary="true"'), 'Summary primitive must publish canonical ownership');
assert.ok(templates.includes('modal-template-summary__hero-icon'), 'Summary header icon must use a bare canonical hero slot');
assert.ok(templates.includes("accent: 'text-amber-600"), 'Section accent icon must be color-only, not a decorative tile');

const modalField = read('components/ui/ModalField.tsx');
assert.ok(modalField.includes('hasTrailingIcon={Boolean(trailingAction)}'), 'ModalField must expose trailing affordance ownership to the shell');
assert.ok(modalField.includes('modal-field-premium__trailing-action'), 'ModalField must render trailing actions inside the single shell');

const chips = read('components/ui/FilterChipGroup.tsx');
assert.ok(chips.includes("segmented && label ? 'flex-col items-stretch'"), 'Segmented controls must stack their label above the control');
assert.ok(chips.includes("segmented ? 'ghost' : 'secondary'"), 'Inactive segmented items must use calm ghost styling');

const css = read('styles/components/modal-system.css');
assert.ok(css.includes('grid-template-columns: minmax(300px, 0.78fr) minmax(0, 1.72fr)'), 'Canonical two-pane modal must use the polished summary/form proportion');
assert.ok(css.includes('background: linear-gradient(180deg, rgba(248, 253, 250, 0.98), rgba(255, 255, 255, 0.99) 72%)'), 'Canonical summary surface must own the restrained success treatment');
assert.ok(css.includes('grid-template-columns: 34px minmax(0, 1fr)'), 'Summary metric icon must live on the RTL leading edge');
assert.ok(css.includes(".modal-field-premium[data-has-leading-icon='true']"), 'Canonical ModalField shell must own leading icon geometry');
assert.ok(css.includes('--modal-field-columns: 30px minmax(0, 1fr) 30px;'), 'Canonical field shell must support leading + trailing affordances without nested boxes');
assert.ok(css.includes('--modal-field-divider-display: none;') && css.includes('display: var(--modal-field-divider-display, block) !important;'), 'Legacy visual divider must be disabled through the canonical field variable contract');

console.log('v307 expense modal canonical polish audit passed.');
