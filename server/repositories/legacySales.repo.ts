import {
  recordInventoryInDb,
  recordSaleTransactionInDb,
  type SaleDataPayload,
} from '../database';

export async function recordLegacySaleTransaction(saleData: SaleDataPayload) {
  return recordSaleTransactionInDb(saleData);
}

export async function recordLegacySaleInventoryOut(entry: {
  productId: number;
  entryType: 'out';
  quantity: number;
  refType: 'sale';
  refId: number;
  entryDate: string;
}) {
  return recordInventoryInDb(entry);
}

export type { SaleDataPayload };
