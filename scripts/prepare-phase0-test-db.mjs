#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const root = process.cwd();
const sourcePath = path.resolve(root, 'server/kourosh_inventory.db');
const targetDirectory = path.resolve(root, '.phase0/test-db');
const targetPath = path.resolve(targetDirectory, 'kourosh_inventory.test.db');
const expectedSourcePath = path.join(root, 'server', 'kourosh_inventory.db');

assert.equal(sourcePath, expectedSourcePath, 'Phase 0 source database path changed unexpectedly');
assert.equal(path.dirname(targetPath), targetDirectory, 'Test database must stay inside .phase0/test-db');
assert.notEqual(sourcePath, targetPath, 'The test database must never overwrite the store database');
assert.ok(fs.existsSync(sourcePath), 'Store database is missing');

const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const integrityCheck = (file) => {
  const database = new DatabaseSync(file, { readOnly: true });
  try {
    return database.prepare('PRAGMA integrity_check').get()?.integrity_check;
  } finally {
    database.close();
  }
};

const sourceHashBefore = sha256(sourcePath);
assert.equal(integrityCheck(sourcePath), 'ok', 'Store database failed PRAGMA integrity_check');

fs.mkdirSync(targetDirectory, { recursive: true });
for (const suffix of ['', '-wal', '-shm', '-journal']) {
  const candidate = `${targetPath}${suffix}`;
  if (fs.existsSync(candidate)) fs.rmSync(candidate, { force: true });
}
fs.copyFileSync(sourcePath, targetPath, fs.constants.COPYFILE_EXCL);

const sourceHashAfter = sha256(sourcePath);
const testHash = sha256(targetPath);
assert.equal(sourceHashAfter, sourceHashBefore, 'Store database changed while preparing the test copy');
assert.equal(testHash, sourceHashBefore, 'Test database copy is not byte-identical to the store database');
assert.equal(integrityCheck(targetPath), 'ok', 'Test database copy failed PRAGMA integrity_check');

console.log(JSON.stringify({
  source: path.relative(root, sourcePath),
  target: path.relative(root, targetPath),
  sourceSha256: sourceHashAfter,
  testSha256: testHash,
  integrity: 'ok',
}, null, 2));
