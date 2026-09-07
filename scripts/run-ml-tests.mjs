#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const packageJsonPath = path.join(projectRoot, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const scripts = packageJson.scripts ?? {};

const mlScriptEntries = Object.entries(scripts)
  .filter(([scriptName]) => scriptName.startsWith('test:ml-'))
  .sort(([a], [b]) => a.localeCompare(b));

if (mlScriptEntries.length === 0) {
  console.error('[test:ml:all] No package.json scripts matched the test:ml-* contract.');
  process.exit(1);
}

const failures = [];

function parseNodeScriptCommand(scriptName, command) {
  const match = /^node\s+(.+)$/.exec(command.trim());
  if (!match) {
    throw new Error(`${scriptName} is not a direct node test command: ${command}`);
  }

  const args = match[1].trim().split(/\s+/).filter(Boolean);
  if (args.length === 0) {
    throw new Error(`${scriptName} does not define a test file to execute.`);
  }

  return args;
}

console.log(`[test:ml:all] Running ${mlScriptEntries.length} test:ml-* scripts.`);

for (const [index, [scriptName, command]] of mlScriptEntries.entries()) {
  console.log(`\n[test:ml:all] (${index + 1}/${mlScriptEntries.length}) ${command}`);

  let args;
  try {
    args = parseNodeScriptCommand(scriptName, command);
  } catch (error) {
    failures.push({ scriptName, detail: error instanceof Error ? error.message : String(error) });
    continue;
  }

  const result = spawnSync(process.execPath, args, {
    cwd: projectRoot,
    env: process.env,
    stdio: 'inherit',
  });

  if (result.error) {
    failures.push({ scriptName, detail: result.error.message });
    continue;
  }

  if (result.status !== 0) {
    failures.push({ scriptName, detail: `exit status ${result.status}` });
  }
}

console.log('\n[test:ml:all] Summary');
console.log(`[test:ml:all] Total: ${mlScriptEntries.length}`);
console.log(`[test:ml:all] Passed: ${mlScriptEntries.length - failures.length}`);
console.log(`[test:ml:all] Failed: ${failures.length}`);

if (failures.length > 0) {
  console.error('\n[test:ml:all] Failed scripts:');
  for (const failure of failures) {
    console.error(`- ${failure.scriptName}: ${failure.detail}`);
  }
  process.exit(1);
}

console.log('[test:ml:all] All test:ml-* scripts passed.');
