import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const version = read('KOUROSH_SOURCE_VERSION').trim();
const ledger = read('pages/customerDetail/CustomerLedgerRenderSection.tsx');
const login = read('pages/Login.tsx');
const authTheme = read('components/auth/authGoldControlTheme.ts');

assert.equal(version, 'v211');

assert.match(ledger, /lg:flex-row lg:items-center lg:justify-between/);
assert.match(ledger, /<SelectField\s+controlOnly\s+value=\{String\(ledgerPageSize\)\}/);
assert.match(ledger, /<nav className="flex max-w-full items-center justify-center gap-1 overflow-x-auto"/);
assert.doesNotMatch(ledger, /صفحه‌بندی دفتر حساب مشتری[\s\S]{0,300}sm:flex-row/);

assert.match(login, /authGoldInputClasses/);
assert.match(authTheme, /!bg-transparent hover:!bg-transparent focus:!bg-transparent active:!bg-transparent/);
assert.match(authTheme, /\[&&:-webkit-autofill:focus\]:!bg-transparent/);
assert.doesNotMatch(login, /<style|\.login-page\s*\{/);

console.log('PASS Kourosh v211 ledger and login responsive UI audit');
