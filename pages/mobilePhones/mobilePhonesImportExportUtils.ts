import moment from 'jalali-moment';
import type { PhoneEntry, PhoneEntryPayload, PhoneEntryUpdatePayload, PhoneStatus } from '../../types';
import { PHONE_STATUSES } from '../../constants';
import {
  getImportCell,
  isoToday,
  isImportBlank,
  normalizeImportText,
  parseImportInteger,
  parseImportNumber,
  type ImportSheetRow,
} from '../../utils/dataImportExport';
import {
  normalizePhoneBatteryForCondition,
  normalizePhoneRamLabel,
  normalizePhoneStorageLabel,
} from './phoneSpecificationUtils';

export type PhoneRoundtripRow = {
  id: number | string;
  model: string;
  color: string;
  storage: string;
  ram: string;
  imei: string;
  batteryHealth: number | string;
  condition: string;
  purchasePrice: number;
  currentPurchasePrice: number;
  salePrice: number | string;
  supplier: string;
  sellerName: string;
  purchaseDate: string;
  status: string;
  notes: string;
};

export type PhoneRoundtripColumn = { header: string; key: keyof PhoneRoundtripRow };

export const phoneRoundtripColumns: PhoneRoundtripColumn[] = [
  { header: 'شناسه', key: 'id' },
  { header: 'مدل', key: 'model' },
  { header: 'رنگ', key: 'color' },
  { header: 'حافظه', key: 'storage' },
  { header: 'رم', key: 'ram' },
  { header: 'IMEI', key: 'imei' },
  { header: 'سلامت باتری', key: 'batteryHealth' },
  { header: 'وضعیت ظاهری', key: 'condition' },
  { header: 'قیمت خرید', key: 'purchasePrice' },
  { header: 'قیمت خرید روز', key: 'currentPurchasePrice' },
  { header: 'قیمت فروش', key: 'salePrice' },
  { header: 'تامین‌کننده', key: 'supplier' },
  { header: 'فروشنده/ثبت‌کننده', key: 'sellerName' },
  { header: 'تاریخ خرید', key: 'purchaseDate' },
  { header: 'وضعیت', key: 'status' },
  { header: 'یادداشت', key: 'notes' },
];

export const buildPhoneRoundtripRows = (phones: PhoneEntry[]): PhoneRoundtripRow[] => phones.map((phone) => ({
  id: phone.id,
  model: phone.model || '',
  color: phone.color || '',
  storage: phone.storage || '',
  ram: phone.ram || '',
  imei: phone.imei || '',
  batteryHealth: phone.batteryHealth ?? '',
  condition: phone.condition || '',
  purchasePrice: Number(phone.purchasePrice || 0),
  currentPurchasePrice: Number(phone.currentPurchasePrice || phone.purchasePrice || 0),
  salePrice: phone.salePrice ?? '',
  supplier: phone.supplierName || '',
  sellerName: phone.sellerName || '',
  purchaseDate: phone.purchaseDate || '',
  status: phone.status || '',
  notes: phone.notes || '',
}));

export const buildPhoneImportTemplateRows = (): PhoneRoundtripRow[] => [{
  id: '',
  model: 'iPhone 13 Pro',
  color: 'Graphite',
  storage: '256GB',
  ram: '6GB',
  imei: '356000000000000',
  batteryHealth: 92,
  condition: 'در حد نو',
  purchasePrice: 35000000,
  currentPurchasePrice: 36000000,
  salePrice: 39500000,
  supplier: 'تامین‌کننده نمونه',
  sellerName: '',
  purchaseDate: '2026-05-03',
  status: 'موجود در انبار',
  notes: '',
}];

export const buildPhoneRoundtripFilename = (today = isoToday()) => `mobile-phones-roundtrip-${today}.xlsx`;
export const buildPhoneImportTemplateFilename = (today = isoToday()) => `mobile-phones-import-template-${today}.xlsx`;

