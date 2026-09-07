#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(root, 'styles/manifest/style-manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const outputIndex = process.argv.indexOf('--output');
const outputPath = outputIndex >= 0 && process.argv[outputIndex + 1]
  ? path.resolve(root, process.argv[outputIndex + 1])
  : path.join(root, '.kourosh-runtime/palette-matrix/palette-token-coverage.json');

const paletteOwners = new Set([
  'styles/themes.css',
  'styles/system/design-tokens.css',
  'styles/generated/tailwind-entry.generated.css',
]);
const enforcedCoreFiles = new Set([
  'styles/components/cards.css',
  'styles/components/forms.css',
]);
const priorityPaletteFiles = new Set([
  'styles/system/smart-insight-foundation.css',
  'styles/system/notifications-foundation.css',
  'styles/system/reports-shell-foundation.css',
  'styles/system/reports-redesign/smart-insights/smart-insights.phase1-stabilized.css',
  'styles/system/reports-redesign/reports-stage156-smart-insights-orbital-board.css',
  'styles/system/notifications-saas-redesign-phase95.css',
  'styles/pages/reports.css',
  'styles/system/reports-risk-cashflow-foundation.css',
  'styles/system/reports-redesign/reports-redesign-pass-4.css',
  'styles/system/reports-redesign/reports-stage184-today-commands-compact-polish.css',
  'styles/system/telegram-ui-foundation.css',
  'styles/system/telegram-runtime/message-composer-controls-foundation.css',
  'styles/system/telegram-runtime/message-composer-full-redesign-v68.css',
  'styles/system/telegram-runtime/legacy-telegram-monitor-foundation.css',
  'styles/system/telegram-runtime/telegram-real-compact-foundation.css',
  'styles/system/telegram-runtime/settings-telegram-compact-foundation.css',
  'styles/system/telegram-runtime/customer-telegram-link-modal-redesign.css',
  'styles/system/telegram-redesign/settings-telegram-redesign-pass-3.css',
  'styles/system/telegram-redesign/settings-telegram-redesign-pass-4.css',
  'styles/system/telegram-redesign/settings-telegram-redesign-pass-5.css',
  'styles/system/telegram-logs-redesign.css',
  'styles/pages/telegram.css',
  'styles/system/settings-shell-foundation.css',
  'styles/system/settings-modules-smart-foundation.css',
  'styles/system/settings-redesign/settings-users-account-business-final-polish.css',
  'styles/system/settings-redesign/settings-general-modules-final-polish.css',
  'styles/pages/settings.css',
  'styles/system/dashboard-redesign/dashboard-redesign-pass-4.css',
  'styles/system/dashboard-smart-widgets-foundation.css',
  'styles/pages/dashboard.css',
  'styles/components/dashboard-clock.css',
]);
const colorLiteral = /(?:#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\))/g;
const colorProperty = /^(?:background(?:-color|-image)?|color|border(?:-(?:top|right|bottom|left))?(?:-color)?|outline(?:-color)?|box-shadow|fill|stroke|caret-color|text-shadow)\s*:/i;
const statusSelector = /(?:success|danger|warning|error|alert|status|overdue|critical|healthy|paid|unpaid|risk|rose|red|green|amber|emerald)/i;
const safeLiteral = /(?:transparent|currentColor|#0000|data:image|rgba?\(255\s*,?\s*255\s*,?\s*255\s*,?\s*0\)|rgba?\(0\s*,?\s*0\s*,?\s*0\s*,?\s*0\))/i;

const activeFiles = manifest.localStyles
  .filter(entry => entry.runtimeActive && entry.path.endsWith('.css') && !paletteOwners.has(entry.path))
  .map(entry => entry.path)
  .filter(relative => fs.existsSync(path.join(root, relative)));

const findings = [];
for (const relative of activeFiles) {
  const lines = fs.readFileSync(path.join(root, relative), 'utf8').split(/\r?\n/);
  let selector = '';
  const selectorStack = [];
  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index];
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith('/*') || trimmed.startsWith('*')) continue;

    if (trimmed.endsWith('{')) {
      const candidate = trimmed.slice(0, -1).trim();
      selectorStack.push(selector);
      if (!candidate.startsWith('@')) selector = candidate;
      continue;
    }
    if (trimmed === '}') {
      selector = selectorStack.pop() || '';
      continue;
    }
    if (!colorProperty.test(trimmed) || trimmed.includes('var(') || trimmed.includes('color-mix(') || safeLiteral.test(trimmed)) continue;
    const literals = trimmed.match(colorLiteral) || [];
    if (!literals.length) continue;
    findings.push({
      file: relative,
      line: index + 1,
      selector,
      declaration: trimmed,
      literals,
      semanticStatus: statusSelector.test(selector),
      enforcedCore: enforcedCoreFiles.has(relative),
    });
  }
}

