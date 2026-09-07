import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { PassThrough, Readable } from 'node:stream';
import { finished } from 'node:stream/promises';
import ExcelJS from 'exceljs';

const require = createRequire(import.meta.url);
const archiver = require('archiver');
const unzipper = require('unzipper');
const archiverUtilsFile = require('archiver-utils/file');

/**
 * glob returns native path separators on Windows while ZIP entry names are
 * always compared with forward slashes. Normalize only for the portability
 * assertion; do not mutate the paths consumed by archiver-utils itself.
 */
function normalizeGlobMatchForAssertion(value) {
  return String(value).replaceAll('\\', '/');
}

assert.equal(
  normalizeGlobMatchForAssertion('nested\\report-b.txt'),
  'nested/report-b.txt',
  'Windows glob paths must normalize for cross-platform assertions',
);

const workbook = new ExcelJS.Workbook();
workbook.creator = 'Kourosh Store Management App';
workbook.created = new Date('2026-01-01T00:00:00.000Z');

const worksheet = workbook.addWorksheet('گزارش فروش', {
  views: [{ rightToLeft: true }],
  properties: { defaultRowHeight: 22 },
});

worksheet.columns = [
  { header: 'شناسه', key: 'id', width: 12 },
  { header: 'مشتری', key: 'customer', width: 24 },
  { header: 'مبلغ', key: 'amount', width: 18 },
  { header: 'مالیات', key: 'tax', width: 18 },
  { header: 'جمع', key: 'total', width: 18 },
];

worksheet.addRow({ id: 1, customer: 'ابراهیم پور حسنی', amount: 35_000_000, tax: 3_500_000 });
worksheet.addRow({ id: 2, customer: 'حامد باطری‌ساز', amount: 28_000_000, tax: 2_800_000 });
worksheet.getCell('E2').value = { formula: 'C2+D2', result: 38_500_000 };
worksheet.getCell('E3').value = { formula: 'C3+D3', result: 30_800_000 };
worksheet.getColumn('C').numFmt = '#,##0 "تومان"';
worksheet.getColumn('D').numFmt = '#,##0 "تومان"';
worksheet.getColumn('E').numFmt = '#,##0 "تومان"';

const header = worksheet.getRow(1);
header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
header.alignment = { horizontal: 'center', vertical: 'middle' };

worksheet.mergeCells('A5:E5');
worksheet.getCell('A5').value = 'خروجی آزمایشی سازگاری ExcelJS';
worksheet.getCell('A5').alignment = { horizontal: 'center' };
worksheet.getCell('A5').font = { italic: true };

const xlsxBuffer = Buffer.from(await workbook.xlsx.writeBuffer());
assert.ok(xlsxBuffer.length > 1_000, 'XLSX output is unexpectedly small');
assert.equal(xlsxBuffer.subarray(0, 2).toString('hex'), '504b', 'XLSX output is not a ZIP container');

const loaded = new ExcelJS.Workbook();
await loaded.xlsx.load(xlsxBuffer);
const loadedSheet = loaded.getWorksheet('گزارش فروش');
assert.ok(loadedSheet, 'Worksheet was not restored');
assert.equal(loadedSheet.views[0]?.rightToLeft, true, 'RTL worksheet view was not preserved');
assert.equal(loadedSheet.getCell('B2').value, 'ابراهیم پور حسنی');
assert.equal(loadedSheet.getCell('C2').value, 35_000_000);
assert.deepEqual(loadedSheet.getCell('E2').value, { formula: 'C2+D2', result: 38_500_000 });
assert.equal(loadedSheet.getCell('C2').numFmt, '#,##0 "تومان"');
assert.equal(loadedSheet.getCell('A5').value, 'خروجی آزمایشی سازگاری ExcelJS');
assert.equal(loadedSheet.getCell('A5').isMerged, true);
assert.equal(loadedSheet.getRow(1).font?.bold, true);
assert.equal(loadedSheet.getCell('A1').fill?.type, 'pattern');

