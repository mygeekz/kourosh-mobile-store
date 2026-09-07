import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const notes = [];
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const walk = (dir, exts) => {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) return [];
  const out = [];
  for (const ent of fs.readdirSync(abs, { withFileTypes: true })) {
    const rel = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(rel, exts));
    else if (exts.some((ext) => ent.name.endsWith(ext))) out.push(rel.replaceAll('\\', '/'));
  }
  return out;
};

const contract = read('components/ui/actionControlContract.tsx');
const button = read('components/Button.tsx');
const styleContext = read('contexts/StyleContext.tsx');
const personalization = read('styles/system/ui-personalization-foundation.css');
const packageJson = JSON.parse(read('package.json'));

for (const token of [
  "TEMPLATE_BOUND_ACTION_VARIANTS = ['primary', 'secondary', 'ghost', 'neutral']",
  "SEMANTIC_ACTION_VARIANTS = ['success', 'warning', 'danger']",
  'resolveActionControlColorOwner',
]) {
  if (!contract.includes(token)) failures.push(`Action control ownership contract missing: ${token}`);
}
for (const token of ['data-ui-color-owner', 'data-ui-interaction-owner', 'resolveActionControlColorOwner(variant)']) {
  if (!button.includes(token)) failures.push(`Button primitive does not publish template ownership metadata: ${token}`);
}
for (const token of ["root.style.setProperty('--button-press'", "root.style.setProperty('--button-active'"]) {
  if (!styleContext.includes(token)) failures.push(`StyleContext no longer publishes ${token}`);
}
for (const token of [
  '[data-ui-button="true"][data-ui-color-owner="template"]:active',
  '[data-ui-button="true"][data-ui-color-owner="template"]):is(',
  'hsl(var(--button-press))',
  'hsl(var(--button-active))',
]) {
  if (!personalization.includes(token)) failures.push(`Template interaction CSS missing: ${token}`);
}
if (!personalization.includes('Danger/warning/success remain semantic')) {
  failures.push('Template press contract must explicitly preserve semantic variants.');
}

const liveFiles = [
  ...walk('components', ['.tsx', '.ts']),
  ...walk('pages', ['.tsx', '.ts']),
  ...walk('app', ['.tsx', '.ts']),
];