export const normalizePhoneImportDate = (value: unknown) => {
  const text = normalizeImportText(value);
  if (!text) return null;
  const normalized = text.replace(/[.\/]/g, '-');
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(normalized)) {
    const [year] = normalized.split('-').map(Number);
    const parsed = year >= 1300 && year < 1700 ? moment.from(normalized, 'fa', 'YYYY-M-D') : moment(normalized, 'YYYY-M-D');
    return parsed.isValid() ? parsed.format('YYYY-MM-DD') : null;
  }
  return text;
};

export type ParsedPhoneImportRow = {
  id: number;
  imei: string;
  supplierName: string;
  payload: PhoneEntryPayload | PhoneEntryUpdatePayload;
};

export const parsePhoneImportRow = (row: ImportSheetRow): ParsedPhoneImportRow => {
  const id = parseImportInteger(getImportCell(row, ['شناسه', 'id', 'phone id']), 0);
  const model = normalizeImportText(getImportCell(row, ['مدل', 'model']));
  const color = normalizeImportText(getImportCell(row, ['رنگ', 'color']));
  const storage = normalizePhoneStorageLabel(getImportCell(row, ['حافظه', 'storage']));
  const ram = normalizePhoneRamLabel(getImportCell(row, ['رم', 'ram']));
  const imei = normalizeImportText(getImportCell(row, ['imei', 'آی ام ای آی', 'شناسه دستگاه']));
  const batteryHealthRaw = getImportCell(row, ['سلامت باتری', 'battery health', 'batteryHealth']);
  const condition = normalizeImportText(getImportCell(row, ['وضعیت ظاهری', 'condition']));
  const purchasePrice = parseImportNumber(getImportCell(row, ['قیمت خرید', 'purchase price', 'purchasePrice']), 0);
  const currentPurchasePrice = parseImportNumber(getImportCell(row, ['قیمت خرید روز', 'current purchase price', 'currentPurchasePrice']), purchasePrice);
  const salePriceRaw = getImportCell(row, ['قیمت فروش', 'sale price', 'salePrice', 'selling price']);
  const salePrice = isImportBlank(salePriceRaw) ? null : parseImportNumber(salePriceRaw, 0);
  const supplierName = normalizeImportText(getImportCell(row, ['تامین‌کننده', 'تامین کننده', 'supplier']));
  const sellerName = normalizeImportText(getImportCell(row, ['فروشنده/ثبت‌کننده', 'فروشنده', 'ثبت کننده', 'sellerName']));
  const purchaseDate = normalizePhoneImportDate(getImportCell(row, ['تاریخ خرید', 'purchase date', 'purchaseDate']));
  const statusRaw = normalizeImportText(getImportCell(row, ['وضعیت', 'status']));
  const notes = normalizeImportText(getImportCell(row, ['یادداشت', 'notes']));

  if (!model) throw new Error('مدل گوشی خالی است.');
  if (!imei) throw new Error('IMEI خالی است.');
  if (purchasePrice <= 0) throw new Error('قیمت خرید باید بزرگتر از صفر باشد.');
  const parsedBatteryHealth = isImportBlank(batteryHealthRaw) ? null : parseImportInteger(batteryHealthRaw, 0);
  const batteryHealth = normalizePhoneBatteryForCondition(condition, parsedBatteryHealth);
  if (batteryHealth != null && (batteryHealth < 0 || batteryHealth > 100)) throw new Error('سلامت باتری باید بین ۰ تا ۱۰۰ باشد.');
  const status = PHONE_STATUSES.includes(statusRaw as PhoneStatus) ? statusRaw : PHONE_STATUSES[0];

  return {
    id,
    imei,
    supplierName,
    payload: {
      model,
      color: color || null,
      storage: storage || null,
      ram: ram || null,
      imei,
      batteryHealth,
      condition: condition || null,
      purchasePrice,
      currentPurchasePrice: currentPurchasePrice > 0 ? currentPurchasePrice : purchasePrice,
      salePrice,
      sellerName: sellerName || null,
      purchaseDate,
      status,
      notes: notes || null,
      supplierId: null,
    },
  };
};

export const isPhoneImportSupplierBlank = (supplierName: string) => isImportBlank(supplierName);
