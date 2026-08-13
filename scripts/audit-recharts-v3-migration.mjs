import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx']);
const ignoredDirectories = new Set(['node_modules', 'dist', '.git']);
const chartFiles = [];

function visit(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (ignoredDirectories.has(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      visit(fullPath);
      continue;
    }
    if (!sourceExtensions.has(path.extname(entry.name))) continue;
    const source = fs.readFileSync(fullPath, 'utf8');
    if (/from\s+['"]recharts['"]|require\(\s*['"]recharts['"]\s*\)/.test(source)) {
      chartFiles.push({ fullPath, source });
    }
  }
}

visit(rootDir);
assert.ok(chartFiles.length > 0, 'No Recharts consumers were found; migration audit cannot validate chart usage.');

const violations = [];
for (const { fullPath, source } of chartFiles) {
  const relative = path.relative(rootDir, fullPath).replaceAll(path.sep, '/');
  if (/import\s*\{[^}]*\bCell\b[^}]*\}\s*from\s*['"]recharts['"]/.test(source) || /<Cell(?:\s|\/|>)/.test(source)) {
    violations.push(`${relative}: deprecated Recharts Cell usage remains`);
  }
  if (/<(?:Pie|Bar|Area|Line)\b[^>]*\bactiveIndex\s*=/.test(source)) {
    violations.push(`${relative}: removed Recharts v3 activeIndex prop remains on a chart primitive`);
  }
  if (/<Pie\b[^>]*\b(?:activeShape|inactiveShape)\s*=/.test(source)) {
    violations.push(`${relative}: deprecated Pie activeShape/inactiveShape prop remains`);
  }
}

assert.deepEqual(violations, [], violations.join('\n'));
console.log(`Recharts v3 source migration audit passed (${chartFiles.length} chart modules)`);
