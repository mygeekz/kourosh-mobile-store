import fs from 'node:fs';
import assert from 'node:assert/strict';

const db = fs.readFileSync('server/database.ts', 'utf8');
const index = fs.readFileSync('server/index.ts', 'utf8');
const header = fs.readFileSync('components/Header.tsx', 'utf8');
const css = fs.readFileSync('index.css', 'utf8');

const source = db + '\n' + index;
assert.equal(/\bso\.createdAt\b/.test(source), false, 'sales_orders does not have so.createdAt; reports must use transactionDate');
assert.equal(/COALESCE\(\s*transactionDate\s*,\s*createdAt\s*\)/.test(source), false, 'sales_orders report queries must not reference missing createdAt fallback');
assert.match(db, /WHERE date\(transactionDate\) BETWEEN date\(\?\) AND date\(\?\)/, 'sales-summary must filter sales_orders by transactionDate only');
assert.match(header, /moment\(\)\.locale\('fa'\)\.format\('jYYYY\/jMM\/jDD'\)/, 'Header quick stats must send clean Jalali dates');
assert.match(db, /A\\\.\?P\\\.\?/, 'date sanitizer must tolerate browser AP suffixes');
assert.match(css, /Reports final stability hotfix/, 'reports UI stability CSS must be present');
console.log('reports runtime hotfix guard passed');
