import fs from 'node:fs';
import path from 'node:path';
import {
  projectRoot,
  readStyleManifest,
  renderStyleBootstrap,
} from './ui-system/style-manifest-utils.mjs';

const manifest = readStyleManifest();
const outputPath = path.join(projectRoot, manifest.runtimeEntry);
const expected = renderStyleBootstrap(manifest);
const checkOnly = process.argv.includes('--check');

if (checkOnly) {
  const current = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, 'utf8') : '';
  if (current !== expected) {
    console.error(`Style bootstrap drift detected in ${manifest.runtimeEntry}.`);
    console.error('Run: npm run generate:style-bootstrap');
    process.exit(1);
  }
  console.log(`Style bootstrap is synchronized (${expected.split('\n').filter((line) => line.startsWith('import ')).length} imports).`);
  process.exit(0);
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, expected);
console.log(`Generated ${manifest.runtimeEntry} from styles/manifest/style-manifest.json.`);
