import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runtimeDir = path.join(root, '.kourosh-runtime');
const stampPath = path.join(runtimeDir, 'pwa-build.json');
const requiredOutputs = [
  path.join(root, 'dist', 'index.html'),
  path.join(root, 'dist', 'sw.js'),
  path.join(root, 'dist', 'manifest.webmanifest'),
  path.join(root, 'dist', 'icons', 'icon-192.png'),
  path.join(root, 'dist', 'icons', 'icon-512.png'),
  path.join(root, 'dist', 'icons', 'maskable-512.png'),
];

const sourceRoots = [
  'app',
  'assets',
  'components',
  'config',
  'contexts',
  'hooks',
  'pages',
  'public',
  'services',
  'shared',
  'styles',
  'types',
  'utils',
];

const sourceFiles = [
  'App.tsx',
  'constants.tsx',
  'index.css',
  'index.html',
  'index.tsx',
  'package.json',
  'package-lock.json',
  'postcss.config.cjs',
  'tailwind.config.cjs',
  'tsconfig.json',
  'types.ts',
  'vite-env.d.ts',
  'vite.config.ts',
];

const ignoredNames = new Set([
  '.DS_Store',
  'Thumbs.db',
]);

const collectFiles = (absolutePath) => {
  if (!fs.existsSync(absolutePath)) return [];
  const stat = fs.statSync(absolutePath);
  if (stat.isFile()) return [absolutePath];
  if (!stat.isDirectory()) return [];

  const files = [];
  for (const entry of fs.readdirSync(absolutePath, { withFileTypes: true })) {
    if (ignoredNames.has(entry.name)) continue;
    const child = path.join(absolutePath, entry.name);
    if (entry.isDirectory()) files.push(...collectFiles(child));
    else if (entry.isFile()) files.push(child);
  }
  return files;
};

const hash = crypto.createHash('sha256');
hash.update('kourosh-local-pwa-build-v3\0');
const allFiles = [
  ...sourceFiles.map((relativePath) => path.join(root, relativePath)),
  ...sourceRoots.flatMap((relativePath) => collectFiles(path.join(root, relativePath))),
]
  .filter((filePath) => fs.existsSync(filePath) && fs.statSync(filePath).isFile())
  .sort((left, right) => left.localeCompare(right));

for (const filePath of allFiles) {
  const relativePath = path.relative(root, filePath).replace(/\\/g, '/');
  hash.update(relativePath);
  hash.update('\0');
  hash.update(fs.readFileSync(filePath));
  hash.update('\0');
}

const fingerprint = hash.digest('hex');
let previousFingerprint = '';
try {
  const previous = JSON.parse(fs.readFileSync(stampPath, 'utf8'));
  previousFingerprint = String(previous?.fingerprint || '');
} catch {
  previousFingerprint = '';
}

const validateGeneratedOutputs = () => {
  const filesReady = requiredOutputs.every((filePath) => {
    try {
      const stat = fs.statSync(filePath);
      return stat.isFile() && stat.size > 0;
    } catch {
      return false;
    }
  });
  if (!filesReady) return false;

  try {
    const index = fs.readFileSync(path.join(root, 'dist', 'index.html'), 'utf8');
    const worker = fs.readFileSync(path.join(root, 'dist', 'sw.js'), 'utf8');
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'dist', 'manifest.webmanifest'), 'utf8'));
    const workerPrefix = worker.slice(0, 320).toLowerCase();
    const iconSizes = new Set(
      (manifest.icons || [])
        .flatMap((icon) => String(icon.sizes || '').split(/\s+/))
        .filter(Boolean),
    );
    return Boolean(
      /manifest\.webmanifest/i.test(index) &&
      worker.trim().length > 0 &&
      !workerPrefix.includes('<!doctype html') &&
      !workerPrefix.includes('<html') &&
      (manifest.name || manifest.short_name) &&
      manifest.start_url &&
      ['standalone', 'fullscreen', 'minimal-ui'].includes(manifest.display) &&
      iconSizes.has('192x192') &&
      iconSizes.has('512x512')
    );
  } catch {
    return false;
  }
};

const outputsReady = validateGeneratedOutputs();

if (outputsReady && previousFingerprint === fingerprint) {
  console.log('[pwa] Production build is current; reusing dist/.');
  process.exit(0);
}

console.log('[pwa] Frontend source changed or production PWA output is missing.');
console.log('[pwa] Building the installable production runtime...');
const npmExecPath = String(process.env.npm_execpath || '').trim();
const useNpmCli = npmExecPath && fs.existsSync(npmExecPath);
const buildCommand = useNpmCli ? process.execPath : (process.platform === 'win32' ? 'npm.cmd' : 'npm');
const buildArgs = useNpmCli ? [npmExecPath, 'run', 'build'] : ['run', 'build'];
const result = spawnSync(buildCommand, buildArgs, {
  cwd: root,
  env: {
    ...process.env,
    VITE_ENABLE_PWA_DEV: '0',
    VITE_DISABLE_PWA_BUILD: '0',
  },
  stdio: 'inherit',
  shell: !useNpmCli && process.platform === 'win32',
});

if (result.error) {
  console.error('[pwa] Failed to start the production build:', result.error.message);
  process.exit(1);
}
if ((result.status ?? 1) !== 0) {
  console.error(`[pwa] Production build failed with code ${result.status ?? 1}.`);
  process.exit(result.status ?? 1);
}

if (!validateGeneratedOutputs()) {
  console.error('[pwa] Production output failed the manifest, icon or service-worker validation gate.');
  process.exit(1);
}

fs.mkdirSync(runtimeDir, { recursive: true });
fs.writeFileSync(stampPath, JSON.stringify({
  version: 3,
  fingerprint,
  builtAt: new Date().toISOString(),
}, null, 2));
console.log('[pwa] Installable production runtime is ready.');
