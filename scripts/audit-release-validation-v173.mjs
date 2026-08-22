import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const root = process.cwd();
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const walk = (dir, out = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out); else out.push(full);
  }
  return out;
};
const rel = (file) => path.relative(root, file).replaceAll('\\', '/');
const files = walk(root);

const forbidden = files.filter((file) => {
  const r = rel(file);
  const b = path.basename(file).toLowerCase();
  if (r.startsWith('dist/') || r.startsWith('dist-miniapp/') || r.startsWith('coverage/') || r.startsWith('node_modules/')) return true;
  if (b === '.env' || b === 'cloudflared.exe' || b === 'miniapp_public_url.txt') return true;
  if (/\.(db|sqlite|sqlite3|wal|shm|log|bak)$/i.test(b)) return true;
  if (/\.(pem|p12|pfx)$/i.test(b) || /private[-_.]?key/i.test(b)) return true;
  return false;
});
assert.deepEqual(forbidden, [], `Forbidden release artifacts: ${forbidden.map(rel).join(', ')}`);

const markdownChangelog = files.filter((file) => /(^|\/)(change(log)?|release[-_ ]?notes).*\.md$/i.test(rel(file)));
assert.deepEqual(markdownChangelog, [], `Markdown changelog/release notes are forbidden: ${markdownChangelog.map(rel).join(', ')}`);

const styleFiles = files.filter((file) => /\.(css|scss|less)$/i.test(file));
assert.equal(styleFiles.length, 455, `Expected retained style inventory of 455 files, found ${styleFiles.length}`);

const edge = fs.readFileSync(path.join(root, 'deployment/cloudflare-pages/_worker.js'), 'utf8');
const schema = fs.readFileSync(path.join(root, 'deployment/cloudflare-pages/schema/0001_edge_snapshot.sql'), 'utf8');
const boundaries = fs.readFileSync(path.join(root, 'server/connectivity/runtimeBoundaries.ts'), 'utf8');
const snapshotValidation = fs.readFileSync(path.join(root, 'server/cloud/snapshots/miniAppSnapshotValidation.ts'), 'utf8');
const productionRoots = ['server', 'miniapp', 'deployment', 'pages', 'components', 'app', 'cloud']
  .map((name) => path.join(root, name)).filter((dir) => fs.existsSync(dir));
const productionFiles = productionRoots.flatMap((dir) => walk(dir, []));
const telegramTokenPattern = /\b[0-9]{6,12}:[A-Za-z0-9_-]{30,}\b/;
const privateKeyPattern = /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/;
const productionSecretMarkers = productionFiles.filter((file) => {
  const text = fs.readFileSync(file, 'utf8');
  return telegramTokenPattern.test(text) || privateKeyPattern.test(text);
});
assert.deepEqual(productionSecretMarkers, [], `Production secret-like markers found: ${productionSecretMarkers.map(rel).join(', ')}`);

assert.match(boundaries, /backend:\s*\{\s*bindHost:\s*"127\.0\.0\.1",\s*port:\s*3001,\s*publicListener:\s*false/);
assert.match(boundaries, /selfHostedMiniAppGateway:\s*\{\s*bindHost:\s*"127\.0\.0\.1",\s*port:\s*4180/);
assert.doesNotMatch(edge, /TELEGRAM_BOT_TOKEN|BOT_TOKEN\s*=/);
assert.match(snapshotValidation, /purchasePrice/);
assert.match(snapshotValidation, /grossProfit/);
assert.match(schema, /CHECK \(subject_kind IN \('customer', 'partner'\)\)/);
assert.doesNotMatch(schema, /staff/i);

assert.equal(pkg.engines?.node, '^22.17.0 || >=24.0.0');
assert.equal(pkg.engines?.npm, '>=10.9.2 <12');
assert.equal(pkg.scripts?.['test:release-validation-v173'], 'node scripts/test-release-validation-v173.mjs');
assert.equal(pkg.scripts?.['audit:release-validation-v173'], 'node scripts/audit-release-validation-v173.mjs');

const version = process.versions.node.split('.').map(Number);
const currentNodeEligible = version[0] >= 24 || (version[0] === 22 && version[1] >= 17);
const hash = crypto.createHash('sha256');
for (const file of [...files].sort()) {
  hash.update(rel(file)); hash.update('\0'); hash.update(fs.readFileSync(file)); hash.update('\0');
}

console.log(JSON.stringify({
  status: 'PASS',
  phase: 13,
  sourceAudit: {
    forbiddenRuntimeArtifacts: 0,
    markdownChangelogFiles: 0,
    retainedStyleFiles: styleFiles.length,
    backendPublicListener: false,
    gatewayOriginPort: 4180,
    staffSnapshotSchema: false,
    botTokenInEdgeBundle: false,
    productionSecretMarkers: 0,
  },
  environment: {
    node: process.versions.node,
    npmRequired: pkg.engines.npm,
    nodeRequired: pkg.engines.node,
    currentNodeEligible,
    note: currentNodeEligible ? 'runtime satisfies project engine contract' : 'environment blocker only: use Node >=22.17.0 or >=24 for full production build/typecheck',
  },
  sourceTreeSha256: hash.digest('hex'),
}, null, 2));
