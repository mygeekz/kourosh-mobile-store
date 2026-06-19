#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const normalize = (p) => p.split(path.sep).join('/');
const rel = (p) => normalize(path.relative(projectRoot, p));
const read = (p) => fs.readFileSync(p, 'utf8');
const existsFile = (p) => fs.existsSync(p) && fs.statSync(p).isFile();
const existsDir = (p) => fs.existsSync(p) && fs.statSync(p).isDirectory();

const settingsFile = path.join(projectRoot, 'pages', 'Settings.tsx');
const settingsDir = path.join(projectRoot, 'pages', 'settings');
const barrelFile = path.join(settingsDir, 'index.ts');
const typeFile = path.join(settingsDir, 'settingsPanelTypes.ts');

const localExtensions = ['', '.ts', '.tsx', '.js', '.jsx', '.css', '.json'];
function resolveLocalImport(sourceFile, specifier) {
  if (!specifier.startsWith('.')) return null;
  const base = path.resolve(path.dirname(sourceFile), specifier);
  const candidates = [];
  for (const ext of localExtensions) candidates.push(base + ext);
  candidates.push(path.join(base, 'index.ts'));
  candidates.push(path.join(base, 'index.tsx'));
  candidates.push(path.join(base, 'index.js'));
  candidates.push(path.join(base, 'index.jsx'));
  for (const candidate of candidates) {
    if (existsFile(candidate)) return candidate;
  }
  return null;
}

function listTsFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listTsFiles(p));
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(p);
  }
  return out;
}

function extractImports(text) {
  const imports = [];
  const regex = /import\s+(?:type\s+)?[\s\S]*?\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = regex.exec(text))) imports.push(match[1]);
  return imports;
}

function parseNamedImportFromSettingsIndex(text) {
  const regex = /import\s*\{([\s\S]*?)\}\s*from\s*['"]([^'"]+)['"]/g;
  let match;
  while ((match = regex.exec(text))) {
    if (match[2] !== './settings/index') continue;
    return match[1]
      .split(',')
      .map((raw) => raw.trim())
      .filter(Boolean)
      .map((raw) => {
        const isType = raw.startsWith('type ');
        let name = isType ? raw.slice(5).trim() : raw;
        if (name.includes(' as ')) name = name.split(' as ').pop().trim();
        return { name, isType };
      });
  }
  return [];
}

function parseBarrelExports(text) {
  const valueExports = new Map();
  const typeStarTargets = [];
  const exportRegex = /export\s+\{([\s\S]*?)\}\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = exportRegex.exec(text))) {
    const specifier = match[2];
    for (const part of match[1].split(',')) {
      let raw = part.trim();
      if (!raw) continue;
      if (raw.startsWith('type ')) raw = raw.slice(5).trim();
      if (raw.startsWith('default as ')) raw = raw.slice('default as '.length).trim();
      if (raw.includes(' as ')) raw = raw.split(' as ').pop().trim();
      valueExports.set(raw, specifier);
    }
  }
  const typeStarRegex = /export\s+type\s+\*\s+from\s+['"]([^'"]+)['"]/g;
  while ((match = typeStarRegex.exec(text))) typeStarTargets.push(match[1]);
  return { valueExports, typeStarTargets };
}

function parseExportedTypes(text) {
  const out = new Set();
  const typeRegex = /export\s+(?:type|interface)\s+([A-Za-z_$][\w$]*)/g;
  let match;
  while ((match = typeRegex.exec(text))) out.add(match[1]);
  return out;
}

function parseImportedNames(text) {
  const names = new Set();
  const regex = /import\s+([\s\S]*?)\s+from\s+['"][^'"]+['"]/g;
  let match;
  while ((match = regex.exec(text))) {
    const clause = match[1].trim();
    if (clause.startsWith('{')) {
      for (const part of clause.replace(/[{}]/g, '').split(',')) {
        let name = part.trim();
        if (!name) continue;
        if (name.startsWith('type ')) name = name.slice(5).trim();
        if (name.includes(' as ')) name = name.split(' as ').pop().trim();
        if (name) names.add(name);
      }
      continue;
    }
    const [defaultName, namedPart] = clause.split(',', 2);
    if (defaultName && !defaultName.includes('{')) names.add(defaultName.trim());
    if (namedPart && namedPart.includes('{')) {
      for (const part of namedPart.replace(/[{}]/g, '').split(',')) {
        let name = part.trim();
        if (!name) continue;
        if (name.startsWith('type ')) name = name.slice(5).trim();
        if (name.includes(' as ')) name = name.split(' as ').pop().trim();
        if (name) names.add(name);
      }
    }
  }
  return names;
}

const failures = [];
const warnings = [];
const files = [settingsFile, ...listTsFiles(settingsDir)];
const localImports = [];
for (const file of files) {
  const text = read(file);
  for (const specifier of extractImports(text)) {
    if (!specifier.startsWith('.')) continue;
    const resolved = resolveLocalImport(file, specifier);
    localImports.push({ source: rel(file), specifier, resolved: resolved ? rel(resolved) : null });
    if (!resolved) failures.push({ code: 'MISSING_LOCAL_IMPORT', source: rel(file), specifier });
  }
}

