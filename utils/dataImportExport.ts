// utils/dataImportExport.ts
// ابزارهای سبک و client-side برای ایمپورت/اکسپورت Excel/CSV بدون وابستگی به بک‌اند.
// هدف: فایل خروجی همین اپ دوباره قابل ورود باشد و هدرهای فارسی/انگلیسی را تحمل کند.

export type ImportSheetRow = Record<string, unknown> & { __rowNumber?: number };

const faDigitMap: Record<string, string> = {
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4', '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
};

const MAX_IMPORT_FILE_BYTES = 8 * 1024 * 1024;
const MAX_IMPORT_SHEETS = 1;
const MAX_IMPORT_ROWS = 5_000;
const MAX_IMPORT_COLUMNS = 80;
const ALLOWED_IMPORT_EXTENSIONS = new Set(['xlsx', 'csv']);

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

const getImportFileExtension = (file: File) => {
  const name = String(file?.name || '').toLowerCase();
  const match = name.match(/\.([a-z0-9]+)$/i);
  return match?.[1] || '';
};

const assertImportFileIsAllowed = (file: File) => {
  const extension = getImportFileExtension(file);
  if (extension === 'xlsm' || extension === 'xltm') {
    throw new Error('فایل‌های اکسل دارای ماکرو پشتیبانی نمی‌شوند. لطفاً خروجی XLSX یا CSV همین بخش را انتخاب کن.');
  }
  if (!ALLOWED_IMPORT_EXTENSIONS.has(extension)) {
    throw new Error('فرمت فایل مجاز نیست. فقط فایل‌های XLSX یا CSV پشتیبانی می‌شوند.');
  }
  if (file.size > MAX_IMPORT_FILE_BYTES) {
    throw new Error('حجم فایل برای ورود اطلاعات زیاد است. لطفاً فایل را کوچک‌تر کن.');
  }
};

const parseCsvMatrix = (text: string): unknown[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = '';
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (quoted && next === '"') {
        value += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (char === ',' && !quoted) {
      row.push(value);
      value = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') i += 1;
      row.push(value);
      rows.push(row);
      row = [];
      value = '';
      continue;
    }

    value += char;
  }

  row.push(value);
  rows.push(row);
  return rows;
};

const excelCellToImportValue = (cellValue: any): unknown => {
  if (cellValue == null) return '';
  if (cellValue instanceof Date) return cellValue.toISOString().slice(0, 10);
  if (typeof cellValue === 'object') {
    if ('formula' in cellValue) {
      throw new Error('فایل شامل فرمول است. برای امنیت ورود اطلاعات، سلول‌های فرمول‌دار پذیرفته نمی‌شوند.');
    }
    if ('text' in cellValue) return cellValue.text ?? '';
    if ('richText' in cellValue && Array.isArray(cellValue.richText)) {
      return cellValue.richText.map((part: any) => part?.text ?? '').join('');
    }
    if ('result' in cellValue) return cellValue.result ?? '';
    if ('hyperlink' in cellValue) return cellValue.text ?? cellValue.hyperlink ?? '';
    return String(cellValue);
  }
  return cellValue;
};

const readXlsxMatrix = async (file: File): Promise<unknown[][]> => {
  const exceljsMod = await import('exceljs');
  const ExcelJS = (exceljsMod as any).default ?? exceljsMod;
  const workbook = new ExcelJS.Workbook();
  const buffer = await file.arrayBuffer();
  await workbook.xlsx.load(buffer);

  const worksheets = workbook.worksheets || [];
  if (worksheets.length > MAX_IMPORT_SHEETS) {
    throw new Error('فایل ورودی فقط باید یک شیت داشته باشد.');
  }

  const worksheet = worksheets[0];
  if (!worksheet) return [];
  const rowCount = worksheet.actualRowCount || worksheet.rowCount || 0;
  const columnCount = worksheet.actualColumnCount || worksheet.columnCount || 0;
  if (rowCount > MAX_IMPORT_ROWS) throw new Error('تعداد ردیف‌های فایل از حد مجاز بیشتر است.');
  if (columnCount > MAX_IMPORT_COLUMNS) throw new Error('تعداد ستون‌های فایل از حد مجاز بیشتر است.');

  const matrix: unknown[][] = [];
  worksheet.eachRow({ includeEmpty: false }, (row: any) => {
    const values: unknown[] = [];
    for (let col = 1; col <= Math.min(MAX_IMPORT_COLUMNS, columnCount || row.cellCount || 1); col += 1) {
      values.push(excelCellToImportValue(row.getCell(col).value));
    }
    matrix.push(values);
  });
  return matrix;
};


const assertImportMatrixSize = (matrix: unknown[][]) => {
  if (matrix.length > MAX_IMPORT_ROWS) throw new Error('تعداد ردیف‌های فایل از حد مجاز بیشتر است.');
  const maxColumns = matrix.reduce((max, row) => Math.max(max, Array.isArray(row) ? row.length : 0), 0);
  if (maxColumns > MAX_IMPORT_COLUMNS) throw new Error('تعداد ستون‌های فایل از حد مجاز بیشتر است.');
};

const rowsFromMatrix = (rawRows: unknown[][]): ImportSheetRow[] => {
  const matrix = normalizeSheetMatrix(rawRows).filter((row) => row.length > 0);
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

export const readSpreadsheetRows = async (file: File): Promise<ImportSheetRow[]> => {
  assertImportFileIsAllowed(file);
  const extension = getImportFileExtension(file);
  const matrix = extension === 'csv'
    ? parseCsvMatrix(await file.text())
    : await readXlsxMatrix(file);
  assertImportMatrixSize(matrix);
  return rowsFromMatrix(matrix);
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

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const csvEscape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;

const downloadCsvFallback = (filename: string, headers: string[], body: unknown[][]) => {
  const csvName = filename.replace(/\.xlsx$/i, '.csv');
  const content = [headers, ...body].map((row) => row.map(csvEscape).join(',')).join('\n');
  const blob = new Blob([`\ufeff${content}`], { type: 'text/csv;charset=utf-8' });
  downloadBlob(blob, csvName);
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
      downloadBlob(blob, outName);
    } catch {
      downloadCsvFallback(outName, headers, body);
    }
  })();
}
