import fs from 'node:fs';
import path from 'node:path';

export const projectRoot = process.cwd();
export const styleManifestPath = path.join(projectRoot, 'styles/manifest/style-manifest.json');

export const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));

export const toPosix = (value) => value.split(path.sep).join('/');

export const walkFiles = (directory, predicate) => {
  const output = [];
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue;
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else if (!predicate || predicate(absolute)) output.push(absolute);
    }
  };
  walk(directory);
  return output;
};

export const getOrderedRuntimeImports = (manifest) => {
  const external = manifest.externalStyles.map((entry) => ({
    order: entry.order,
    specifier: entry.specifier,
    id: entry.id,
    kind: 'external',
  }));
  const local = manifest.localStyles
    .filter((entry) => entry.delivery === 'direct')
    .map((entry) => ({
      order: entry.bootstrapOrder,
      specifier: entry.importSpecifier,
      id: entry.id,
      kind: 'local',
    }));
  return [...external, ...local].sort((a, b) => a.order - b.order);
};

export const renderStyleBootstrap = (manifest) => {
  const imports = getOrderedRuntimeImports(manifest);
  const header = [
    '/**',
    ' * AUTO-GENERATED STYLE BOOTSTRAP — DO NOT EDIT MANUALLY.',
    ' *',
    ' * Source of truth: styles/manifest/style-manifest.json',
    ' * Generator: npm run generate:style-bootstrap',
    ' * Audit: npm run audit:style-manifest',
    ' *',
    ' * UI-0A intentionally preserves the existing cascade order. Every future',
    ' * style entry must be registered in the manifest before regeneration.',
    ' */',
  ];
  const importLines = imports.map((entry) => `import '${entry.specifier}';`);
  return `${header.join('\n')}\n${importLines.join('\n')}\n`;
};

export const readStyleManifest = () => readJson(styleManifestPath);
