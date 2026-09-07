#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import ts from "typescript";

const scopeIndex = process.argv.indexOf("--scope");
const scope = scopeIndex >= 0 ? process.argv[scopeIndex + 1] : "";
assert.ok(
  scope === "client" || scope === "server",
  "Use --scope client or --scope server.",
);

const root = process.cwd();
const baseline = JSON.parse(
  fs.readFileSync(
    path.join(root, "config/quality/typescript-baseline.json"),
    "utf8",
  ),
);
assert.equal(baseline.schemaVersion, 1, "Unsupported TypeScript baseline schema.");
const expected = baseline[scope];
const configPath = path.resolve(root, expected.config);
const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
if (configFile.error) {
  throw new Error(
    ts.flattenDiagnosticMessageText(configFile.error.messageText, "\n"),
  );
}
const parsed = ts.parseJsonConfigFileContent(
  configFile.config,
  ts.sys,
  path.dirname(configPath),
);
if (parsed.errors.length > 0) {
  throw new Error(
    parsed.errors
      .map((diagnostic) =>
        ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
      )
      .join("\n"),
  );
}

const program = ts.createProgram({
  rootNames: parsed.fileNames,
  options: parsed.options,
});
const diagnostics = ts.getPreEmitDiagnostics(program);
const diagnosticsByCode = {};
const affectedFiles = new Set();
for (const diagnostic of diagnostics) {
  const code = String(diagnostic.code);
  diagnosticsByCode[code] = (diagnosticsByCode[code] || 0) + 1;
  if (diagnostic.file) {
    affectedFiles.add(
      path.relative(root, diagnostic.file.fileName).replaceAll("\\", "/"),
    );
  }
}

const regressions = [];
if (diagnostics.length > expected.totalDiagnostics) {
  regressions.push(
    `total diagnostics increased: ${expected.totalDiagnostics} -> ${diagnostics.length}`,
  );
}
if (affectedFiles.size > expected.affectedFiles) {
  regressions.push(
    `affected files increased: ${expected.affectedFiles} -> ${affectedFiles.size}`,
  );
}
for (const [code, count] of Object.entries(diagnosticsByCode)) {
  const allowed = expected.diagnosticsByCode?.[code] || 0;
  if (count > allowed) {
    regressions.push(`TS${code} increased: ${allowed} -> ${count}`);
  }
}

console.log(
  JSON.stringify(
    {
      scope,
      config: expected.config,
      totalDiagnostics: diagnostics.length,
      affectedFiles: affectedFiles.size,
      diagnosticsByCode,
      status: regressions.length === 0 ? "not-increased" : "regressed",
    },
    null,
    2,
  ),
);
assert.deepEqual(
  regressions,
  [],
  `TypeScript quality baseline regression:\n${regressions.join("\n")}`,
);
