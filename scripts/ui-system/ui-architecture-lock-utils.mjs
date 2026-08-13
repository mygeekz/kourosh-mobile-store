import fs from 'node:fs';
import path from 'node:path';

import {
  projectRoot,
  readStyleManifest,
  toPosix,
  walkFiles,
} from './style-manifest-utils.mjs';

export const architectureLockBaselinePath = path.join(
  projectRoot,
  'config/ui/ui-architecture-lock-baseline.json',
);

const uiManifestPath = path.join(projectRoot, 'config/ui/ui-manifest.json');

const withoutSourceExtension = (value) => value.replace(/\.(?:ts|tsx|js|jsx)$/, '');

const countMatches = (source, pattern) => (source.match(pattern) ?? []).length;

const getReservedNumbers = (values) => new Set(
  Object.values(values ?? {}).filter((value) => Number.isInteger(value)),
);

const countArbitraryMediaBreakpoints = (source, reservedBreakpoints) => {
  let count = 0;
  for (const mediaMatch of source.matchAll(/@media\s*([^\{]+)/g)) {
    const condition = mediaMatch[1];
    for (const pxMatch of condition.matchAll(/(?:min|max)-(?:width|height)\s*:\s*(\d+)px/g)) {
      if (!reservedBreakpoints.has(Number(pxMatch[1]))) count += 1;
    }
  }
  return count;
};

const countArbitraryTailwindBreakpoints = (source, reservedBreakpoints) => {
  let count = countMatches(source, /\[@media[^\]]+\]:/g);
  for (const match of source.matchAll(/(?:^|[\s'"`])(?:min|max)-\[(\d+)px\]:/g)) {
    if (!reservedBreakpoints.has(Number(match[1]))) count += 1;
  }
  return count;
};

const countArbitraryCssZIndexes = (source, reservedZIndexes) => {
  let count = 0;
  for (const match of source.matchAll(/\bz-index\s*:\s*(-?\d+)\b/g)) {
    if (!reservedZIndexes.has(Number(match[1]))) count += 1;
  }
  return count;
};

const countArbitraryTailwindZIndexes = (source, reservedZIndexes) => {
  let count = 0;
  for (const match of source.matchAll(/(?:^|[\s'"`])z-\[(-?\d+)\]/g)) {
    if (!reservedZIndexes.has(Number(match[1]))) count += 1;
  }
  return count;
};

export const readUiManifest = () => JSON.parse(fs.readFileSync(uiManifestPath, 'utf8'));

export const readArchitectureLockBaseline = () => JSON.parse(
  fs.readFileSync(architectureLockBaselinePath, 'utf8'),
);

export const scanUiArchitectureLock = () => {
  const uiManifest = readUiManifest();
  const styleManifest = readStyleManifest();
  const reservedBreakpoints = getReservedNumbers(uiManifest.responsiveContract?.breakpoints);
  const reservedZIndexes = getReservedNumbers(uiManifest.layerContract?.layers);

  const cssEntries = styleManifest.localStyles ?? [];
  const cssPaths = cssEntries.map((entry) => toPosix(entry.path)).sort();
  const runtimeActiveCssPaths = cssEntries
    .filter((entry) => entry.runtimeActive)
    .map((entry) => toPosix(entry.path))
    .sort();
  const patchStylePaths = cssEntries
    .filter((entry) => entry.patchStyleName)
    .map((entry) => toPosix(entry.path))
    .sort();

  const sourceFiles = [
    ...walkFiles(path.join(projectRoot, 'app'), (file) => /\.(?:ts|tsx)$/.test(file)),
    ...walkFiles(path.join(projectRoot, 'components'), (file) => /\.(?:ts|tsx)$/.test(file)),
    ...walkFiles(path.join(projectRoot, 'pages'), (file) => /\.(?:ts|tsx)$/.test(file)),
  ];

  const byFile = {};

  for (const entry of cssEntries) {
    if (entry.status === 'generated') continue;
    const absolute = path.join(projectRoot, entry.path);
    if (!fs.existsSync(absolute)) continue;
    const source = fs.readFileSync(absolute, 'utf8');
    const metrics = {
      importantDeclarations: countMatches(source, /!important\b/g),
      arbitraryBreakpoints: countArbitraryMediaBreakpoints(source, reservedBreakpoints),
      arbitraryZIndexes: countArbitraryCssZIndexes(source, reservedZIndexes),
    };
    if (Object.values(metrics).some((value) => value > 0)) {
      byFile[toPosix(entry.path)] = metrics;
    }
  }

  for (const absolute of sourceFiles) {
    const relative = toPosix(path.relative(projectRoot, absolute));
    const source = fs.readFileSync(absolute, 'utf8');
    const metrics = {
      arbitraryBreakpoints: countArbitraryTailwindBreakpoints(source, reservedBreakpoints),
      arbitraryZIndexes: countArbitraryTailwindZIndexes(source, reservedZIndexes),
    };
    if (Object.values(metrics).some((value) => value > 0)) {
      byFile[relative] = {
        ...(byFile[relative] ?? {}),
        ...metrics,
      };
    }
  }

  const registeredUiFoundationFiles = new Set([
    ...(uiManifest.components ?? []).map((component) => withoutSourceExtension(toPosix(component.canonicalPath))),
    ...(uiManifest.legacyComponents ?? []).map((component) => withoutSourceExtension(toPosix(component.path))),
  ]);
  const uiFoundationFiles = walkFiles(
    path.join(projectRoot, 'components/ui'),
    (file) => /\.(?:ts|tsx)$/.test(file),
  )
    .map((file) => toPosix(path.relative(projectRoot, file)))
    .filter((file) => file !== 'components/ui/index.ts')
    .sort();
  const unregisteredUiFoundationFiles = uiFoundationFiles.filter(
    (file) => !registeredUiFoundationFiles.has(withoutSourceExtension(file)),
  );

  return {
    cssPaths,
    runtimeActiveCssPaths,
    patchStylePaths,
    uiFoundationFiles,
    unregisteredUiFoundationFiles,
    byFile,
  };
};

export const summarizeArchitectureSnapshot = (snapshot) => {
  const totals = Object.values(snapshot.byFile).reduce(
    (acc, metrics) => {
      acc.importantDeclarations += metrics.importantDeclarations ?? 0;
      acc.arbitraryBreakpoints += metrics.arbitraryBreakpoints ?? 0;
      acc.arbitraryZIndexes += metrics.arbitraryZIndexes ?? 0;
      return acc;
    },
    { importantDeclarations: 0, arbitraryBreakpoints: 0, arbitraryZIndexes: 0 },
  );
  return {
    cssFiles: snapshot.cssPaths.length,
    runtimeCssFiles: snapshot.runtimeActiveCssPaths.length,
    patchStyleFiles: snapshot.patchStylePaths.length,
    uiFoundationFiles: snapshot.uiFoundationFiles.length,
    unregisteredUiFoundationFiles: snapshot.unregisteredUiFoundationFiles.length,
    ...totals,
  };
};
