import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoots = ['components', 'contexts', 'hooks', 'pages', 'server', 'services', 'utils'];
const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx']);
const ignoredDirectories = new Set(['node_modules', 'dist', '.git', 'coverage', 'generated']);

const findCallEnd = (source, callStart) => {
  const open = source.indexOf('(', callStart + 'formatExactNumberText'.length);
  if (open < 0) return -1;

  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let index = open; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      continue;
    }
    if (char === '(') depth += 1;
    if (char === ')') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
};

const isPercentLiteral = (value) => /(?:٪|%|درصد)/u.test(value);

const findViolations = (source) => {
  const violations = [];
  const identifier = /\bformatExactNumberText\b/g;
  let match;
  while ((match = identifier.exec(source))) {
    const start = match.index;
    const end = findCallEnd(source, start);
    if (end < 0) continue;

    const prefix = source.slice(Math.max(0, start - 32), start);
    const suffix = source.slice(end + 1, Math.min(source.length, end + 49));
    const compactPrefix = prefix.replace(/\s+/g, ' ');
    const compactSuffix = suffix.replace(/\s+/g, ' ');

    const percentBefore = /(?:٪|%|درصد)\s*(?:\{|\$\{|\+)?\s*$/u.test(compactPrefix);
    const percentAfter = /^(?:\s|\}|\)|\]|<\/[^>]+>|\+)*?(?:٪|%|درصد)/u.test(compactSuffix);
    if (!percentBefore && !percentAfter) continue;

    const line = source.slice(0, start).split('\n').length;
    violations.push({ line, sample: source.slice(start, Math.min(source.length, end + 35)).replace(/\s+/g, ' ') });
  }
  return violations;
};

// Guard the detector itself so a future regex edit cannot silently weaken the contract.
const detectorFixtures = [
  ['template suffix', '`${formatExactNumberText(value)}٪`', true],
  ['jsx suffix', '<span>{formatExactNumberText(value)}٪</span>', true],
  ['jsx prefix', '<span>٪{formatExactNumberText(value)}</span>', true],
  ['word suffix', '`${formatExactNumberText(value)} درصد`', true],
  ['plain number', '<span>{formatExactNumberText(value)} سند</span>', false],
  ['dedicated percent', 'formatReadablePercentText(value, 1)', false],
];
for (const [label, source, expected] of detectorFixtures) {
  const actual = findViolations(source).length > 0;
  if (actual !== expected) {
    console.error(`Percent format contract detector failed its own fixture: ${label}`);
    process.exit(1);
  }
}

const files = [];
const walk = (directory) => {
  if (!fs.existsSync(directory)) return;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (sourceExtensions.has(path.extname(entry.name))) files.push(full);
  }
};
for (const sourceRoot of sourceRoots) walk(path.join(root, sourceRoot));

const violations = [];
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  for (const violation of findViolations(source)) {
    violations.push({ file: path.relative(root, file), ...violation });
  }
}

const exactNumberSource = fs.readFileSync(path.join(root, 'utils/exactNumber.ts'), 'utf8');
if (!exactNumberSource.includes('PERCENT_FORMAT_CONTRACT')) {
  violations.push({
    file: 'utils/exactNumber.ts',
    line: 1,
    sample: 'Missing PERCENT_FORMAT_CONTRACT documentation marker.',
  });
}
if (!exactNumberSource.includes('formatReadablePercentText') || !exactNumberSource.includes('formatExactPercentText')) {
  violations.push({
    file: 'utils/exactNumber.ts',
    line: 1,
    sample: 'Dedicated percent formatters must remain available.',
  });
}

if (violations.length) {
  console.error('Percent format contract audit failed. formatExactNumberText must never be combined with %, ٪, or «درصد».');
  console.error('Use formatReadablePercentText, formatExactPercentText, or formatReportPercentText instead.');
  for (const violation of violations) {
    console.error(`- ${violation.file}:${violation.line} — ${violation.sample}`);
  }
  process.exit(1);
}

console.log(`Percent format contract audit passed: ${files.length} source files checked.`);
