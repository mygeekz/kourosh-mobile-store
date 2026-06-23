import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');

const root = process.cwd();
const sourceRoots = ['app', 'components', 'contexts', 'hooks', 'pages', 'utils', 'styles', 'types'];
const rootFiles = ['App.tsx', 'index.tsx', 'constants.tsx'];

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const current = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!['node_modules', 'dist', '.git'].includes(entry.name)) walk(current, files);
      continue;
    }
    if (/\.(tsx?|mts|cts)$/.test(entry.name) && !/\.d\.ts$/.test(entry.name)) files.push(current);
  }
  return files;
}

function collectIdentifierUses(sourceFile) {
  const uses = new Map();
  const visit = (node) => {
    if (ts.isImportDeclaration(node)) return;
    if (ts.isIdentifier(node)) uses.set(node.text, (uses.get(node.text) || 0) + 1);
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return uses;
}

const files = [
  ...sourceRoots.flatMap((dir) => walk(path.join(root, dir))),
  ...rootFiles.map((file) => path.join(root, file)).filter(fs.existsSync),
];

const findings = [];

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  const sourceFile = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const uses = collectIdentifierUses(sourceFile);

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !statement.importClause) continue;
    const importClause = statement.importClause;
    const moduleName = statement.moduleSpecifier.getText(sourceFile).replace(/^['"]|['"]$/g, '');

    if (importClause.name && !uses.has(importClause.name.text)) {
      findings.push({ file: path.relative(root, file), name: importClause.name.text, module: moduleName, kind: 'default' });
    }

    const bindings = importClause.namedBindings;
    if (!bindings) continue;

    if (ts.isNamespaceImport(bindings)) {
      if (!uses.has(bindings.name.text)) {
        findings.push({ file: path.relative(root, file), name: bindings.name.text, module: moduleName, kind: 'namespace' });
      }
      continue;
    }

    for (const specifier of bindings.elements) {
      const localName = specifier.name.text;
      if (!uses.has(localName)) {
        findings.push({ file: path.relative(root, file), name: localName, module: moduleName, kind: 'named' });
      }
    }
  }
}

if (findings.length > 0) {
  console.error('Unused import audit failed. Remove or justify these import bindings:');
  for (const finding of findings) {
    console.error(`- ${finding.file}: ${finding.name} from ${finding.module} (${finding.kind})`);
  }
  process.exit(1);
}

console.log(`Unused import audit passed: ${files.length} source files scanned and no unused import bindings found.`);
