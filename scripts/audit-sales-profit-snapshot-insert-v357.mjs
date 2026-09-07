import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const file = path.join(root, 'server/db/domains/profitSnapshots.db.ts');
const source = fs.readFileSync(file, 'utf8');

const fail = (message) => {
  console.error(`[v357 snapshot audit] FAIL: ${message}`);
  process.exit(1);
};

const columnsMatch = source.match(/const snapshotColumns = \[(.*?)\] as const;/s);
if (!columnsMatch) fail('snapshotColumns contract not found');
const columns = [...columnsMatch[1].matchAll(/"([A-Za-z0-9_]+)"/g)].map((m) => m[1]);
if (columns.length !== 34) fail(`expected 34 snapshot columns, found ${columns.length}`);
if (new Set(columns).size !== columns.length) fail('duplicate snapshot column detected');

const expectedTail = ['snapshotVersion', 'snapshotState', 'sourceCostBasis', 'frozenAt', 'notes'];
if (columns.slice(-5).join('|') !== expectedTail.join('|')) {
  fail(`unexpected snapshot tail: ${columns.slice(-5).join(', ')}`);
}

if (!source.includes('const snapshotValues: readonly SqliteBindValue[] = [')) {
  fail('typed snapshotValues contract missing');
}
if (!source.includes('if (snapshotColumns.length !== snapshotValues.length)')) {
  fail('runtime column/value count guard missing');
}
if (!source.includes('snapshotColumns.map(() => "?").join(",")')) {
  fail('placeholder generation is not derived from snapshotColumns');
}
if (/VALUES \(\?[^`]+\)/s.test(source.slice(source.indexOf('const snapshotColumns'), source.indexOf('const snapshotId')))) {
  fail('hard-coded snapshot placeholder list still present');
}

console.log(`[v357 snapshot audit] PASS: ${columns.length} columns; placeholders generated from the same contract with runtime value-count guard.`);
