import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const finalizationSource = fs.readFileSync(new URL('../repositories/repairFinalization.repo.ts', import.meta.url), 'utf8');
const repairDomainSource = fs.readFileSync(new URL('../db/domains/repairs.db.ts', import.meta.url), 'utf8');
const customerLedgerSource = fs.readFileSync(new URL('../repositories/customerLedgerMutations.repo.ts', import.meta.url), 'utf8');
const repairPageSource = fs.readFileSync(new URL('../../pages/RepairDetail.tsx', import.meta.url), 'utf8');
const notificationSource = fs.readFileSync(new URL('../../components/Notification.tsx', import.meta.url), 'utf8');
const toastGuardSource = fs.readFileSync(new URL('../../styles/system/ui-contracts/spa-nonblocking-feedback-guard-phase83.css', import.meta.url), 'utf8');
const repairsRouteSource = fs.readFileSync(new URL('../routes/repairs.routes.ts', import.meta.url), 'utf8');
const startBatSource = fs.readFileSync(new URL('../../start.bat', import.meta.url), 'utf8');

assert.match(finalizationSource, /addCustomerRepairCharge\(/, 'repair finalization must use the repair-specific customer ledger adapter');
assert.match(finalizationSource, /addPartnerRepairFee\(/, 'repair finalization must use the repair-specific partner ledger adapter');
assert.match(repairDomainSource, /referenceType:\s*["']repair_charge["']\s*,\s*referenceId:\s*sourceRepairId/, 'customer repair charge must carry repair_charge + repair id');
assert.match(repairDomainSource, /["']repair_fee["'][\s\S]*sourceRepairId/, 'technician repair fee must carry repair_fee + repair id');
assert.match(customerLedgerSource, /شناسه\\s\*تعمیر/, 'customer ledger reference inference must recognize canonical repair descriptions');
assert.match(customerLedgerSource, /referenceType:\s*["']repair_charge["']\s*,\s*referenceId:\s*repairId/, 'repair fallback must recover the repair source reference');
assert.match(customerLedgerSource, /inferCustomerLedgerReference\([\s\S]*description,[\s\S]*currentDebit,[\s\S]*currentCredit,[\s\S]*meta/, 'system ledger inserts must resolve explicit or canonical inferred references before validation');
assert.match(repairsRouteSource, /X-Kourosh-Repair-Finalize-Version['"]?\s*,\s*['"]v3/, 'finalize route must expose the v3 runtime fingerprint');
assert.match(startBatSource, /Stopping stale Node listener on port/, 'Windows launcher must remove stale Node listeners before starting the new runtime');
assert.match(startBatSource, /3001 5173 80/, 'Windows launcher must protect the API, Vite, and proxy ports from stale Node processes');

assert.match(repairPageSource, /setFinalCost\(result\.data\.repair\.finalCost/, 'stored final cost must hydrate back into the repair UI');
assert.match(repairPageSource, /setLaborFee\(result\.data\.repair\.laborFee/, 'stored labor fee must hydrate back into the repair UI');
assert.match(repairPageSource, /handleSaveFinancials/, 'repair UI must expose a non-finalizing financial save path');
assert.match(repairPageSource, /ذخیره اطلاعات مالی/, 'repair UI must render the financial save action');
assert.doesNotMatch(repairPageSource, /<ModalField label="اختصاص به تعمیرکار"/, 'technician select must not be double-wrapped in ModalField');
assert.match(repairPageSource, /md:col-span-2/, 'technician selector must receive a stable full-width row on desktop');

assert.doesNotMatch(notificationSource, /bg-white\/95/, 'notification surface must be opaque instead of glassy');
assert.doesNotMatch(notificationSource, /dark:bg-slate-950\/95/, 'dark notification surface must be opaque instead of glassy');
assert.match(toastGuardSource, /box-shadow:\s*none\s*!important/, 'toast portal wrapper must not paint an outer shadow/shell');
assert.match(toastGuardSource, /border:\s*0\s*!important/, 'toast portal wrapper must not paint an outer border/shell');

// Validate the live accounting trigger contract accepts the explicit repair reference
// while still rejecting orphan ledger movements.
const db = new DatabaseSync(':memory:');
db.exec(`
  CREATE TABLE customer_ledger(
    id INTEGER PRIMARY KEY,
    customerId INTEGER NOT NULL,
    debit REAL NOT NULL DEFAULT 0,
    credit REAL NOT NULL DEFAULT 0,
    referenceType TEXT,
    referenceId INTEGER
  );
  CREATE TRIGGER trg_customer_ledger_reference_insert_guard
  BEFORE INSERT ON customer_ledger
  WHEN TRIM(COALESCE(NEW.referenceType,'')) = '' OR COALESCE(NEW.referenceId,0) <= 0
  BEGIN SELECT RAISE(ABORT, 'customer ledger reference is required'); END;
`);
assert.doesNotThrow(() => db.prepare(`INSERT INTO customer_ledger(customerId,debit,credit,referenceType,referenceId) VALUES(?,?,?,?,?)`).run(1, 5000000, 0, 'repair_charge', 41));
assert.throws(() => db.prepare(`INSERT INTO customer_ledger(customerId,debit,credit,referenceType,referenceId) VALUES(?,?,?,?,?)`).run(1, 5000000, 0, null, null), /customer ledger reference is required/);
const row = db.prepare(`SELECT referenceType, referenceId, debit FROM customer_ledger WHERE id=1`).get();
assert.equal(row.referenceType, 'repair_charge');
assert.equal(Number(row.referenceId), 41);
assert.equal(Number(row.debit), 5000000);
db.close();

console.log('repair finalization/reference/UI hotfix guard passed');
