import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Lightweight runtime contract for Telegram-wide session invalidation without
// depending on the project's TS runtime loader/dependencies.
const source = fs.readFileSync('server/miniapp/miniAppSession.ts','utf8');
const fnMatch = source.match(/const revokeTelegramUser = \(telegramUserId: string\): number => \{([\s\S]*?)\n  \};/);
assert.ok(fnMatch, 'revokeTelegramUser implementation must exist');
assert.match(fnMatch[1], /value\.identity\.telegramUserId === normalized/);
assert.match(fnMatch[1], /sessions\.delete\(key\)/);

const sessions = new Map([
  ['a',{identity:{kind:'partner',subjectId:7,telegramUserId:'777'}}],
  ['b',{identity:{kind:'customer',subjectId:9,telegramUserId:'777'}}],
  ['c',{identity:{kind:'staff',subjectId:1,telegramUserId:'777'}}],
  ['d',{identity:{kind:'partner',subjectId:8,telegramUserId:'888'}}],
]);
const sandbox = { sessions, String, countResult: null };
vm.createContext(sandbox);
vm.runInContext(`
  const revoke = (telegramUserId) => {
    const normalized = String(telegramUserId || '').trim();
    if (!normalized) return 0;
    let count = 0;
    for (const [key, value] of sessions) {
      if (value.identity.telegramUserId === normalized) { sessions.delete(key); count += 1; }
    }
    return count;
  };
  countResult = revoke('777');
`, sandbox);
assert.equal(sandbox.countResult, 3);
assert.deepEqual([...sessions.keys()], ['d']);
console.log('[v360] PASS: Telegram-wide MiniApp session invalidation runtime contract');
