import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const dbPath = path.resolve(process.argv[2] || 'server/kourosh_inventory.db');
const staleArg = process.argv.find(a => a.startsWith('--processing-stale-minutes='));
const staleMinutes = Math.max(5, Math.min(1440, Number(staleArg?.slice('--processing-stale-minutes='.length) || 30)));

if (!fs.existsSync(dbPath)) {
  console.error(JSON.stringify({ status:'FAILED', code:'DATABASE_NOT_FOUND', database:dbPath }, null, 2));
  process.exit(1);
}

const db = new DatabaseSync(dbPath, { readOnly:true });
try {
  db.exec('PRAGMA query_only=ON;');
  const table = db.prepare("SELECT 1 ok FROM sqlite_master WHERE type='table' AND name='notification_outbox'").get();
  if (!table) {
    console.error(JSON.stringify({status:'NOT_READY',code:'OUTBOX_TABLE_MISSING',database:dbPath},null,2));
    process.exit(1);
  }

  const byStatus = Object.fromEntries(
    db.prepare("SELECT status,COUNT(*) n FROM notification_outbox WHERE channel='sms' GROUP BY status").all()
      .map(r => [String(r.status), Number(r.n)])
  );

  const duePending = Number(db.prepare(`SELECT COUNT(*) n FROM notification_outbox
    WHERE channel='sms' AND status='pending' AND attempts < maxAttempts
      AND (nextAttemptAt IS NULL OR datetime(nextAttemptAt) <= datetime('now'))`).get()?.n || 0);

  const futurePending = Number(db.prepare(`SELECT COUNT(*) n FROM notification_outbox
    WHERE channel='sms' AND status='pending' AND attempts < maxAttempts
      AND nextAttemptAt IS NOT NULL AND datetime(nextAttemptAt) > datetime('now')`).get()?.n || 0);

  const staleProcessing = Number(db.prepare(`SELECT COUNT(*) n FROM notification_outbox
    WHERE channel='sms' AND status='processing'
      AND datetime(updatedAt) <= datetime('now', ?)`).get(`-${staleMinutes} minutes`)?.n || 0);

  const statusWindows = db.prepare(`SELECT status,COUNT(*) n,MIN(createdAt) oldestCreatedAt,MAX(createdAt) newestCreatedAt,
      MIN(updatedAt) oldestUpdatedAt,MAX(updatedAt) newestUpdatedAt
    FROM notification_outbox WHERE channel='sms' GROUP BY status ORDER BY status`).all().map(r => ({
      status:String(r.status), count:Number(r.n), oldestCreatedAt:r.oldestCreatedAt||null, newestCreatedAt:r.newestCreatedAt||null,
      oldestUpdatedAt:r.oldestUpdatedAt||null, newestUpdatedAt:r.newestUpdatedAt||null,
    }));

  const activeByEvent = db.prepare(`SELECT COALESCE(eventType,'') eventType,status,COUNT(*) n
    FROM notification_outbox WHERE channel='sms' AND status IN ('pending','processing','failed')
    GROUP BY COALESCE(eventType,''),status ORDER BY n DESC,eventType,status`).all().map(r => ({
      eventType:String(r.eventType||'UNKNOWN'), status:String(r.status), count:Number(r.n),
    }));

  const attempts = db.prepare(`SELECT status,attempts,maxAttempts,COUNT(*) n
    FROM notification_outbox WHERE channel='sms' AND status IN ('pending','processing','failed')
    GROUP BY status,attempts,maxAttempts ORDER BY status,attempts,maxAttempts`).all().map(r => ({
      status:String(r.status), attempts:Number(r.attempts||0), maxAttempts:Number(r.maxAttempts||0), count:Number(r.n),
    }));

  const failureReasons = db.prepare(`SELECT status,COALESCE(lastError,'') error,COUNT(*) n
    FROM notification_outbox WHERE channel='sms' AND status IN ('pending','processing','failed')
      AND COALESCE(lastError,'')<>''
    GROUP BY status,COALESCE(lastError,'') ORDER BY n DESC LIMIT 20`).all().map(r => ({
      status:String(r.status), error:String(r.error).slice(0,160), count:Number(r.n),
    }));

  const cutoverRows = Number(db.prepare("SELECT COUNT(*) n FROM notification_outbox WHERE channel='sms' AND payloadJson LIKE '%notification_rule_cutover_v1%'").get()?.n || 0);
  const quarantinedLegacyRows = Number(db.prepare("SELECT COUNT(*) n FROM notification_outbox WHERE channel='sms' AND lastError='QUARANTINED_LEGACY_SMS_BACKLOG:PHASE33'").get()?.n || 0);
  const blockers = [];
  if (duePending > 0) blockers.push('DUE_LEGACY_SMS_PENDING_ROWS');
  if (staleProcessing > 0) blockers.push('STALE_SMS_PROCESSING_ROWS');

  console.log(JSON.stringify({
    status:blockers.length ? 'NOT_READY_FOR_CUTOVER' : 'READY',
    database:dbPath,
    processingStaleMinutes:staleMinutes,
    byStatus,
    duePending,
    futurePending,
    staleProcessing,
    cutoverRows,
    quarantinedLegacyRows,
    statusWindows,
    activeByEvent,
    attempts,
    failureReasons,
    blockers,
    recipientsPrinted:false,
    secretsPrinted:false,
    databaseMutated:false,
  }, null, 2));
} finally {
  db.close();
}
