#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const movedConfigs = [
  'tsconfig.reports.audit.json',
  'tsconfig.settings.audit.json',
  'tsconfig.type-triage.components.json',
  'tsconfig.type-triage.contexts.json',
  'tsconfig.type-triage.dashboard.json',
  'tsconfig.type-triage.hooks.json',
  'tsconfig.type-triage.utils.json',
];

let failed = false;

for (const config of movedConfigs) {
  if (fs.existsSync(path.resolve(config))) {
    console.error(`Root still contains audit config: ${config}`);
    failed = true;
  }
  if (!fs.existsSync(path.resolve('config/typescript-audits', config))) {
    console.error(`Missing moved audit config: config/typescript-audits/${config}`);
    failed = true;
  }
}

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const scripts = Object.values(pkg.scripts ?? {}).join('\n');

for (const config of movedConfigs) {
  const escaped = config.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const rootRef = new RegExp(`(?<!config/typescript-audits/)${escaped}`);
  if (rootRef.test(scripts)) {
    console.error(`package.json still references root audit config: ${config}`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log('Root audit config cleanup passed.');
