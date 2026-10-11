#!/usr/bin/env node
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dbPath = path.resolve(process.argv[2] || path.join(root, 'server', 'kourosh_inventory.db'));
const out = path.resolve(
  process.argv[3] || path.join(root, 'reports', `sms-dry-run-${new Date().toISOString().slice(0, 10)}.json`),
);

const REQUIRED_RULE_COLUMNS = ['eventType', 'timingType', 'daysOffset', 'templateKey'];
const PHASE25_MIGRATION_ID = '2026-09-15-reminder-sms-contract.sql';

function failWithReport(code, message, details = {}) {
  const report = {
    mode: 'dry_run',
    status: 'NOT_READY',
    generatedAt: new Date().toISOString(),
    database: dbPath,
    providerCalls: 0,
    outboxWrites: 0,
    safety: {
      smsSent: false,
      outboxMutated: false,
    },
    error: {
      code,
      message,
      ...details,
    },
  };

  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
  console.error(JSON.stringify(report, null, 2));
  console.error(`[dry-run] Report written to: ${out}`);
  process.exitCode = 3;
}

if (!fs.existsSync(dbPath)) {
  console.error(`[dry-run] Database not found: ${dbPath}`);
  process.exit(2);
}

const db = new DatabaseSync(dbPath, { readOnly: true });

try {
  const tables = db
    .prepare("select name from sqlite_master where type='table' and name in ('reminder_rules','notification_outbox','sms_logs','schema_migrations') order by name")
    .all()
    .map((row) => row.name);

  if (!tables.includes('reminder_rules')) {
    failWithReport('REMINDER_RULES_TABLE_MISSING', 'Required table reminder_rules was not found.', {
      tablesChecked: tables,
    });
  } else {
    const reminderColumns = db
      .prepare('pragma table_info(reminder_rules)')
      .all()
      .map((row) => row.name);

    const missingColumns = REQUIRED_RULE_COLUMNS.filter((name) => !reminderColumns.includes(name));

    let phase25Migration = null;
    if (tables.includes('schema_migrations')) {
      try {
        phase25Migration = db
          .prepare('select * from schema_migrations where migration = ? or name = ? limit 1')
          .get(PHASE25_MIGRATION_ID, PHASE25_MIGRATION_ID) ?? null;
      } catch {
        // Different historical schema_migrations layouts are allowed here; column presence is authoritative.
      }
    }

    if (missingColumns.length > 0) {
      failWithReport(
        'SMS_RULE_SCHEMA_NOT_READY',
        'This database does not contain the Phase 2.5 SMS-rule schema. Use the migrated kourosh_inventory.db, not the pre-migration phase25 backup.',
        {
          missingColumns,
          reminderRuleColumns: reminderColumns,
          expectedMigration: PHASE25_MIGRATION_ID,
          phase25MigrationDetected: Boolean(phase25Migration),
          remediation: [
            'Copy the migrated D:\\Kourosh\\Astra\\server\\kourosh_inventory.db into the test project as server\\kourosh_inventory.db.',
            'Or run the reviewed Phase 2.5 migration/setup against a COPY of the database before retrying.',
            'Do not use server\\backups\\sms-rule-phase25_*.db for this dry-run; that backup was captured before the migration.',
          ],
        },
      );
    } else {
      const rules = db
        .prepare("select * from reminder_rules where eventType in ('INSTALLMENT_DUE','INSTALLMENT_OVERDUE') order by id")
        .all();

      const report = {
        mode: 'dry_run',
        status: 'PASS',
        generatedAt: new Date().toISOString(),
        database: dbPath,
        tablesChecked: tables,
        schema: {
          phase25Ready: true,
          requiredColumns: REQUIRED_RULE_COLUMNS,
          expectedMigration: PHASE25_MIGRATION_ID,
        },
        providerCalls: 0,
        outboxWrites: 0,
        rules: rules.map((r) => ({
          id: r.id,
          eventType: r.eventType,
          timingType: r.timingType,
          daysOffset: r.daysOffset,
          templateKey: r.templateKey,
          enabled: Boolean(r.enabled),
          channel: r.channel,
          decision: 'SHADOW_ONLY',
        })),
        safety: {
          smsSent: false,
          outboxMutated: false,
        },
      };

      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, JSON.stringify(report, null, 2));
      console.log(JSON.stringify(report, null, 2));
      console.error(`[dry-run] Report written to: ${out}`);
    }
  }
} finally {
  db.close();
}
