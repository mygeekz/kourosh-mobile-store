// utils/dataImportExport.ts
// ابزارهای سبک و client-side برای ایمپورت/اکسپورت Excel/CSV بدون وابستگی به بک‌اند.
// هدف: فایل خروجی همین اپ دوباره قابل ورود باشد و هدرهای فارسی/انگلیسی را تحمل کند.

export type ImportSheetRow = Record<string, unknown> & { __rowNumber?: number };

const faDigitMap: Record<string, string> = {
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4', '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
};

export const normalizeImportText = (value: unknown) => {
  if (value == null) return '';
  return String(value)
    .replace(/[۰-۹٠-٩]/g, (m) => faDigitMap[m] ?? m)
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/\u200c/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

export const normalizeImportHeader = (value: unknown) => normalizeImportText(value)
  .toLowerCase()
  .replace(/[\s_\-\/\\().:؛،,]+/g, '')
  .replace(/[^a-z0-9آ-ی]/g, '');

export const getImportCell = (row: ImportSheetRow, aliases: string[]) => {
  const wanted = aliases.map(normalizeImportHeader);
  for (const [key, value] of Object.entries(row)) {
    if (key === '__rowNumber') continue;
    if (wanted.includes(normalizeImportHeader(key))) return value;
  }
  return undefined;
};

export const parseImportNumber = (value: unknown, fallback = 0) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const raw = normalizeImportText(value)
    .replace(/[٬,]/g, '')
    .replace(/تومان|ریال|عدد|درصد|%/gi, '')
    .replace(/[^0-9.\-]/g, '');
  if (!raw || raw === '-' || raw === '.') return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const parseImportInteger = (value: unknown, fallback = 0) => Math.max(0, Math.round(parseImportNumber(value, fallback)));

export const isImportBlank = (value: unknown) => {
  const text = normalizeImportText(value);
  return !text || text === '-' || text === '—' || text.toLowerCase() === 'null' || text.toLowerCase() === 'undefined';
};

const importHeaderKeywords = [
  'شناسه',
  'ناممحصول',
  'نام',
  'دستهبندی',
  'تامینکننده',
  'قیمتخرید',
  'قیمتفروش',
  'موجودی',
  'مدل',
  'imei',
  'رنگ',
  'حافظه',
  'بارکد',
  'sku',
  'status',
  'model',
  'purchaseprice',
  'sellingprice',
  'saleprice',
  'stock',
];

const normalizeSheetMatrix = (rows: unknown[][]) => rows.map((row) => {
  const out = Array.isArray(row) ? row : [];
  let lastNonBlank = -1;
  out.forEach((cell, index) => {
    if (!isImportBlank(cell)) lastNonBlank = index;
  });
  return out.slice(0, lastNonBlank + 1);
});

const looksLikeImportHeaderRow = (row: unknown[]) => {
  const headers = row.map((cell) => normalizeImportHeader(cell)).filter(Boolean);
  if (headers.length < 2) return false;
  const hitCount = headers.filter((header) => importHeaderKeywords.includes(header)).length;
  return hitCount >= 2;
};

const findImportHeaderRowIndex = (rows: unknown[][]) => {
  const exact = rows.findIndex(looksLikeImportHeaderRow);
  if (exact >= 0) return exact;

  // Fallback for simple CSV/XLSX files with a plain header row but non-standard labels.
  return Math.max(
    0,
    rows.findIndex((row) => row.filter((cell) => !isImportBlank(cell)).length >= 2),
  );
};

export const readSpreadsheetRows = async (file: File): Promise<ImportSheetRow[]> => {
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) return [];

  const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], {
    header: 1,
    defval: '',
    raw: false,
    blankrows: false,
  });
  const matrix = normalizeSheetMatrix(rawRows as unknown[][]).filter((row) => row.length > 0);
  if (matrix.length === 0) return [];

  const headerIndex = findImportHeaderRowIndex(matrix);
  const headers = matrix[headerIndex].map((header, index) => {
    const text = normalizeImportText(header);
    return text || `ستون ${index + 1}`;
  });

  return matrix
    .slice(headerIndex + 1)
    .map((row, index) => {
      const record: ImportSheetRow = { __rowNumber: headerIndex + index + 2 };
      headers.forEach((header, colIndex) => {
        record[header] = row[colIndex] ?? '';
      });
      return record;
    })
    .filter((row) => Object.entries(row).some(([key, value]) => key !== '__rowNumber' && !isImportBlank(value)));
};

