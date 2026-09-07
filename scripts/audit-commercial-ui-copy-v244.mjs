import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const versionPath = path.join(root, 'KOUROSH_SOURCE_VERSION');
const expectedVersion = 'v244';
const version = fs.existsSync(versionPath) ? fs.readFileSync(versionPath, 'utf8').trim() : '';

const failures = [];
if (version !== expectedVersion) {
  failures.push(`KOUROSH_SOURCE_VERSION must be ${expectedVersion}; found ${version || '(missing)'}`);
}

const scanRoots = [
  path.join(root, 'pages'),
  path.join(root, 'components'),
  path.join(root, 'server', 'intelligence', 'smartInsights'),
];
const singleFiles = [path.join(root, 'utils', 'featureFlags.ts')];

const excludedPathParts = [
  `${path.sep}pages${path.sep}qa${path.sep}`,
  `${path.sep}__tests__${path.sep}`,
  `${path.sep}tests${path.sep}`,
];
const excludedNamePatterns = [/\.test\.[cm]?[jt]sx?$/i, /\.spec\.[cm]?[jt]sx?$/i];

const files = [];
function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (excludedPathParts.some((part) => `${full}${path.sep}`.includes(part))) continue;
      walk(full);
      continue;
    }
    if (!/\.[cm]?[jt]sx?$/.test(entry.name)) continue;
    if (excludedNamePatterns.some((re) => re.test(entry.name))) continue;
    files.push(full);
  }
}
for (const dir of scanRoots) walk(dir);
for (const file of singleFiles) if (fs.existsSync(file)) files.push(file);

const exactForbidden = [
  'کارت‌های وضعیت با مرکز کنترل تلگرام ادغام شدند',
  'این بخش فقط پایش فنی Webhook',
  'دو ردیف کارت مشابه',
  'در Terminal پروژه',
  'Wrapperهای واقعی',
  'ماتریس واقعی',
  'نمایش Screenshot',
  'Screenshot ذخیره نشده',
  'PWA QA',
  'Raw JSON',
  'JSON خام',
  'پیاده‌سازی واقعی',
];

const persianVisibleForbidden = [
  /(^|[^\p{L}])تست([^\p{L}]|$)/u,
  /آزمایشی/u,
  /(^|[^\p{L}])دمو([^\p{L}]|$)/u,
  /دیباگ/u,
  /دیاگنوستیک/u,
  /بک[‌\- ]?اند/u,
  /جزئیات فنی/u,
  /متادیتا/u,
];

const englishVisibleForbidden = [
  /\bWebhook\b/i,
  /\bPolling\b/i,
  /\bDebug\b/i,
  /\bDemo\b/i,
  /\bRead[- ]?only\b/i,
  /\bMetadata Only\b/i,
  /\bRaw JSON\b/i,
  /\bPhase\s+\d/i,
  /\bNo inference\b/i,
  /\bbackend execution\b/i,
  /\bbusiness mutation\b/i,
];

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function lineNumber(source, index) {
  return source.slice(0, index).split('\n').length;
}

function checkVisibleText(file, source, text, index, kind) {
  const normalized = text.replace(/\\n/g, ' ').replace(/\s+/g, ' ').trim();
  if (!normalized) return;
  for (const re of [...persianVisibleForbidden, ...englishVisibleForbidden]) {
    if (re.test(normalized)) {
      failures.push(`${path.relative(root, file)}:${lineNumber(source, index)} [${kind}] ${normalized.slice(0, 180)}`);
      return;
    }
  }
}

for (const file of files) {
  const raw = fs.readFileSync(file, 'utf8');
  const source = stripComments(raw);

  for (const phrase of exactForbidden) {
    const idx = source.indexOf(phrase);
    if (idx >= 0) failures.push(`${path.relative(root, file)}:${lineNumber(source, idx)} contains forbidden product copy: ${phrase}`);
  }

  // Persian strings are high-signal for user-visible product copy; this catches
  // notifications and view-model text even when they are not written directly in JSX.
  const stringRe = /(['"`])((?:\\.|(?!\1)[\s\S])*?)\1/g;
  let match;
  while ((match = stringRe.exec(source))) {
    const value = match[2];
    if (!/[\u0600-\u06FF]/.test(value)) continue;
    checkVisibleText(file, source, value, match.index, 'Persian string');
  }

  // Raw JSX text between tags.
  const jsxTextRe = />([^<>{}]+)</g;
  while ((match = jsxTextRe.exec(source))) {
    const candidate = match[1];
    const programmingLike = /[;\[\]{}]|=>|\b(?:void|readonly|as const)\b/i.test(candidate);
    if (!programmingLike) checkVisibleText(file, source, candidate, match.index, 'JSX text');
  }

  // English development vocabulary is checked only in common UI copy props/keys,
  // avoiding machine contracts such as API routes, enum values and identifiers.
  const uiCopyRe = /(?:aria-label|placeholder|loadingText|loadingHint|helperText|tooltip|subtitle|description|message|caption|label|title)\s*(?:=|:)\s*(['"`])((?:\\.|(?!\1)[\s\S])*?)\1/gi;
  while ((match = uiCopyRe.exec(source))) {
    checkVisibleText(file, source, match[2], match.index, 'UI copy');
  }
}

if (failures.length) {
  console.error(`Commercial UI copy audit failed with ${failures.length} issue(s):`);
  for (const failure of failures.slice(0, 120)) console.error(`- ${failure}`);
  if (failures.length > 120) console.error(`- ... ${failures.length - 120} more`);
  process.exit(1);
}

console.log(JSON.stringify({
  audit: 'commercial-ui-copy-v244',
  version,
  filesScanned: files.length,
  result: 'PASS',
  note: 'Machine contracts, API routes, enum values, test sources and identifiers are intentionally outside the user-visible-copy rules.',
}, null, 2));
