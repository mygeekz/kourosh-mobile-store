import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const version = read('KOUROSH_SOURCE_VERSION').trim();
const versionNumber = Number(version.replace(/^v/, ''));
assert.ok(Number.isInteger(versionNumber) && versionNumber >= 335, `KOUROSH_SOURCE_VERSION must be v335 or successor; found ${version}`);

const migration = read('server/db/migrations/legacyAccountingReconciliation.ts');
assert.match(migration, /CONFIRMED_PARTNER_LEDGER_DIRECTION_CORRECTIONS/, 'confirmed correction registry must exist');
assert.match(migration, /v335-behzad-settlement-2026-05-23-87700000/, 'confirmed Behdad/Behzad settlement fingerprint must remain registered');
assert.match(migration, /partnerName:\s*["']بهزاد هلیلی["']/, 'confirmed correction must target the explicitly confirmed partner name');
assert.match(migration, /originalDescription:\s*["']بابت صافی حساب["']/, 'confirmed correction must require the original description fingerprint');
assert.match(migration, /correctedDescription:\s*["']پرداخت بابت صافی حساب["']/, 'confirmed correction must rewrite the description to payment semantics');
assert.match(migration, /amount:\s*87_700_000/, 'confirmed correction amount must remain 87,700,000 toman');
assert.match(migration, /date\(COALESCE\(pl\.transactionDate, pl\.createdAt\)\) = date\(\?\)/, 'confirmed correction must be date-scoped');
assert.match(migration, /TRIM\(COALESCE\(pl\.referenceType,''\)\) = ''/, 'confirmed correction must only touch an unreferenced legacy ledger row');
assert.match(migration, /pl\.referenceId IS NULL/, 'confirmed correction must require a null referenceId');
assert.match(migration, /if \(\(rows as any\[\]\)\.length !== 1\) continue;/, 'confirmed correction must refuse ambiguous matches');
assert.match(migration, /reason:\s*["']confirmed_legacy_direction_correction_v335["']/, 'confirmed correction must append an audit history reason');
assert.match(migration, /SET description = \?, debit = \?, credit = 0, updatedAt = \?, changeHistoryJson = \?/, 'confirmed correction must move the amount from credit to debit');
assert.match(migration, /const correctedConfirmedPartnerLedgerDirections = await repairConfirmedPartnerLedgerDirectionCorrections\(\);[\s\S]*const ledgerCaches = await rebuildAllLedgerBalanceCaches\(\);/, 'direction correction must run before ledger cache rebuild');
assert.match(migration, /correctedConfirmedPartnerLedgerDirections:\s*number/, 'reconciliation result must expose correction count');

const repo = read('server/repositories/partnerLedgerEditDelete.repo.ts');
assert.match(repo, /originalDirection[\s\S]*requestedDirection[\s\S]*requestedDirection !== originalDirection/, 'manual edit path must guard against accidental direction reversal');
assert.match(repo, /جهت تراکنش دفتر در ویرایش قابل تغییر نیست/, 'manual edit path must return a clear Persian direction-lock error');

const modal = read('pages/partnerDetail/PartnerLedgerEntryEditModal.tsx');
assert.match(modal, /data-ui-partner-ledger-edit-direction-lock=["']v335["']/, 'edit modal must expose v335 direction lock marker');
assert.match(modal, /directionLockRef/, 'edit modal must preserve original direction while the amount is being edited');
assert.match(modal, /editPartnerLedgerAmount/, 'edit modal must expose a single amount field instead of two direction fields');
assert.doesNotMatch(modal, /id=["']editPartnerLedgerCredit["']/, 'edit modal must not keep the old independent credit input');
assert.doesNotMatch(modal, /id=["']editPartnerLedgerDebit["']/, 'edit modal must not keep the old independent debit input');

console.log('v335 confirmed partner-ledger correction and direction-safety audit passed.');
