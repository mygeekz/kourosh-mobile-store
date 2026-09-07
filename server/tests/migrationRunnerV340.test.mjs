import assert from 'node:assert/strict';
import fs from 'node:fs';
import { splitSqlStatements } from '../utils/migrationRunner.ts';

const migration = fs.readFileSync(new URL('../migrations/2026-09-04-z-accounting-reference-invariants.sql', import.meta.url), 'utf8');
const statements = splitSqlStatements(migration);
const triggers = statements.filter((sql) => /CREATE\s+TRIGGER/i.test(sql));
assert.ok(triggers.length >= 20, `expected v340 trigger set; got ${triggers.length}`);
assert.equal(statements.filter((sql) => /^END\s*;/i.test(sql.trim())).length, 0, 'trigger END must never become a standalone migration statement');
for (const trigger of triggers) {
  assert.match(trigger.trim(), /END\s*;$/i, 'every trigger must remain one complete SQLite statement');
}

const caseTrigger = `
  CREATE TRIGGER t_case AFTER INSERT ON demo
  BEGIN
    UPDATE demo SET value = CASE WHEN NEW.value > 0 THEN 1 ELSE 0 END WHERE id = NEW.id;
    INSERT INTO audit(value) VALUES ('semi;colon');
  END;
  CREATE TABLE after_trigger(id INTEGER);
`;
const caseSplit = splitSqlStatements(caseTrigger);
assert.equal(caseSplit.length, 2, 'CASE ... END and internal semicolons must stay inside the trigger');
assert.match(caseSplit[0], /INSERT INTO audit/);
assert.match(caseSplit[1], /^CREATE TABLE after_trigger/);

console.log(JSON.stringify({ status: 'PASS', migrationStatements: statements.length, triggerStatements: triggers.length }, null, 2));
