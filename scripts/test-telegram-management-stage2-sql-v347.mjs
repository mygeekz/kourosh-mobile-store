import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const source = fs.readFileSync('server/db/schema/telegramIdentity.schema.ts', 'utf8');
const staffTokenSql = source.match(/await runAsync\(`(CREATE TABLE IF NOT EXISTS telegram_staff_link_tokens[\s\S]*?)`\);/)?.[1];
const staffLinkSql = source.match(/await runAsync\(`(CREATE TABLE IF NOT EXISTS user_telegram_links[\s\S]*?)`\);/)?.[1];
assert.ok(staffTokenSql, 'telegram_staff_link_tokens schema not found');
assert.ok(staffLinkSql, 'user_telegram_links schema not found');

const db = new DatabaseSync(':memory:');
db.exec('PRAGMA foreign_keys=ON');
db.exec('CREATE TABLE users(id INTEGER PRIMARY KEY, username TEXT NOT NULL UNIQUE)');
db.exec(staffTokenSql);
db.exec(staffLinkSql);

db.prepare('INSERT INTO users(id,username) VALUES(?,?)').run(1, 'manager_a');
db.prepare('INSERT INTO users(id,username) VALUES(?,?)').run(2, 'manager_b');

// Telegram user id is a stable authentication identity and cannot belong to two internal manager accounts.
db.prepare('INSERT INTO user_telegram_links(user_id,telegram_user_id,chat_id) VALUES(?,?,?)').run(1, '123456789', 'chat-a');
assert.throws(
  () => db.prepare('INSERT INTO user_telegram_links(user_id,telegram_user_id,chat_id) VALUES(?,?,?)').run(2, '123456789', 'chat-b'),
  /UNIQUE constraint failed/,
);

// Delivery chat can change while the Telegram authentication user id remains stable.
db.prepare("UPDATE user_telegram_links SET chat_id=?,updated_at=strftime('%Y-%m-%dT%H:%M:%SZ','now','utc') WHERE user_id=?").run('chat-a-new', 1);
const deliveryRow = db.prepare('SELECT telegram_user_id AS telegramUserId,chat_id AS chatId FROM user_telegram_links WHERE user_id=1').get();
assert.equal(deliveryRow.telegramUserId, '123456789');
assert.equal(deliveryRow.chatId, 'chat-a-new');

// One-time link tokens are status constrained and token hashes are unique.
db.prepare("INSERT INTO telegram_staff_link_tokens(token_hash,user_id,expires_at,status) VALUES(?,?,?,'issued')").run('hash-a', 1, '2099-01-01T00:00:00Z');
assert.throws(
  () => db.prepare("INSERT INTO telegram_staff_link_tokens(token_hash,user_id,expires_at,status) VALUES(?,?,?,'issued')").run('hash-a', 1, '2099-01-01T00:00:00Z'),
  /UNIQUE constraint failed/,
);
assert.throws(
  () => db.prepare("INSERT INTO telegram_staff_link_tokens(token_hash,user_id,expires_at,status) VALUES(?,?,?,'invalid')").run('hash-b', 2, '2099-01-01T00:00:00Z'),
  /CHECK constraint failed/,
);

// Revocation removes the binding and cancels every outstanding token without deleting the user.
db.prepare("UPDATE telegram_staff_link_tokens SET status='canceled',last_error='revoked' WHERE user_id=? AND status='issued'").run(1);
db.prepare('DELETE FROM user_telegram_links WHERE user_id=?').run(1);
assert.equal(Number(db.prepare('SELECT COUNT(*) AS count FROM user_telegram_links WHERE user_id=1').get().count), 0);
assert.equal(db.prepare("SELECT status FROM telegram_staff_link_tokens WHERE token_hash='hash-a'").get().status, 'canceled');
assert.equal(Number(db.prepare('SELECT COUNT(*) AS count FROM users WHERE id=1').get().count), 1);

db.close();
console.log('Telegram Management Center Stage 2 v347 SQLite contract passed');
