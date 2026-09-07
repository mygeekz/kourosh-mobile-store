#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PARTNER_SETTLEMENT_SAFETY_GUARD_CI_SCOPE_VERSION,
  classifyPartnerSettlementSafetyGuardCiChanges,
  normalizeProjectPath,
} from '../server/tests/helpers/partnerSettlementProtectedSourceScope.mjs';

const SHA_PATTERN = /^[0-9a-f]{7,64}$/i;

export const parsePlannerArgs = (argv) => {
  const parsed = { base: null, head: null, githubOutput: null, changedFiles: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const value = argv[index + 1];
    if (argument === '--base' || argument === '--head' || argument === '--github-output' || argument === '--changed-file') {
      if (!value || value.startsWith('--')) throw new Error(`Missing value for ${argument}`);
      if (argument === '--base') parsed.base = value;
      if (argument === '--head') parsed.head = value;
      if (argument === '--github-output') parsed.githubOutput = value;
      if (argument === '--changed-file') parsed.changedFiles.push(normalizeProjectPath(value));
      index += 1;
      continue;
    }
    throw new Error(`Unsupported planner argument: ${argument}`);
  }
  return parsed;
};

export const readChangedFilesFromGit = ({ base, head, cwd = process.cwd() }) => {
  if (!SHA_PATTERN.test(String(base ?? '')) || !SHA_PATTERN.test(String(head ?? ''))) {
    throw new Error('Base and head must be hexadecimal commit SHAs.');
  }
  const result = spawnSync('git', ['diff', '--name-only', '--diff-filter=ACMRD', `${base}...${head}`], {
    cwd,
    encoding: 'utf8',
    shell: false,
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`git diff failed with exit status ${String(result.status)}`);
  return String(result.stdout ?? '')
    .split(/\r?\n/)
    .map(normalizeProjectPath)
    .filter(Boolean);
};

export const buildPlannerDecision = ({ changedFiles, plannerError = null }) => {
  if (plannerError) {
    return Object.freeze({
      scopeVersion: PARTNER_SETTLEMENT_SAFETY_GUARD_CI_SCOPE_VERSION,
      run: true,
      reason: 'planner-error-fail-closed',
      changedFileCount: changedFiles.length,
      relevantFileCount: 0,
      ignoredFileCount: changedFiles.length,
      relevantFiles: Object.freeze([]),
      ignoredFiles: Object.freeze([...changedFiles]),
      error: String(plannerError instanceof Error ? plannerError.message : plannerError).slice(0, 240),
    });
  }
  return classifyPartnerSettlementSafetyGuardCiChanges(changedFiles);
};

export const writeGitHubOutput = (outputPath, decision) => {
  if (!outputPath) return;
  const lines = [
    `run=${String(decision.run)}`,
    `reason=${decision.reason}`,
    `changed_count=${String(decision.changedFileCount)}`,
    `relevant_count=${String(decision.relevantFileCount)}`,
    `ignored_count=${String(decision.ignoredFileCount)}`,
    `scope_version=${decision.scopeVersion}`,
  ];
  fs.appendFileSync(outputPath, `${lines.join('\n')}\n`, 'utf8');
};

export const runPlannerCli = ({ argv = process.argv.slice(2), cwd = process.cwd() } = {}) => {
  let parsed;
  let changedFiles = [];
  let plannerError = null;
  try {
    parsed = parsePlannerArgs(argv);
    changedFiles = parsed.changedFiles.length > 0
      ? parsed.changedFiles
      : readChangedFilesFromGit({ base: parsed.base, head: parsed.head, cwd });
  } catch (error) {
    plannerError = error;
    parsed ??= { githubOutput: null };
  }
  const decision = buildPlannerDecision({ changedFiles, plannerError });
  writeGitHubOutput(parsed.githubOutput, decision);
  process.stdout.write(`${JSON.stringify(decision, null, 2)}\n`);
  return decision;
};

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) runPlannerCli();