let canonicalButtons = 0;
let statefulButtons = 0;
let inlineColorOwners = 0;
const colorClassPattern = /(?:^|\s)!?(?:bg|text|border)-(?:primary|emerald|green|blue|sky|indigo|amber|orange|yellow|rose|red|violet|purple|fuchsia)(?:-|\/|\b)/;
const semanticVariantPattern = /variant\s*=\s*(?:["'](?:success|warning|danger)["']|\{[^}]{0,700}(?:["']success["']|["']warning["']|["']danger["'])[^}]{0,700}\})/s;

const extractButtonOpeningTags = (source) => {
  const tags = [];
  let cursor = 0;
  while (cursor < source.length) {
    const start = source.indexOf('<Button', cursor);
    if (start < 0) break;
    let index = start + '<Button'.length;
    let braceDepth = 0;
    let quote = null;
    let escaped = false;
    for (; index < source.length; index += 1) {
      const ch = source[index];
      if (quote) {
        if (escaped) escaped = false;
        else if (ch === '\\') escaped = true;
        else if (ch === quote) quote = null;
        continue;
      }
      if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
      if (ch === '{') { braceDepth += 1; continue; }
      if (ch === '}' && braceDepth > 0) { braceDepth -= 1; continue; }
      if (ch === '>' && braceDepth === 0) {
        tags.push({ index: start, tag: source.slice(start, index + 1) });
        cursor = index + 1;
        break;
      }
    }
    if (index >= source.length) break;
  }
  return tags;
};

for (const rel of liveFiles.filter((file) => file.endsWith('.tsx'))) {
  const source = read(rel);
  for (const match of extractButtonOpeningTags(source)) {
    const tag = match.tag;
    if (/\bunstyled(?:\s|=|\/|>)/.test(tag)) continue;
    canonicalButtons += 1;
    const line = source.slice(0, match.index).split('\n').length;

    const stateful = /\baria-(?:pressed|selected|checked)\s*=|\bdata-(?:active|state)\s*=/.test(tag);
    if (stateful) {
      statefulButtons += 1;
      if (semanticVariantPattern.test(tag)) {
        failures.push(`${rel}:${line} stateful Button uses semantic success/warning/danger instead of template selected state.`);
      }
    }

    // Canonical Button owns its color via variant/template. Page code may still
    // control geometry, but must not inject a competing inline color owner.
    if (/\bstyle\s*=/.test(tag)) {
      inlineColorOwners += 1;
      failures.push(`${rel}:${line} canonical Button has inline style ownership; use variant/template tokens instead.`);
    }
    const staticClass = tag.match(/className\s*=\s*["']([^"']*)["']/)?.[1] || '';
    const templateClass = tag.match(/className\s*=\s*\{`([\s\S]*?)`\}/)?.[1] || '';
    const ownedClass = `${staticClass} ${templateClass}`.trim();
    if (colorClassPattern.test(ownedClass)) {
      inlineColorOwners += 1;
      failures.push(`${rel}:${line} canonical Button hard-codes color classes: ${ownedClass}`);
    }
  }
}

// Success is deliberately narrow: it is a completed/success semantic action,
// never a generic save/send/create/activate button and never a selection color.
const staticSuccessRefs = [];
for (const rel of liveFiles) {
  const source = read(rel);
  for (const match of source.matchAll(/(?:variant|submitVariant)=["']success["']/g)) {
    staticSuccessRefs.push(`${rel}:${source.slice(0, match.index).split('\n').length}`);
  }
}
if (staticSuccessRefs.length !== 1 || !staticSuccessRefs[0].startsWith('pages/settings/SettingsTelegramPanel.tsx:')) {
  failures.push(`Success variant must remain reserved for the explicit completed Telegram todo action; found ${staticSuccessRefs.join(', ') || 'none'}.`);
}

// Operational actions known to have regressed in the past must be template-owned.
const operationalChecks = [
  ['components/CartSummary.tsx', /variant="primary"[\s\S]{0,700}ثبت اطلاعات نهایی فاکتور/],
  ['pages/SalesCartPage.tsx', /variant=\{creditLimitManagerApproved \? 'primary' : 'secondary'\}[\s\S]{0,250}aria-pressed=\{creditLimitManagerApproved\}/],
  ['components/SmsBulkTestModal.tsx', /variant=\{checked \? 'primary' : 'secondary'\}[\s\S]{0,180}aria-pressed=\{checked\}/],
  ['components/SmsTestRecipientAllowlistCard.tsx', /variant=\{item\.enabled \? 'secondary' : 'primary'\}/],
];
for (const [rel, pattern] of operationalChecks) {
  if (!pattern.test(read(rel))) failures.push(`${rel} no longer follows the template-owned operational action contract.`);
}

const releaseAuditScript = String(packageJson.scripts?.['audit:release'] || '');
if (!releaseAuditScript.includes('audit:button-template-enforcement-v285')) {
  failures.push('audit:release must run audit:button-template-enforcement-v285 so release verification catches violations.');
}
if (!String(packageJson.scripts?.['audit:button-template-enforcement-v285'] || '').includes('audit-button-template-enforcement-v285.mjs')) {
  failures.push('package.json is missing audit:button-template-enforcement-v285.');
}

notes.push(`canonicalButtons=${canonicalButtons}`);
notes.push(`statefulButtons=${statefulButtons}`);
notes.push(`inlineColorOwners=${inlineColorOwners}`);
notes.push(`semanticSuccess=${staticSuccessRefs.length}`);

if (failures.length) {
  console.error('Button/Template enforcement v285 audit FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`Button/Template enforcement v285 audit passed (${notes.join(', ')}).`);
