import assert from 'node:assert/strict';
import {
  hasAllManagementPermissions,
  hasAnyOfManagementPermissions,
  isManagementPermission,
} from '../server/security/managementAccessPolicy.ts';

assert.equal(isManagementPermission('customers.read'), true);
assert.equal(isManagementPermission('customer.admin'), false);

const limited = ['dashboard.read', 'customers.read', 'sales.read'];
assert.equal(hasAllManagementPermissions(limited, ['dashboard.read']), true);
assert.equal(hasAllManagementPermissions(limited, ['customers.read', 'sales.read']), true);
assert.equal(hasAllManagementPermissions(limited, ['sales.read', 'profits.read']), false);
assert.equal(hasAnyOfManagementPermissions(limited, ['profits.read', 'sales.read']), true);
assert.equal(hasAnyOfManagementPermissions(limited, ['partners.ledger.read', 'profits.read']), false);

// Explicitly cover the commercial security scenario: a Manager may see sales without profit.
const salesOnly = ['dashboard.read', 'sales.read'];
assert.equal(hasAllManagementPermissions(salesOnly, ['sales.read']), true);
assert.equal(hasAllManagementPermissions(salesOnly, ['profits.read']), false);

// Sensitive financial drilldowns require all declared permissions, not a role-name shortcut.
const partnerReader = ['partners.read', 'partners.ledger.read'];
assert.equal(hasAllManagementPermissions(partnerReader, ['partners.read', 'partners.ledger.read']), true);
assert.equal(hasAllManagementPermissions(partnerReader, ['partners.read', 'partners.ledger.read', 'profits.read']), false);

console.log('Telegram Management Center Stage 3 v348 permission contract passed');
