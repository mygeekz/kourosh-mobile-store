import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync(':memory:');
db.exec(`
  CREATE TABLE accounting_period_locks(
    id INTEGER PRIMARY KEY,
    periodStart TEXT NOT NULL,
    periodEnd TEXT NOT NULL,
    closeReason TEXT,
    snapshotId INTEGER,
    closedByUserId INTEGER,
    closedByUsername TEXT,
    closedByRole TEXT,
    closedAt TEXT,
    status TEXT NOT NULL DEFAULT 'closed'
  );
  CREATE TABLE accounting_period_state_events(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lockId INTEGER NOT NULL,
    action TEXT NOT NULL CHECK(action IN ('closed','reopened')),
    reason TEXT NOT NULL,
    snapshotId INTEGER,
    actorUserId INTEGER,
    actorUsername TEXT,
    actorRole TEXT,
    createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now','utc'))
  );
  CREATE TRIGGER trg_state_no_update BEFORE UPDATE ON accounting_period_state_events BEGIN SELECT RAISE(ABORT,'accounting_period_state_events is append-only'); END;
  CREATE TRIGGER trg_state_no_delete BEFORE DELETE ON accounting_period_state_events BEGIN SELECT RAISE(ABORT,'accounting_period_state_events is append-only'); END;
  CREATE TABLE sales_orders(id INTEGER PRIMARY KEY, transactionDate TEXT NOT NULL, grandTotal REAL NOT NULL);
  CREATE TRIGGER trg_sales_period_lock_update
  BEFORE UPDATE ON sales_orders
  WHEN EXISTS(
    SELECT 1 FROM accounting_period_locks apl
     WHERE apl.status='closed'
       AND date(OLD.transactionDate) BETWEEN date(apl.periodStart) AND date(apl.periodEnd)
       AND COALESCE((SELECT e.action FROM accounting_period_state_events e WHERE e.lockId=apl.id ORDER BY e.id DESC LIMIT 1),'closed')='closed'
  )
  BEGIN SELECT RAISE(ABORT,'accounting period is closed'); END;
`);

db.prepare(`INSERT INTO accounting_period_locks(id,periodStart,periodEnd,closeReason,closedAt) VALUES(1,'2026-08-01','2026-08-31','ماه بسته','2026-09-01T00:00:00Z')`).run();
db.prepare(`INSERT INTO accounting_period_state_events(lockId,action,reason) VALUES(1,'closed','ماه بسته')`).run();
db.prepare(`INSERT INTO sales_orders(id,transactionDate,grandTotal) VALUES(1,'2026-08-15',1000)`).run();
assert.throws(() => db.prepare(`UPDATE sales_orders SET grandTotal=1100 WHERE id=1`).run(), /closed/);

db.prepare(`INSERT INTO accounting_period_state_events(lockId,action,reason) VALUES(1,'reopened','اصلاح مستند')`).run();
db.prepare(`UPDATE sales_orders SET grandTotal=1100 WHERE id=1`).run();
assert.equal(db.prepare(`SELECT grandTotal FROM sales_orders WHERE id=1`).get().grandTotal, 1100);

assert.throws(() => db.prepare(`UPDATE accounting_period_state_events SET reason='tamper' WHERE id=2`).run(), /append-only/);
assert.throws(() => db.prepare(`DELETE FROM accounting_period_state_events WHERE id=2`).run(), /append-only/);

db.prepare(`INSERT INTO accounting_period_state_events(lockId,action,reason) VALUES(1,'closed','بستن مجدد')`).run();
assert.throws(() => db.prepare(`UPDATE sales_orders SET grandTotal=1200 WHERE id=1`).run(), /closed/);
const events = db.prepare(`SELECT action,reason FROM accounting_period_state_events WHERE lockId=1 ORDER BY id`).all();
assert.deepEqual(events.map((row) => row.action), ['closed','reopened','closed']);
console.log(JSON.stringify({ ok:true, lifecycle:events.map((row)=>row.action), finalGrandTotal:1100 }, null, 2));
