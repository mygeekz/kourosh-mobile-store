#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const helper = fs.readFileSync(path.join(root, 'pages/settings/settingsHelpers.ts'), 'utf8');
const seed = fs.readFileSync(path.join(root, 'server/db/seeds/defaultUsers.seed.ts'), 'utf8');
const expected = {
  admin: 'مدیر کل',
  manager: 'مدیر',
  salesperson: 'فروشنده',
  warehouse: 'انباردار',
  technician: 'تعمیرکار',
  marketer: 'بازاریاب',
};
for (const [key, value] of Object.entries(expected)) {
  if (!helper.includes(`${key}: '${value}'`)) throw new Error(`Missing Persian role label: ${key} -> ${value}`);
}
for (const internalName of ['Admin','Manager','Salesperson','Warehouse','Technician','Marketer']) {
  if (!seed.includes(`= "${internalName}"`)) throw new Error(`Internal role seed changed or missing: ${internalName}`);
}
if (!helper.includes("return ROLE_LABELS_FA[raw.toLowerCase()] || raw")) throw new Error('Role-label fallback contract changed unexpectedly.');
console.log('PASS v355 role localization: all six seeded PWA roles have Persian display labels; internal role names remain unchanged.');
