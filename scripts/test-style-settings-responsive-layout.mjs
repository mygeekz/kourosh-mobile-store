#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const tsx = fs.readFileSync(path.join(root, 'pages/settings/StyleSettings.tsx'), 'utf8');
const css = fs.readFileSync(path.join(root, 'styles/system/ui-personalization-foundation.css'), 'utf8');
const matrix = fs.readFileSync(path.join(root, 'scripts/run-style-settings-visual-matrix.mjs'), 'utf8');

const pass = (label, condition) => {
  assert.ok(condition, label);
  console.log(`PASS responsive Style Center: ${label}`);
};

pass('forms and controls card spans the available workspace',
  tsx.includes('className="style-settings-card style-settings-card--wide" title="فرم‌ها و اجزای رابط"'));
pass('accessibility card uses the same wide responsive rhythm',
  tsx.includes('className="style-settings-card style-settings-card--wide" title="دسترس‌پذیری"'));
pass('workspace establishes an inline-size query container',
  css.includes('.style-workspace {\n  container-type: inline-size;'));
pass('settings cards use content-width aware auto-fit columns',
  css.includes('grid-template-columns: repeat(auto-fit, minmax(min(100%, 460px), 1fr));'));
pass('two-column inner controls collapse by available width',
  css.includes('grid-template-columns: repeat(auto-fit, minmax(min(100%, 210px), 1fr));'));
pass('three-column inner controls collapse by available width',
  css.includes('grid-template-columns: repeat(auto-fit, minmax(min(100%, 170px), 1fr));'));
pass('segment controls are intrinsic-width responsive instead of fixed flex rows',
  css.includes('grid-template-columns: repeat(auto-fit, minmax(min(100%, 92px), 1fr));'));
pass('color editor uses intrinsic columns and no fixed viewport-dependent grid areas',
  css.includes('grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr));') && css.includes('grid-template-areas: none;'));
pass('container breakpoints cover narrow embedded settings workspaces',
  css.includes('@container (max-width: 760px)') && css.includes('@container (max-width: 560px)') && css.includes('@container (max-width: 390px)'));
pass('visual matrix covers the problematic laptop width',
  matrix.includes("width: 1024, height: 768"));
pass('visual matrix covers compact desktop width',
  matrix.includes("width: 1180, height: 820"));

console.log('PASS responsive Style Center: all source-level regression checks passed.');