const settingsText = read(settingsFile);
if (/from\s+['"]\.\/settings['"]/.test(settingsText)) {
  failures.push({ code: 'WINDOWS_CASE_AMBIGUOUS_IMPORT', source: 'pages/Settings.tsx', detail: "Use './settings/index' instead of './settings'." });
}
if (!/from\s+['"]\.\/settings\/index['"]/.test(settingsText)) {
  failures.push({ code: 'MISSING_EXPLICIT_SETTINGS_BARREL_IMPORT', source: 'pages/Settings.tsx' });
}

const barrelText = read(barrelFile);
const { valueExports, typeStarTargets } = parseBarrelExports(barrelText);
const exportedTypes = new Set();
for (const specifier of typeStarTargets) {
  const target = resolveLocalImport(barrelFile, specifier);
  if (!target) {
    failures.push({ code: 'MISSING_TYPE_STAR_TARGET', source: rel(barrelFile), specifier });
    continue;
  }
  for (const name of parseExportedTypes(read(target))) exportedTypes.add(name);
}

const settingsNamedImports = parseNamedImportFromSettingsIndex(settingsText);
for (const item of settingsNamedImports) {
  if (item.isType) {
    if (!exportedTypes.has(item.name)) failures.push({ code: 'MISSING_TYPE_EXPORT_FROM_SETTINGS_BARREL', name: item.name });
  } else {
    if (!valueExports.has(item.name)) failures.push({ code: 'MISSING_VALUE_EXPORT_FROM_SETTINGS_BARREL', name: item.name });
  }
}

for (const [name, specifier] of valueExports.entries()) {
  const target = resolveLocalImport(barrelFile, specifier);
  if (!target) {
    failures.push({ code: 'MISSING_BARREL_EXPORT_TARGET', name, specifier });
    continue;
  }
  const targetText = read(target);
  if (!/export\s+default\s+/.test(targetText)) {
    failures.push({ code: 'BARREL_DEFAULT_EXPORT_TARGET_HAS_NO_DEFAULT', name, target: rel(target) });
  }
}

const importedNames = parseImportedNames(settingsText);
const runtimeSymbols = [
  'Link', 'useLocation', 'useNavigate', 'Notification', 'Modal', 'Button', 'ToggleSwitch', 'FormSection',
  'SmsPatternTestModal', 'SmsPatternPreviewModal', 'TelegramTemplateTestModal', 'SmsBulkTestModal'
];
for (const symbol of runtimeSymbols) {
  const used = new RegExp(`\\b${symbol}\\b`).test(settingsText);
  const imported = importedNames.has(symbol);
  if (used && !imported) failures.push({ code: 'SETTINGS_RUNTIME_SYMBOL_NOT_IMPORTED', symbol });
}

const anyPatterns = [
  { label: 'as any', regex: /\bas\s+any\b/g },
  { label: ': any', regex: /:\s*any\b/g },
  { label: 'any[]', regex: /\bany\s*\[\]/g },
  { label: 'Record<string, any>', regex: /Record\s*<\s*string\s*,\s*any\s*>/g },
];
const anyFindings = [];
for (const file of files) {
  const text = read(file);
  for (const pattern of anyPatterns) {
    const count = (text.match(pattern.regex) || []).length;
    if (count) anyFindings.push({ file: rel(file), pattern: pattern.label, count });
  }
}
if (anyFindings.length) warnings.push({ code: 'ANY_REMAINING_IN_SETTINGS_AREA', findings: anyFindings });

const hasDefaultSettings = /export\s+default\s+Settings\b/.test(settingsText) || /export\s+default\s+function\s+Settings\b/.test(settingsText);
if (!hasDefaultSettings) failures.push({ code: 'SETTINGS_DEFAULT_EXPORT_MISSING' });

const report = {
  ok: failures.length === 0,
  generatedAt: new Date().toISOString(),
  scope: ['pages/Settings.tsx', 'pages/settings/**/*.{ts,tsx}'],
  counts: {
    scannedFiles: files.length,
    localImports: localImports.length,
    settingsBarrelValueExports: valueExports.size,
    settingsBarrelTypeExports: exportedTypes.size,
    settingsImportsFromBarrel: settingsNamedImports.length,
    failures: failures.length,
    warnings: warnings.length,
  },
  failures,
  warnings,
  localImports,
  settingsNamedImports,
  valueExports: [...valueExports.keys()].sort(),
  typeExports: [...exportedTypes].sort(),
};

const outDir = path.join(projectRoot, 'docs');
if (existsDir(outDir)) {
  fs.writeFileSync(path.join(outDir, 'settings-import-export-audit-latest.json'), JSON.stringify(report, null, 2));
}

if (failures.length) {
  console.error('Settings import/export audit failed:');
  console.error(JSON.stringify(failures, null, 2));
  process.exit(1);
}
console.log(`Settings import/export audit passed (${files.length} files, ${localImports.length} local imports).`);
if (warnings.length) {
  console.log(`Warnings: ${warnings.length}`);
}
