import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const version = read('KOUROSH_SOURCE_VERSION').trim();
const customers = read('pages/Customers.tsx');

assert.equal(version, 'v229', 'v229 source version marker must be current.');

// React SyntheticEvent.currentTarget is only guaranteed during the event handler.
// Do not dereference it inside a functional state updater, because the updater may
// execute after currentTarget has been cleared to null.
assert.ok(
  customers.includes('const nationalCode = normalizeNationalCodeForValidation(event.currentTarget.value);'),
  'Customer national-code input must snapshot currentTarget.value synchronously.'
);
assert.ok(
  customers.includes('setNewCustomer((prev) => ({ ...prev, nationalCode }));'),
  'Customer national-code state updater must consume the captured primitive value.'
);
assert.ok(
  !customers.includes('nationalCode: normalizeNationalCodeForValidation(event.currentTarget.value)'),
  'Customer national-code updater must not dereference event.currentTarget from inside setState.'
);

console.log('Customer create v229 audit passed: national-code input snapshots the event value before the functional state update.');
