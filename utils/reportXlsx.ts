import ExcelJS from 'exceljs';
import { extractReportTabular } from './reportTabular';

type Args = {
  title: string;
  element: HTMLElement;
};

const safeFileName = (s: string) =>
  String(s || 'report')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);

/**
 * ساخت Workbook (برای استفاده هم در دانلود Excel و هم در چاپ بر مبنای «همان خروجی اکسل»)
 */
export async function buildReportWorkbook({ title, element }: Args) {
  const { meta, headers, rows } = extractReportTabular({ title, element });

  const wb = new ExcelJS.Workbook();
    wb.creator = 'Kourosh';
    wb.created = new Date();

  const colCount = Math.max(1, headers.length, ...rows.map((r) => r.length));
  const sheet = wb.addWorksheet('Report', {
      views: [{ rightToLeft: true, state: 'frozen', ySplit: 0 }],
      pageSetup: {
        paperSize: 9, // A4
        orientation: colCount > 8 ? 'landscape' : 'portrait',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
      },
    });

    const BASE_FONT = 'Vazir'; // uses system font fallback if not installed

    const setFont = (cell: ExcelJS.Cell, patch: Partial<ExcelJS.Font> = {}) => {
      const prev = (cell.font || {}) as ExcelJS.Font;
      cell.font = {
        name: BASE_FONT,
        size: (prev as any).size ?? 11,
        ...(prev as any),
        ...(patch as any),
      } as any;
    };

    // --- Title block
    sheet.addRow([title]);
    sheet.mergeCells(1, 1, 1, colCount);
    const titleCell = sheet.getCell(1, 1);
    titleCell.font = { name: BASE_FONT, bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } }; // teal-ish
    sheet.getRow(1).height = 28;

    sheet.addRow(['خروجی اکسل گزارش']);
    sheet.mergeCells(2, 1, 2, colCount);
    const subCell = sheet.getCell(2, 1);
    subCell.font = { name: BASE_FONT, bold: true, size: 11, color: { argb: 'FF0F172A' } };
    subCell.alignment = { vertical: 'middle', horizontal: 'center' };
    subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    sheet.getRow(2).height = 20;

    sheet.addRow([]);

    // --- Meta box (2 columns)
    if (meta.length) {
      const metaHeaderRow = sheet.addRow(['مشخصات', '']);
      sheet.mergeCells(metaHeaderRow.number, 1, metaHeaderRow.number, Math.min(2, colCount));
      const mh = sheet.getCell(metaHeaderRow.number, 1);
      mh.font = { name: BASE_FONT, bold: true, color: { argb: 'FFFFFFFF' } };
      mh.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
      mh.alignment = { vertical: 'middle', horizontal: 'center' };
      sheet.getRow(metaHeaderRow.number).height = 18;

      for (const [k, v] of meta) {
        const r = sheet.addRow([k, v]);
        r.getCell(1).font = { name: BASE_FONT, bold: true, color: { argb: 'FF0F172A' } };
        setFont(r.getCell(2));
        r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
        r.getCell(2).alignment = { vertical: 'middle', horizontal: 'right', wrapText: true };
      }
      sheet.addRow([]);
    }

    // --- Header
    const headerRowIndex = sheet.rowCount + 1;
    const headerRow = sheet.addRow(headers.map((h) => String(h ?? '').trim()));
    headerRow.height = 20;
    headerRow.eachCell((cell) => {
      cell.font = { name: BASE_FONT, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF94A3B8' } },
        left: { style: 'thin', color: { argb: 'FF94A3B8' } },
        bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
        right: { style: 'thin', color: { argb: 'FF94A3B8' } },
      };
    });

    // Freeze under header
    sheet.views = [{ rightToLeft: true, state: 'frozen', ySplit: headerRowIndex }];
    sheet.autoFilter = {
      from: { row: headerRowIndex, column: 1 },
      to: { row: headerRowIndex, column: colCount },
    };

    // --- Helpers
    const faToEnDigits = (s: string) =>
      s
        .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
        .replace(/[٬،]/g, ',');

    const parseNumber = (val: any) => {
      if (val == null) return { n: null as number | null, isPercent: false, isMoney: false };
      if (typeof val === 'number' && Number.isFinite(val)) return { n: val, isPercent: false, isMoney: false };
      const raw = String(val).trim();
      if (!raw) return { n: null, isPercent: false, isMoney: false };
      const s = faToEnDigits(raw);
      const isPercent = /%|٪/.test(s);
      const isMoney = /(تومان|ریال)/.test(s);
      const norm = s.replace(/,/g, '').replace(/%|٪/g, '').replace(/(تومان|ریال)/g, '').trim();
      const n = Number(norm);
      if (!Number.isFinite(n)) return { n: null, isPercent, isMoney };
      return { n: isPercent ? n / 100 : n, isPercent, isMoney };
    };

    // Detect numeric columns
    const numericCols = new Array(colCount).fill(false);
    const percentCols = new Array(colCount).fill(false);
    const moneyCols = new Array(colCount).fill(false);
    for (let c = 0; c < colCount; c++) {
      let total = 0;
      let ok = 0;
      let p = 0;
      let m = 0;
      for (const r of rows) {
        const v = r?.[c];
        if (v == null || v === '') continue;
        total++;
        const parsed = parseNumber(v);
        if (parsed.n != null) ok++;
        if (parsed.isPercent) p++;
        if (parsed.isMoney) m++;
      }
      if (total > 0 && ok / total >= 0.6) {
        numericCols[c] = true;
        if (p / total >= 0.3) percentCols[c] = true;
        if (m / total >= 0.3) moneyCols[c] = true;
      }
    }

    // --- Data rows with zebra striping
    const dataStartRow = sheet.rowCount + 1;
    for (let i = 0; i < rows.length; i++) {
      const src = rows[i] || [];
      const out = new Array(colCount).fill('');
      for (let c = 0; c < colCount; c++) {
        const v = src[c];
        if (v == null) continue;
        if (numericCols[c]) {
          const p = parseNumber(v);
          out[c] = p.n == null ? String(v) : p.n;
        } else {
          out[c] = String(v);
        }
      }
      const row = sheet.addRow(out);
      const isOdd = i % 2 === 1;
      row.eachCell((cell, colNumber) => {
        setFont(cell);
        cell.alignment = { vertical: 'middle', horizontal: 'right', wrapText: true };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
        if (isOdd) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };

        const c = colNumber - 1;
        if (numericCols[c]) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          if (percentCols[c]) cell.numFmt = '0.00%';
          else if (moneyCols[c]) cell.numFmt = '#,##0';
          else cell.numFmt = '#,##0.00';
        }
      });
    }
    const dataEndRow = sheet.rowCount;

    // --- Totals row (SUM for numeric columns)
    if (rows.length && numericCols.some(Boolean)) {
      const totalRow = sheet.addRow(new Array(colCount).fill(''));
      totalRow.getCell(1).value = 'جمع';
      totalRow.height = 20;
      totalRow.eachCell((cell, colNumber) => {
        cell.font = { name: BASE_FONT, bold: true, color: { argb: 'FF0F172A' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDE68A' } };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF94A3B8' } },
          left: { style: 'thin', color: { argb: 'FF94A3B8' } },
          bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
          right: { style: 'thin', color: { argb: 'FF94A3B8' } },
        };
        cell.alignment = { vertical: 'middle', horizontal: colNumber === 1 ? 'right' : 'center' };
      });

      for (let c = 0; c < colCount; c++) {
        if (!numericCols[c]) continue;
        const col = c + 1;
        const letter = sheet.getColumn(col).letter;
        const from = `${letter}${dataStartRow}`;
        const to = `${letter}${dataEndRow}`;
        totalRow.getCell(col).value = { formula: `SUM(${from}:${to})` };
        if (percentCols[c]) totalRow.getCell(col).numFmt = '0.00%';
        else if (moneyCols[c]) totalRow.getCell(col).numFmt = '#,##0';
        else totalRow.getCell(col).numFmt = '#,##0.00';
      }
    }

    // Apply base font to any cell that didn't get styled explicitly
    sheet.eachRow({ includeEmpty: true }, (r) => {
      r.eachCell({ includeEmpty: true }, (cell) => {
        const f = (cell.font || {}) as any;
        if (!f?.name) setFont(cell);
      });
    });

    // --- Column widths
    for (let c = 1; c <= colCount; c++) {
      let max = 10;
      sheet.getColumn(c).eachCell({ includeEmpty: true }, (cell) => {
        const v = cell.value;
        const s = v == null ? '' : typeof v === 'object' ? '' : String(v);
        max = Math.max(max, Math.min(60, s.length + 2));
      });
      sheet.getColumn(c).width = max;
    }


  return { wb, suggestedFileName: `${safeFileName(title)}.xlsx` };
}

/**
 * دانلود XLSX (رفتار فعلی)
 */
export async function exportReportToXlsx({ title, element }: Args) {
  const { wb, suggestedFileName } = await buildReportWorkbook({ title, element });
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = suggestedFileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
