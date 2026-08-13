#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { ESLint } from "eslint";

const root = process.cwd();
const baselinePath = path.join(
  root,
  "config/quality/eslint-baseline.json",
);
const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
assert.equal(baseline.schemaVersion, 1, "Unsupported ESLint baseline schema.");

const eslint = new ESLint();
const results = await eslint.lintFiles(["."]);
const warningCounts = {};
let totalErrors = 0;
let totalWarnings = 0;
let affectedFiles = 0;

for (const result of results) {
  totalErrors += result.errorCount;
  totalWarnings += result.warningCount;
  if (result.messages.length > 0) affectedFiles += 1;
  for (const message of result.messages) {
    if (message.severity !== 1) continue;
    const ruleName = message.ruleId || "unused-disable-directive";
    warningCounts[ruleName] = (warningCounts[ruleName] || 0) + 1;
  }
}

const regressions = [];
if (totalErrors > baseline.totalErrors) {
  regressions.push(
    `ESLint errors increased: ${baseline.totalErrors} -> ${totalErrors}`,
  );
}
if (totalWarnings > baseline.totalWarnings) {
  regressions.push(
    `ESLint warnings increased: ${baseline.totalWarnings} -> ${totalWarnings}`,
  );
}
if (affectedFiles > baseline.affectedFiles) {
  regressions.push(
    `Affected files increased: ${baseline.affectedFiles} -> ${affectedFiles}`,
  );
}
for (const [ruleName, count] of Object.entries(warningCounts)) {
  const allowed = baseline.warningsByRule?.[ruleName] || 0;
  if (count > allowed) {
    regressions.push(`${ruleName} increased: ${allowed} -> ${count}`);
  }
}

console.log(
  JSON.stringify(
    {
      totalErrors,
      totalWarnings,
      affectedFiles,
      status: regressions.length === 0 ? "not-increased" : "regressed",
    },
    null,
    2,
  ),
);
assert.deepEqual(
  regressions,
  [],
  `ESLint quality baseline regression:\n${regressions.join("\n")}`,
);