const csvWorkbook = new ExcelJS.Workbook();
const csvSheet = csvWorkbook.addWorksheet('CSV');
csvSheet.addRow(['نام مشتری', 'مبلغ']);
csvSheet.addRow(['ابراهیم پور حسنی', 35_000_000]);
const csvBuffer = Buffer.from(await csvWorkbook.csv.writeBuffer({ sheetName: 'CSV' }));
assert.match(csvBuffer.toString('utf8'), /ابراهیم پور حسنی/);

const parsedCsvWorkbook = new ExcelJS.Workbook();
const parsedCsvSheet = await parsedCsvWorkbook.csv.read(Readable.from([csvBuffer]));
assert.equal(parsedCsvSheet.getCell('A2').value, 'ابراهیم پور حسنی');
assert.equal(parsedCsvSheet.getCell('B2').value, 35_000_000);

const zipOutput = new PassThrough();
const zipChunks = [];
zipOutput.on('data', (chunk) => zipChunks.push(Buffer.from(chunk)));
const archive = archiver('zip', { zlib: { level: 6 } });
archive.pipe(zipOutput);
archive.append('سلام کوروش', { name: 'rtl-check.txt' });
await archive.finalize();
await finished(zipOutput);
const zipBuffer = Buffer.concat(zipChunks);
const openedZip = await unzipper.Open.buffer(zipBuffer);
const textEntry = openedZip.files.find((entry) => entry.path === 'rtl-check.txt');
assert.ok(textEntry, 'Reviewed archiver/unzipper chain did not preserve the ZIP entry');
assert.equal((await textEntry.buffer()).toString('utf8'), 'سلام کوروش');

// Exercise both glob consumers in the reviewed archive chain.
// archiver-utils/file calls glob.sync() directly; Archiver's public glob() path
// uses its own readdir-glob implementation and is tested separately below.
const globFixtureDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kourosh-archiver-glob-'));
try {
  await fs.mkdir(path.join(globFixtureDir, 'nested'), { recursive: true });
  await fs.writeFile(path.join(globFixtureDir, 'report-a.txt'), 'A', 'utf8');
  await fs.writeFile(path.join(globFixtureDir, 'nested', 'report-b.txt'), 'B', 'utf8');
  await fs.writeFile(path.join(globFixtureDir, 'ignored.log'), 'ignore', 'utf8');

  const expandedByArchiverUtils = archiverUtilsFile.expand(
    { cwd: globFixtureDir, nodir: true },
    ['**/*.txt'],
  ).sort();
  const portableExpandedByArchiverUtils = expandedByArchiverUtils
    .map(normalizeGlobMatchForAssertion)
    .sort();
  assert.deepEqual(
    portableExpandedByArchiverUtils,
    ['nested/report-b.txt', 'report-a.txt'],
    'archiver-utils file.expand must preserve glob.sync compatibility across native path separators',
  );

  const globZipOutput = new PassThrough();
  const globZipChunks = [];
  globZipOutput.on('data', (chunk) => globZipChunks.push(Buffer.from(chunk)));
  const globArchive = archiver('zip', { zlib: { level: 6 } });
  globArchive.pipe(globZipOutput);
  globArchive.glob('**/*.txt', { cwd: globFixtureDir, nodir: true });
  await globArchive.finalize();
  await finished(globZipOutput);

  const globZip = await unzipper.Open.buffer(Buffer.concat(globZipChunks));
  const globEntries = globZip.files.map((entry) => entry.path).sort();
  assert.deepEqual(globEntries, ['nested/report-b.txt', 'report-a.txt'], 'archiver glob must include only the reviewed TXT fixture files');
} finally {
  await fs.rm(globFixtureDir, { recursive: true, force: true });
}

console.log(`ExcelJS compatibility passed: XLSX=${xlsxBuffer.length} bytes, CSV=${csvBuffer.length} bytes, ZIP=${zipBuffer.length} bytes, archiver-utils-glob=OK, archiver-glob=OK`);
