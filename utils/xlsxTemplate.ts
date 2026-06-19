import * as XLSX from 'xlsx';

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

const tryParseNumber = (v: any): number | null => {
  if (v == null) return null;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const s = faToEnDigits(String(v)).trim();
  const norm = s.replace(/,/g, '');
  if (!norm) return null;

  const isPercent = /%|٪/.test(s);
  const numStr = norm.replace(/%|٪/g, '');
  const n = Number(numStr);
  if (!Number.isFinite(n)) return null;
  return isPercent ? n / 100 : n;
};

function setCell(ws: XLSX.WorkSheet, r: number, c: number, v: any) {
  const addr = XLSX.utils.encode_cell({ r, c });
  ws[addr] = { v, t: typeof v === 'number' ? 'n' : 's' } as any;
  return ws[addr] as any;
}

/**
 * A reusable XLSX “template” for reports:
 * - merged title
 * - meta box
 * - frozen header + autofilter
 * - RTL
 * - auto column widths
 */
export function buildPrettyReportWorkbook(args: PrettyWorkbookArgs) {
  const sheetName = args.sheetName || 'Report';
  const wb = XLSX.utils.book_new();

  const headers = (args.headers || []).map((x) => String(x ?? '').trim());
  const rows = args.rows || [];
  const colCount = Math.max(1, headers.length, ...rows.map((r) => r.length));

  const aoa: any[][] = [];
  aoa.push([args.title]);
  aoa.push([args.subtitle || '']);
  aoa.push([]);

  const meta = args.meta || [];
  if (meta.length) {
    aoa.push(['مشخصات', '']);
    for (const [k, v] of meta) aoa.push([k, v]);
    aoa.push([]);
  }

  const headerRowIndex = aoa.length; // 0-based
  aoa.push(headers.length ? headers : ['داده']);
  for (const r of rows) aoa.push(r.map((x) => (x == null ? '' : x)));

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  (ws as any)['!rtl'] = true;

  // merges for title/subtitle
  const merges: XLSX.Range[] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: colCount - 1 } },
  ];
  (ws as any)['!merges'] = merges;

  // freeze panes under header row
  (ws as any)['!views'] = [
    {
      rightToLeft: true,
      state: 'frozen',
      ySplit: headerRowIndex + 1,
      topLeftCell: XLSX.utils.encode_cell({ r: headerRowIndex + 1, c: 0 }),
      activePane: 'bottomLeft',
    },
  ];

  // autofilter
  const lastColLetter = XLSX.utils.encode_col(colCount - 1);
  const headerRowExcel = headerRowIndex + 1;
  (ws as any)['!autofilter'] = { ref: `A${headerRowExcel}:${lastColLetter}${headerRowExcel}` };

  // number parsing + formats
  const ref = ws['!ref'] as string;
  const range = XLSX.utils.decode_range(ref);
  for (let r = headerRowIndex + 1; r <= range.e.r; r++) {
    for (let c = 0; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell: any = (ws as any)[addr];
      if (!cell || cell.v == null || cell.v === '') continue;
      const raw = String(cell.v);
      const n = tryParseNumber(raw);
      if (n == null) continue;
      cell.t = 'n';
      cell.v = n;
      if (/%|٪/.test(raw)) cell.z = '0.00%';
      if (/(تومان|ریال)/.test(raw)) cell.z = '#,##0';
    }
  }

  // column widths
  const cols: any[] = [];
  for (let c = 0; c < colCount; c++) {
    let max = 10;
    for (let r = 0; r <= range.e.r; r++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell: any = (ws as any)[addr];
      const v = cell?.v != null ? String(cell.v) : '';
      max = Math.max(max, Math.min(70, v.length + 2));
    }
    cols.push({ wch: max });
  }
  (ws as any)['!cols'] = cols;

  // light style hints
  try {
    const t = setCell(ws, 0, 0, args.title);
    (t as any).s = { font: { bold: true, sz: 16 } };
    const st = setCell(ws, 1, 0, args.subtitle || '');
    (st as any).s = { font: { bold: true, sz: 11 } };
    for (let c = 0; c < colCount; c++) {
      const addr = XLSX.utils.encode_cell({ r: headerRowIndex, c });
      const cell: any = (ws as any)[addr];
      if (cell) cell.s = { font: { bold: true } };
    }
  } catch {
    // ignore
  }

  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return wb;
}