export const isoToday = () => new Date().toISOString().slice(0, 10);

type RoundtripExcelColumn<T> = { header: string; key: keyof T | string; width?: number };

const safeExcelCell = (value: unknown) => {
  if (value == null) return '';
  if (typeof value === 'number') return Number.isFinite(value) ? value : '';
  if (typeof value === 'boolean') return value ? 'بله' : 'خیر';
  return String(value);
};

const estimateColumnWidth = (header: string, values: unknown[]) => {
  const maxLen = Math.max(
    String(header).length,
    ...values.slice(0, 700).map((value) => String(value ?? '').length),
  );
  return Math.max(10, Math.min(34, maxLen + 4));
};

export function exportRoundtripExcel<T extends Record<string, any>>(
  filename: string,
  rows: T[],
  columns: RoundtripExcelColumn<T>[],
  sheetName = 'Import Export',
) {
  // خروجی مخصوص ورود مجدد: هدر دقیقاً در ردیف اول است و هیچ عنوان/متادیتای گزارشی بالای جدول نمی‌آید.
  void (async () => {
    const outName = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
    const headers = columns.map((column) => column.header);
    const body = rows.map((row) => columns.map((column) => safeExcelCell((row as any)[column.key as any])));

    try {
      const exceljsMod = await import('exceljs');
      const ExcelJS = (exceljsMod as any).default ?? exceljsMod;
      const wb = new ExcelJS.Workbook();
      wb.creator = 'Kourosh Dashboard';
      wb.created = new Date();
      wb.modified = new Date();
      wb.views = [{ rightToLeft: true }];

      const ws = wb.addWorksheet(sheetName || 'Import Export', {
        views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }],
      });

      ws.addRow(headers);
      body.forEach((row) => ws.addRow(row));

      const headerRow = ws.getRow(1);
      headerRow.height = 22;
      headerRow.eachCell((cell: any) => {
        cell.font = { name: 'Vazir', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF111827' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
      });

      for (let rowIndex = 2; rowIndex <= rows.length + 1; rowIndex += 1) {
        const row = ws.getRow(rowIndex);
        row.height = 20;
        row.eachCell({ includeEmpty: true }, (cell: any, colNumber: number) => {
          cell.font = { name: 'Vazir', size: 11, color: { argb: 'FF0F172A' } };
          cell.alignment = {
            horizontal: typeof cell.value === 'number' ? 'left' : 'right',
            vertical: 'middle',
            wrapText: true,
            readingOrder: typeof cell.value === 'number' ? 1 : 0,
          };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: rowIndex % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC' },
          };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          };
          if (typeof cell.value === 'number') cell.numFmt = '#,##0';
          if (colNumber === 1) cell.alignment.horizontal = 'center';
        });
      }

      columns.forEach((column, index) => {
        const values = body.map((row) => row[index]);
        ws.getColumn(index + 1).width = column.width ?? estimateColumnWidth(column.header, values);
      });

      if (columns.length > 0) {
        ws.autoFilter = {
          from: { row: 1, column: 1 },
          to: { row: 1, column: columns.length },
        };
      }

      const buf = await wb.xlsx.writeBuffer();
      const blob = new Blob([buf], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = outName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      const XLSX = await import('xlsx');
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...body]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName || 'Import Export');
      XLSX.writeFile(workbook, outName);
    }
  })();
}
