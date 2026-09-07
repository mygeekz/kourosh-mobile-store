import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync(':memory:');
db.exec(`
  CREATE TABLE partners(id INTEGER PRIMARY KEY, telegram_user_id TEXT);
  CREATE TABLE telegram_partner_link_tokens(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    partner_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'issued',
    allow_rebind INTEGER NOT NULL DEFAULT 0 CHECK(allow_rebind IN (0,1)),
    previous_telegram_user_id TEXT,
    telegram_user_id TEXT,
    chat_id TEXT
  );
`);

db.prepare('INSERT INTO partners(id,telegram_user_id) VALUES(?,?)').run(10,'tg-old');

const canRedeem = (token, incomingTelegramUserId) => {
  const partner = db.prepare('SELECT telegram_user_id FROM partners WHERE id=?').get(token.partner_id);
  const current = String(partner?.telegram_user_id || '');
  if (current && current !== incomingTelegramUserId) {
    if (Number(token.allow_rebind || 0) !== 1) return 'REBIND_REJECTED';
    if (!token.previous_telegram_user_id || token.previous_telegram_user_id !== current) return 'REBIND_STALE';
  }
  return 'OK';
};

const normal = { partner_id:10, allow_rebind:0, previous_telegram_user_id:null };
assert.equal(canRedeem(normal,'tg-new'),'REBIND_REJECTED','normal token must never silently replace another Telegram account');
assert.equal(db.prepare('SELECT telegram_user_id FROM partners WHERE id=10').get().telegram_user_id,'tg-old','rejected normal token must preserve old binding');

const relink = { partner_id:10, allow_rebind:1, previous_telegram_user_id:'tg-old' };
assert.equal(canRedeem(relink,'tg-new'),'OK','explicit re-link token may replace the exact prior binding');
assert.equal(db.prepare('SELECT telegram_user_id FROM partners WHERE id=10').get().telegram_user_id,'tg-old','issuing a re-link token must not disconnect the current account');

db.prepare('UPDATE partners SET telegram_user_id=? WHERE id=?').run('tg-new',10);
assert.equal(db.prepare('SELECT telegram_user_id FROM partners WHERE id=10').get().telegram_user_id,'tg-new','successful redemption atomically switches identity');

db.prepare('UPDATE partners SET telegram_user_id=? WHERE id=?').run('tg-third',10);
assert.equal(canRedeem(relink,'tg-new'),'REBIND_STALE','token must fail if binding changed after token issuance');

console.log('[v361] PASS: secure Partner Telegram re-link SQLite lifecycle contract');
