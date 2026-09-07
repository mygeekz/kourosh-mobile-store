import assert from 'node:assert/strict';
import fs from 'node:fs';
import { splitSqlStatements } from '../utils/migrationRunner.ts';

const migration = fs.readFileSync(new URL('../migrations/2026-09-04-zz-accounting-sensitive-immutability.sql', import.meta.url), 'utf8');
const statements = splitSqlStatements(migration);
const triggers = statements.filter((sql) => /CREATE\s+TRIGGER/i.test(sql));
assert.equal(triggers.length, 8, `expected 8 v341 immutability triggers; got ${triggers.length}`);
assert.equal(statements.length, 9, `v341 migration must contain one prerequisite table plus 8 complete trigger statements; got ${statements.length}`);
assert.equal(statements.filter((sql) => /^END\s*;/i.test(sql.trim())).length, 0, 'trigger END must never become a standalone statement');
for (const trigger of triggers) assert.match(trigger.trim(), /END\s*;$/i, 'every v341 trigger must remain complete');
console.log(JSON.stringify({ status: 'PASS', migrationStatements: statements.length, triggerStatements: triggers.length }, null, 2));
