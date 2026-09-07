import ExcelJS from 'exceljs';

export const jsonToXlsxBuffer = async (rows: any[], sheetName: string = 'Sheet1') => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName);

  const data = rows || [];
  const keys = data.length > 0 ? Object.keys(data[0]) : [];

  ws.columns = keys.map((k) => ({ header: k, key: k, width: Math.max(12, Math.min(40, String(k).length + 6)) }));

  for (const r of data) ws.addRow(r);

  // Freeze header
  ws.views = [{ state: 'frozen', ySplit: 1 }];

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf as ArrayBuffer);
};
