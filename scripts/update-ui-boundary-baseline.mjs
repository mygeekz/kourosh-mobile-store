import fs from 'node:fs';
import path from 'node:path';
import { projectRoot } from './ui-system/style-manifest-utils.mjs';
import { findDirectCssImports, scanUiBoundaries } from './ui-system/ui-boundary-utils.mjs';

const baseline = scanUiBoundaries();
baseline.phase = 'UI-0A';
baseline.generatedOn = new Date().toISOString().slice(0, 10);
baseline.policy = 'Existing primitive, legacy import, and direct canonical import debt may decrease but must not increase. New files start with a zero allowance.';
baseline.directCssImportsOutsideBootstrap = findDirectCssImports();

const output = path.join(projectRoot, 'docs/ui/baselines/ui-boundary-baseline.json');
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify(baseline, null, 2)}\n`);
console.log(`Updated ${path.relative(projectRoot, output)} (${Object.keys(baseline.byFile).length} files with tracked debt).`);
