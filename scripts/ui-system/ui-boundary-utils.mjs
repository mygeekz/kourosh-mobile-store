import fs from 'node:fs';
import path from 'node:path';
import { projectRoot, toPosix, walkFiles } from './style-manifest-utils.mjs';

const sourceRoots = ['app', 'components', 'pages'];
const uiManifest = JSON.parse(fs.readFileSync(path.join(projectRoot, 'config/ui/ui-manifest.json'), 'utf8'));
const withoutSourceExtension = (value) => value.replace(/\.(?:ts|tsx|js|jsx)$/, '');
const canonicalImportTargets = new Map(
  (uiManifest.components ?? []).map((component) => [
    withoutSourceExtension(toPosix(component.canonicalPath)),
    withoutSourceExtension(toPosix(component.barrelPath)),
  ]),
);

const resolveProjectImport = (importer, specifier) => {
  let resolved;
  if (specifier.startsWith('@/')) resolved = specifier.slice(2);
  else if (specifier.startsWith('@components/')) resolved = `components/${specifier.slice('@components/'.length)}`;
  else if (specifier.startsWith('.')) resolved = path.posix.normalize(path.posix.join(path.posix.dirname(importer), specifier));
  else return null;
  return withoutSourceExtension(toPosix(resolved).replace(/^\.\//, ''));
};

const isAllowedCanonicalBarrel = (resolved, barrelPath) =>
  resolved === barrelPath || resolved === barrelPath.replace(/\/index$/, '');

const primitivePatterns = {
  rawButton: /<button\b/g,
  rawInput: /<input\b/g,
  rawSelect: /<select\b/g,
  rawTextarea: /<textarea\b/g,
  rawTable: /<table\b/g,
  inlineStyle: /\bstyle\s*=\s*\{\{/g,
};
const canonicalPrimitiveExemptions = {
  'components/Button.tsx': new Set(['rawButton']),
  'components/header/HeaderIconButton.tsx': new Set(['rawButton']),
  'components/ui/DataTableShell.tsx': new Set(['rawTable']),
  'components/ui/SelectField.tsx': new Set(['rawSelect']),
  'components/ui/TextareaField.tsx': new Set(['rawTextarea']),
};

const legacyImportTargets = new Set(
  (uiManifest.legacyComponents ?? []).map((component) =>
    withoutSourceExtension(toPosix(component.path)),
  ),
);

const countMatches = (source, pattern) => (source.match(pattern) ?? []).length;

export const scanUiBoundaries = () => {
  const files = [];
  for (const sourceRoot of sourceRoots) {
    const absoluteRoot = path.join(projectRoot, sourceRoot);
    if (!fs.existsSync(absoluteRoot)) continue;
    files.push(...walkFiles(absoluteRoot, (file) => /\.(ts|tsx)$/.test(file)));
  }

  const byFile = {};
  for (const absolute of files) {
    const relative = toPosix(path.relative(projectRoot, absolute));
    const source = fs.readFileSync(absolute, 'utf8');
    const metrics = {};
    const exemptions = canonicalPrimitiveExemptions[relative] ?? new Set();
    for (const [metric, pattern] of Object.entries(primitivePatterns)) {
      metrics[metric] = exemptions.has(metric) ? 0 : countMatches(source, pattern);
    }

    const importSpecifiers = [...source.matchAll(/(?:import[^'";]*?from\s*|import\s*)['"]([^'"]+)['"]/g)]
      .map((match) => match[1]);
    metrics.legacyUiImports = importSpecifiers.filter((specifier) => {
      const resolved = resolveProjectImport(relative, specifier);
      return Boolean(resolved && legacyImportTargets.has(resolved));
    }).length;

    const isUiFoundationInternal = relative.startsWith('components/ui/');
    metrics.directCanonicalUiImports = isUiFoundationInternal
      ? 0
      : importSpecifiers.filter((specifier) => {
          const resolved = resolveProjectImport(relative, specifier);
          if (!resolved) return false;
          const barrelPath = canonicalImportTargets.get(resolved);
          return Boolean(barrelPath && !isAllowedCanonicalBarrel(resolved, barrelPath));
        }).length;

    if (Object.values(metrics).some((value) => value > 0)) byFile[relative] = metrics;
  }

  return {
    schemaVersion: 1,
    sourceRoots,
    metrics: Object.keys(primitivePatterns).concat('legacyUiImports', 'directCanonicalUiImports'),
    byFile,
  };
};

export const findDirectCssImports = () => {
  const codeFiles = walkFiles(projectRoot, (file) => /\.(?:ts|tsx|js|jsx|mjs|cjs)$/.test(file));
  const violations = [];
  for (const absolute of codeFiles) {
    const relative = toPosix(path.relative(projectRoot, absolute));
    if (relative === 'app/bootstrap/styles.ts') continue;
    const source = fs.readFileSync(absolute, 'utf8');
    const matches = [...source.matchAll(/(?:import\s*|require\()\s*['"]([^'"]+\.css)['"]/g)];
    for (const match of matches) {
      const line = source.slice(0, match.index).split('\n').length;
      violations.push({ file: relative, line, specifier: match[1] });
    }
  }
  return violations;
};
