import fs from 'node:fs';

const cssPath = 'styles/system/notifications-saas-redesign-phase95.css';
const css = fs.readFileSync(cssPath, 'utf8');

const checks = [
  ['v291 successor ownership marker', css.includes('v291 — notification header containment keeps every status label readable without adding CSS debt')],
  ['header allocates enough desktop width', /minmax\(0,\s*430px\)/.test(css)],
  ['tab labels explicitly clip no text', /notifications-compact-v2 \.notifications-saas-header-tabs__label\s*\{[\s\S]*?text-overflow:\s*clip\s*!important[\s\S]*?white-space:\s*nowrap\s*!important/.test(css)],
  ['tab buttons allow visible labels', /notifications-saas-header-tabs button\s*\{[\s\S]*?overflow:\s*visible\s*!important/.test(css)],
  ['tablet header retains enough tab width', /@media\s*\(max-width:\s*1260px\)[\s\S]*?minmax\(0,\s*430px\)/.test(css)],
];

const failures = checks.filter(([, ok]) => !ok).map(([label]) => label);
if (failures.length) {
  console.error(`v290 notification header filter label audit failed: ${failures.join(', ')}`);
  process.exit(1);
}
console.log('v290/v291 notification header filter label audit passed.');
