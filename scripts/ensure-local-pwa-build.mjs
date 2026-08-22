import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const requiredOutputs = [
  path.join(root, 'dist', 'index.html'),
  path.join(root, 'dist', 'sw.js'),
  path.join(root, 'dist', 'manifest.webmanifest'),
  path.join(root, 'dist', 'icons', 'icon-192.png'),
  path.join(root, 'dist', 'icons', 'icon-512.png'),
  path.join(root, 'dist', 'icons', 'maskable-512.png'),
];

const SOURCE_VERSION_FILE = 'KOUROSH_SOURCE_VERSION';
const DIST_VERSION_FILE = '.kourosh-source-version';

const readTrimmedFile = (filePath) => {
  try {
    return fs.readFileSync(filePath, 'utf8').trim();
  } catch {
    return '';
  }
};

export const readSourceVersion = (rootDir = root) =>
  readTrimmedFile(path.join(rootDir, SOURCE_VERSION_FILE));

export const readDistSourceVersion = (rootDir = root) =>
  readTrimmedFile(path.join(rootDir, 'dist', DIST_VERSION_FILE));

export const isDistCurrentForSource = (rootDir = root) => {
  const sourceVersion = readSourceVersion(rootDir);
  // Older installations did not publish a source marker. Preserve their
  // established reuse behavior until a versioned release is extracted.
  if (!sourceVersion) return true;
  return readDistSourceVersion(rootDir) === sourceVersion;
};

export const writeDistSourceVersion = (rootDir = root) => {
  const sourceVersion = readSourceVersion(rootDir);
  if (!sourceVersion) return;
  fs.writeFileSync(path.join(rootDir, 'dist', DIST_VERSION_FILE), `${sourceVersion}\n`, 'utf8');
};

export const validateGeneratedOutputs = (rootDir = root) => {
  const files = [
    path.join(rootDir, 'dist', 'index.html'),
    path.join(rootDir, 'dist', 'sw.js'),
    path.join(rootDir, 'dist', 'manifest.webmanifest'),
    path.join(rootDir, 'dist', 'icons', 'icon-192.png'),
    path.join(rootDir, 'dist', 'icons', 'icon-512.png'),
    path.join(rootDir, 'dist', 'icons', 'maskable-512.png'),
  ];
  const filesReady = files.every((filePath) => {
    try {
      const stat = fs.statSync(filePath);
      return stat.isFile() && stat.size > 0;
    } catch {
      return false;
    }
  });
  if (!filesReady) return false;

  try {
    const index = fs.readFileSync(path.join(rootDir, 'dist', 'index.html'), 'utf8');
    const worker = fs.readFileSync(path.join(rootDir, 'dist', 'sw.js'), 'utf8');
    const manifest = JSON.parse(fs.readFileSync(path.join(rootDir, 'dist', 'manifest.webmanifest'), 'utf8'));
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

export const ensureLocalPwaBuild = (options = {}) => {
  const rootDir = options.rootDir || root;
  const out = options.stdout || process.stdout;
  const err = options.stderr || process.stderr;
  const forceValue = options.force ?? process.env.KOUROSH_FORCE_PWA_BUILD ?? '';
  const force = forceValue === true || String(forceValue) === '1';
  const validate = options.validate || validateGeneratedOutputs;

  const generatedOutputsReady = validate(rootDir);
  const distMatchesSource = isDistCurrentForSource(rootDir);

  // Normal restarts still reuse dist/ without hashing the source tree. A new
  // release changes one tiny marker, so extracting it over an existing install
  // invalidates the old production bundle exactly once.
  if (!force && generatedOutputsReady && distMatchesSource) {
    out.write('[pwa] Valid production output found; reusing dist/ without rebuild.\n');
    return { action: 'reuse', built: false };
  }

  out.write(force
    ? '[pwa] Forced rebuild requested. Building the installable production runtime...\n'
    : generatedOutputsReady && !distMatchesSource
      ? '[pwa] Source release changed; rebuilding the production runtime once...\n'
      : '[pwa] Production output is missing or invalid. Building once...\n');

  const npmExecPath = String(process.env.npm_execpath || '').trim();
  const useNpmCli = npmExecPath && fs.existsSync(npmExecPath);
  const buildCommand = useNpmCli ? process.execPath : (process.platform === 'win32' ? 'npm.cmd' : 'npm');
  const buildArgs = useNpmCli ? [npmExecPath, 'run', 'build'] : ['run', 'build'];
  const run = options.spawnSyncImpl || spawnSync;
  const result = run(buildCommand, buildArgs, {
    cwd: rootDir,
    env: {
      ...process.env,
      VITE_ENABLE_PWA_DEV: '0',
      VITE_DISABLE_PWA_BUILD: '0',
    },
    stdio: 'inherit',
    shell: !useNpmCli && process.platform === 'win32',
  });

  if (result?.error) {
    err.write(`[pwa] Failed to start the production build: ${String(result.error.message || result.error)}\n`);
    return { action: 'error', built: false, exitCode: 1 };
  }
  const exitCode = Number.isInteger(result?.status) ? result.status : 1;
  if (exitCode !== 0) {
    err.write(`[pwa] Production build failed with code ${exitCode}.\n`);
    return { action: 'error', built: false, exitCode };
  }
  if (!validate(rootDir)) {
    err.write('[pwa] Production output failed the manifest, icon or service-worker validation gate.\n');
    return { action: 'error', built: true, exitCode: 1 };
  }

  try {
    writeDistSourceVersion(rootDir);
  } catch (stampError) {
    err.write(`[pwa] Production build succeeded but its source-version stamp could not be written: ${String(stampError?.message || stampError)}\n`);
    return { action: 'error', built: true, exitCode: 1 };
  }

  out.write('[pwa] Installable production runtime is ready. Future normal starts will reuse dist/.\n');
  return { action: 'built', built: true, exitCode: 0 };
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = ensureLocalPwaBuild();
  if (result.action === 'error') process.exitCode = result.exitCode || 1;
}
