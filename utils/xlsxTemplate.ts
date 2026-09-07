import ExcelJS from 'exceljs';

type PrettyWorkbookArgs = {
  title: string;
  subtitle?: string;
  meta?: Array<[string, string]>; // key/value rows (RTL)
  headers: string[];
  rows: Array<Array<string | number | null | undefined>>;
  sheetName?: string;
};

const faToEnDigits = (s: string) =>
  s
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٬،]/g, ',');

const tryParseNumber = (v: any): { value: number | null; isPercent: boolean; isMoney: boolean } => {
  if (v == null) return { value: null, isPercent: false, isMoney: false };
  if (typeof v === 'number' && Number.isFinite(v)) return { value: v, isPercent: false, isMoney: false };
  const s = faToEnDigits(String(v)).trim();
  const norm = s.replace(/,/g, '');
  if (!norm) return { value: null, isPercent: false, isMoney: false };

  const isPercent = /%|٪/.test(s);
  const isMoney = /(تومان|ریال)/.test(s);
  const numStr = norm.replace(/%|٪/g, '').replace(/(تومان|ریال)/g, '').trim();
  const n = Number(numStr);
  if (!Number.isFinite(n)) return { value: null, isPercent, isMoney };
  return { value: isPercent ? n / 100 : n, isPercent, isMoney };
};

const normalizeSheetName = (sheetName: string) =>
  String(sheetName || 'Report')
    .replace(/[\\/*?:[\]]+/g, ' ')
    .trim()
    .slice(0, 31) || 'Report';

/**
 * A reusable Excel report template backed by ExcelJS:
 * - merged title
 * - meta box
 * - frozen header + autofilter
 * - RTL
 * - auto column widths
 */
export function buildPrettyReportWorkbook(args: PrettyWorkbookArgs) {
  const sheetName = normalizeSheetName(args.sheetName || 'Report');
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Kourosh Dashboard';
  wb.created = new Date();
  wb.modified = new Date();
  const headers = (args.headers || []).map((x) => String(x ?? '').trim());
  const rows = args.rows || [];
  const colCount = Math.max(1, headers.length, ...rows.map((r) => r.length));
  const ws = wb.addWorksheet(sheetName, {
    views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }],
  });

  const addPaddedRow = (values: Array<string | number | null | undefined>) => {
    const rowValues = new Array(colCount).fill('');
    values.forEach((value, index) => {
      if (index < colCount) rowValues[index] = value == null ? '' : value;
    });
    return ws.addRow(rowValues);
  };

  addPaddedRow([args.title]);
  ws.mergeCells(1, 1, 1, colCount);
  const titleCell = ws.getCell(1, 1);
  titleCell.font = { name: 'Vazir', bold: true, size: 16 };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  ws.getRow(1).height = 28;

  addPaddedRow([args.subtitle || '']);
  ws.mergeCells(2, 1, 2, colCount);
  const subtitleCell = ws.getCell(2, 1);
  subtitleCell.font = { name: 'Vazir', bold: true, size: 11 };
  subtitleCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  ws.getRow(2).height = 22;

  ws.addRow(new Array(colCount).fill(''));

  const meta = args.meta || [];
  if (meta.length) {
    const metaHeaderRow = addPaddedRow(['مشخصات']);
    ws.mergeCells(metaHeaderRow.number, 1, metaHeaderRow.number, Math.min(2, colCount));
    const metaHeaderCell = ws.getCell(metaHeaderRow.number, 1);
    metaHeaderCell.font = { name: 'Vazir', bold: true };
    metaHeaderCell.alignment = { horizontal: 'center', vertical: 'middle' };

    for (const [key, value] of meta) {
      const row = addPaddedRow([key, value]);
      row.getCell(1).font = { name: 'Vazir', bold: true };
      row.getCell(1).alignment = { horizontal: 'right', vertical: 'middle', wrapText: true };
      row.getCell(2).alignment = { horizontal: 'right', vertical: 'middle', wrapText: true };
    }

    ws.addRow(new Array(colCount).fill(''));
  }

  const headerRowIndex = ws.rowCount + 1;
  const headerRow = addPaddedRow(headers.length ? headers : ['داده']);
  headerRow.height = 22;
  headerRow.eachCell({ includeEmpty: true }, (cell) => {
    cell.font = { name: 'Vazir', bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    };
  });

  for (const sourceRow of rows) {
    const row = addPaddedRow(sourceRow.map((x) => (x == null ? '' : x)));
    row.eachCell({ includeEmpty: true }, (cell) => {
      const parsed = tryParseNumber(cell.value);
      if (parsed.value != null) {
        cell.value = parsed.value;
        if (parsed.isPercent) cell.numFmt = '0.00%';
        else if (parsed.isMoney) cell.numFmt = '#,##0';
      }
      cell.font = { name: 'Vazir', size: 11 };
      cell.alignment = { horizontal: typeof cell.value === 'number' ? 'center' : 'right', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    });
  }

  ws.views = [
    {
      rightToLeft: true,
      state: 'frozen',
      ySplit: headerRowIndex,
      topLeftCell: `A${headerRowIndex + 1}`,
      activeCell: `A${headerRowIndex + 1}`,
    },
  ];
  ws.autoFilter = {
    from: { row: headerRowIndex, column: 1 },
    to: { row: headerRowIndex, column: colCount },
  };

  for (let col = 1; col <= colCount; col += 1) {
    let max = 10;
    ws.getColumn(col).eachCell({ includeEmpty: true }, (cell) => {
      const value = cell.value;
      const text = value == null || typeof value === 'object' ? '' : String(value);
      max = Math.max(max, Math.min(70, text.length + 2));
    });
    ws.getColumn(col).width = max;
  }

  return wb;
}
