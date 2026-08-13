import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const clean = (value) => typeof value === 'string' && value.trim() ? value.trim().replace(/^"|"$/g, '') : null;

const isExecutableFile = (candidate) => {
  if (!candidate) return false;
  try {
    return fs.statSync(candidate).isFile();
  } catch {
    return false;
  }
};

const unique = (items) => [...new Set(items.map(clean).filter(Boolean))];

const readWhereCandidates = (names, platform) => {
  if (platform !== 'win32') return [];
  const values = [];
  for (const name of names) {
    const result = spawnSync('where.exe', [name], { encoding: 'utf8', windowsHide: true });
    if (result.status !== 0) continue;
    values.push(...String(result.stdout || '').split(/\r?\n/).map(clean).filter(Boolean));
  }
  return values;
};

const readWindowsAppPath = (fileName, hive) => {
  const key = `${hive}\\Software\\Microsoft\\Windows\\CurrentVersion\\App Paths\\${fileName}`;
  const result = spawnSync('reg.exe', ['query', key, '/ve'], { encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) return null;
  const match = String(result.stdout || '').match(/REG_SZ\s+(.+)$/m);
  return clean(match?.[1]);
};

export const buildBrowserExecutableCandidates = ({
  platform = process.platform,
  env = process.env,
  includeSystemLookup = true,
} = {}) => {
  const candidates = [
    env.KOUROSH_BROWSER_PATH,
    env.PUPPETEER_EXECUTABLE_PATH,
    env.CHROME_PATH,
    env.CHROMIUM_PATH,
    env.EDGE_PATH,
  ];

  if (platform === 'win32') {
    const localAppData = clean(env.LOCALAPPDATA);
    const programFiles = clean(env.PROGRAMFILES);
    const programFilesX86 = clean(env['PROGRAMFILES(X86)']);
    const programW6432 = clean(env.ProgramW6432);
    const roots = unique([localAppData, programFiles, programFilesX86, programW6432]);

    for (const root of roots) {
      candidates.push(
        path.win32.join(root, 'Google', 'Chrome', 'Application', 'chrome.exe'),
        path.win32.join(root, 'Google', 'Chrome Beta', 'Application', 'chrome.exe'),
        path.win32.join(root, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
        path.win32.join(root, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
        path.win32.join(root, 'Chromium', 'Application', 'chrome.exe'),
      );
    }

    if (includeSystemLookup) {
      for (const executable of ['chrome.exe', 'msedge.exe', 'brave.exe', 'chromium.exe']) {
        candidates.push(
          readWindowsAppPath(executable, 'HKCU'),
          readWindowsAppPath(executable, 'HKLM'),
        );
      }
      candidates.push(...readWhereCandidates(['chrome.exe', 'msedge.exe', 'brave.exe', 'chromium.exe'], platform));
    }
  } else if (platform === 'darwin') {
    candidates.push(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Google Chrome Beta.app/Contents/MacOS/Google Chrome Beta',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
    );
  } else {
    candidates.push(
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/microsoft-edge',
      '/usr/bin/microsoft-edge-stable',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/snap/bin/chromium',
    );
  }

  return unique(candidates);
};


export const describeBrowserExecutable = (executablePath) => {
  const normalized = String(executablePath || '').toLowerCase();
  if (!normalized) return 'مرورگر پیدا نشد';
  if (normalized.includes('msedge')) return 'Microsoft Edge';
  if (normalized.includes('brave')) return 'Brave';
  if (normalized.includes('chromium')) return 'Chromium';
  if (normalized.includes('chrome')) return 'Google Chrome';
  return path.basename(String(executablePath));
};

export const resolveSystemBrowserExecutable = (options = {}) => {
  const candidates = buildBrowserExecutableCandidates(options);
  const executablePath = candidates.find(isExecutableFile) || null;
  return {
    executablePath,
    source: executablePath ? 'system-browser' : null,
    candidates,
  };
};

const sparticuzFallback = async (root) => {
  const [{ default: chromium, inflate }] = await Promise.all([import('@sparticuz/chromium')]);
  chromium.setGraphicsMode = false;
  const cachedBinary = path.join(os.tmpdir(), 'chromium');
  if (isExecutableFile(cachedBinary)) {
    return { executablePath: cachedBinary, source: 'sparticuz-cache' };
  }
  if (fs.existsSync(cachedBinary)) fs.rmSync(cachedBinary, { force: true, recursive: true });

  const archivePath = path.join(root, 'node_modules', '@sparticuz', 'chromium', 'bin', 'chromium.br');
  if (!fs.existsSync(archivePath)) return null;
  const executablePath = await inflate(archivePath);
  if (!isExecutableFile(executablePath)) {
    throw new Error(`@sparticuz/chromium مسیر نامعتبر تولید کرد: ${String(executablePath || 'خالی')}`);
  }
  return { executablePath, source: 'sparticuz-inflate' };
};

export const resolvePuppeteerBrowserExecutable = async ({
  root = process.cwd(),
  platform = process.platform,
  env = process.env,
  includeSystemLookup = true,
} = {}) => {
  const system = resolveSystemBrowserExecutable({ platform, env, includeSystemLookup });
  if (system.executablePath) return system;

  // @sparticuz/chromium ships a Linux serverless binary. Inflating it on
  // Windows creates a misleading Temp\\chromium path that cannot be spawned.
  if (platform === 'linux') {
    const fallback = await sparticuzFallback(root);
    if (fallback) return { ...fallback, candidates: system.candidates };
  }

  const searched = system.candidates.length
    ? `\nمسیرهای بررسی‌شده:\n- ${system.candidates.join('\n- ')}`
    : '';
  throw new Error(
    `Chrome، Edge یا Chromium قابل اجرا پیدا نشد.\n`
    + `متغیر KOUROSH_BROWSER_PATH یا CHROME_PATH را به مسیر واقعی فایل مرورگر تنظیم کنید.\n`
    + `نمونه PowerShell:\n$env:KOUROSH_BROWSER_PATH=\"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe\"`
    + searched,
  );
};

export const browserLaunchArgs = (platform = process.platform) => [
  ...(platform === 'linux' ? ['--no-sandbox', '--disable-setuid-sandbox'] : []),
  '--disable-gpu',
  '--disable-dev-shm-usage',
  '--hide-scrollbars',
];