const byFile = new Map();
for (const finding of findings) byFile.set(finding.file, (byFile.get(finding.file) || 0) + finding.literals.length);
const topFiles = [...byFile.entries()].sort((a, b) => b[1] - a[1]).slice(0, 50).map(([file, literalCount]) => ({ file, literalCount }));
const coreViolations = findings.filter(finding => finding.enforcedCore && !finding.semanticStatus);
const blackShadowLiteral = /(?:rgba?\(\s*0(?:\s*,\s*|\s+)0(?:\s*,\s*|\s+)0(?:\s*[,\/]\s*)|#000(?:000)?(?:[0-9a-fA-F]{2})?\b)/i;
const priorityViolations = [];
for (const relative of priorityPaletteFiles) {
  const absolute = path.join(root, relative);
  if (!fs.existsSync(absolute)) {
    priorityViolations.push({ file: relative, line: 0, declaration: 'missing priority palette file' });
    continue;
  }
  const source = fs.readFileSync(absolute, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const declarationPattern = /(?:^|[;{])\s*((?:background(?:-color|-image)?|color|border(?:-(?:top|right|bottom|left))?(?:-color)?|outline(?:-color)?|box-shadow|fill|stroke|caret-color|text-shadow|scrollbar-color))\s*:\s*([^;{}]+);/gim;
  let match;
  while ((match = declarationPattern.exec(source))) {
    const property = match[1].toLowerCase();
    const value = match[2].trim();
    if (value.includes('var(') || value.includes('color-mix(') || !colorLiteral.test(value)) {
      colorLiteral.lastIndex = 0;
      continue;
    }
    colorLiteral.lastIndex = 0;
    const literals = value.match(colorLiteral) || [];
    const approvedBlackShadow = /shadow|filter/.test(property) && literals.length > 0 && literals.every(literal => blackShadowLiteral.test(literal));
    if (!approvedBlackShadow) {
      const line = source.slice(0, match.index).split(/\r?\n/).length;
      priorityViolations.push({ file: relative, line, declaration: `${property}: ${value}` });
    }
  }
}
const report = {
  generatedAt: new Date().toISOString(),
  activeCssFiles: activeFiles.length,
  filesWithHardcodedColors: byFile.size,
  hardcodedColorDeclarations: findings.length,
  hardcodedColorLiterals: findings.reduce((sum, finding) => sum + finding.literals.length, 0),
  enforcedCoreFiles: [...enforcedCoreFiles],
  priorityPaletteFiles: [...priorityPaletteFiles],
  coreViolations,
  priorityViolations,
  topFiles,
  note: 'Hard-coded semantic status colors are reported for visibility. Shared cards/forms and all priority palette-owner files must consume semantic palette tokens; only neutral black depth shadows are allowed in priority owners.',
};
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

if (priorityViolations.length) {
  console.error('Palette token coverage audit failed in priority palette-owner files:');
  for (const finding of priorityViolations) console.error(`- ${finding.file}:${finding.line} -> ${finding.declaration}`);
  process.exit(1);
}

if (coreViolations.length) {
  console.error('Palette token coverage audit failed in shared core files:');
  for (const finding of coreViolations) console.error(`- ${finding.file}:${finding.line} ${finding.selector} -> ${finding.declaration}`);
  process.exit(1);
}

console.log(JSON.stringify({
  status: 'passed',
  output: path.relative(root, outputPath),
  activeCssFiles: report.activeCssFiles,
  filesWithHardcodedColors: report.filesWithHardcodedColors,
  hardcodedColorDeclarations: report.hardcodedColorDeclarations,
  enforcedCoreFiles: report.enforcedCoreFiles,
  priorityPaletteFiles: report.priorityPaletteFiles,
  priorityViolations: report.priorityViolations.length,
}, null, 2));
