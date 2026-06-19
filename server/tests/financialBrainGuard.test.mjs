import assert from 'node:assert/strict';
import fs from 'node:fs';

const index = fs.readFileSync(new URL('../index.ts', import.meta.url), 'utf8');
const decisionEngine = fs.readFileSync(new URL('../../components/reports/ReportsDecisionEngine.tsx', import.meta.url), 'utf8');
const autoAction = fs.readFileSync(new URL('../../components/reports/ReportsAutoActionEngine.tsx', import.meta.url), 'utf8');
const mainLayout = fs.readFileSync(new URL('../../components/MainLayout.tsx', import.meta.url), 'utf8');

assert.match(index, /\/api\/brain\/financial/, 'Financial Brain API must exist as an independent endpoint.');
assert.match(index, /currentPurchasePrice/, 'Financial Brain must consider phone current purchase price for COGS.');
assert.match(index, /date\(substr\(transactionDate, 1, 10\)\)/, 'Report date filters must normalize timestamped rows by date.');
assert.match(decisionEngine, /\/api\/brain\/financial/, 'Reports Decision Engine must consume Financial Brain.');
assert.match(autoAction, /smartJson\?\.success/, 'Auto Action Engine must parse JSON payloads before scoring actions.');
assert.match(autoAction, /fromISO=.*toISO=/, 'Auto Action audit links must use Financial Audit URL params.');
assert.match(mainLayout, /isMod && isK && !isTyping/, 'Command Palette shortcut must use Ctrl\/Cmd + K.');

console.log('Financial Brain final guard passed.');
