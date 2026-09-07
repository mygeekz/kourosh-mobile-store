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

// 1) Runtime infrastructure must not mutate raw buttons into legacy ux-btn variants.
const globalEffects = read('components/GlobalButtonEffects.tsx');
for (const token of ['data-ux-enhanced', 'ux-btn--native', 'uxEnhanced', 'forceGlobalButton', "classList.add('ux-btn'", 'detectVariant(']) {
  if (globalEffects.includes(token)) failures.push(`GlobalButtonEffects still owns visual button styling: ${token}`);
}
if (!globalEffects.includes('data-ripple') || !globalEffects.includes('aria-busy')) {
  failures.push('GlobalButtonEffects lost its behavioral ripple/loading responsibilities.');
}

// 2) Broad CSS selectors that inspect arbitrary Tailwind/raw button classes are forbidden.
const cssFiles = walk('styles', ['.css']).filter((rel) => !rel.startsWith('styles/generated/'));
const bannedCssPatterns = [
  /button\.rounded-(?:lg|xl|2xl)\.border:not\(\.ux-btn\)/,
  /button\[class\*=["']rounded["']\]/,
  /button:not\(\[data-ui-button\]\)/,
];
for (const rel of cssFiles) {
  const source = read(rel);
  for (const pattern of bannedCssPatterns) {
    if (pattern.test(source)) failures.push(`${rel} contains broad raw-button selector ${pattern}`);
  }
}

const retiredSelectorTokens = ['ux-btn--native', 'data-ux-enhanced', 'premium-submit-btn', 'premium-cancel-btn', 'people-primary-btn', 'people-secondary-btn', 'inventory-inline-add'];
for (const rel of cssFiles.filter((file) => !file.startsWith('styles/system/legacy-quarantine/'))) {
  const source = read(rel);
  for (const token of retiredSelectorTokens) {
    if (source.includes(token)) failures.push(`${rel} still exposes retired button selector ${token}`);
  }
}

// 3) Retired compatibility action classes must not be used by live TS/TSX.
const liveFiles = [...walk('components', ['.tsx', '.ts']), ...walk('pages', ['.tsx', '.ts']), ...walk('app', ['.tsx', '.ts'])];
const retiredClasses = ['premium-submit-btn', 'premium-cancel-btn', 'people-primary-btn', 'people-secondary-btn', 'inventory-inline-add'];
for (const rel of liveFiles) {
  const source = read(rel);
  for (const token of retiredClasses) {
    if (source.includes(token)) failures.push(`${rel} still uses retired legacy action class ${token}`);
  }
}

// 4) Success variant is reserved for a true semantic completed/success action.
const successRefs = [];
let rawButtonCount = 0;
let canonicalButtonCount = 0;
for (const rel of liveFiles) {
  const source = read(rel);
  rawButtonCount += (source.match(/<button\b/g) || []).length;
  canonicalButtonCount += (source.match(/<Button\b/g) || []).length;
  for (const match of source.matchAll(/(?:variant|submitVariant)=["']success["']/g)) successRefs.push(`${rel}:${source.slice(0, match.index).split('\n').length}`);
}
const allowedSuccessRefs = successRefs.filter((ref) => ref.startsWith('pages/settings/SettingsTelegramPanel.tsx:'));
if (successRefs.length !== 1 || allowedSuccessRefs.length !== 1) {
  failures.push(`Expected exactly one semantic success action (Telegram todo completion); found ${successRefs.length}: ${successRefs.join(', ')}`);
}

// 5) Migration debt may remain for stateful/specialized controls, but must not regress.
const RAW_BUTTON_CEILING = 471;
if (rawButtonCount > RAW_BUTTON_CEILING) failures.push(`Raw <button> debt regressed: ${rawButtonCount} > ${RAW_BUTTON_CEILING}`);
notes.push(`rawButton=${rawButtonCount}`);
notes.push(`canonicalButton=${canonicalButtonCount}`);
notes.push(`semanticSuccess=${successRefs.length}`);

if (failures.length) {
  console.error('Legacy button/CSS cleanup v281 audit FAILED');
  for (const item of failures) console.error(`- ${item}`);
  process.exit(1);
}

console.log(`Legacy button/CSS cleanup v281 audit passed (${notes.join(', ')}).`);
