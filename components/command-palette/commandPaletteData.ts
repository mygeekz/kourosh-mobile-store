import type { CommandPaletteDataQuickAction, DataSearchItem } from './commandPaletteTypes';

export const getDataDomainTitle = (domain: string): string => {
  switch (domain) {
    case 'customer':
      return 'مشتری‌ها';
    case 'partner':
      return 'همکارها';
    case 'invoice':
      return 'فروش‌ها و فاکتورها';
    case 'repair':
      return 'تعمیرات';
    case 'installment':
      return 'اقساط';
    case 'product':
      return 'کالاها';
    case 'phone':
      return 'گوشی‌ها';
    case 'service':
      return 'خدمات';
    default:
      return 'سایر';
  }
};

export const getDataOpenPath = (item: DataSearchItem, searchTerm: string): string => {
  const encodedTerm = encodeURIComponent(searchTerm.trim());

  switch (item.domain) {
    case 'customer':
      return `/customers/${item.id}`;
    case 'partner':
      return `/partners/${item.id}`;
    case 'invoice':
      return `/invoices/${item.id}`;
    case 'repair':
      return `/repairs/${item.id}`;
    case 'installment':
      return `/installment-sales/${item.id}`;
    case 'product':
      return `/products?q=${encodedTerm}`;
    case 'phone':
      return `/mobile-phones?q=${encodedTerm}`;
    case 'service':
      return `/services?q=${encodedTerm}`;
    default:
      return '/';
  }
};

export const getDataActionPath = (
  item: DataSearchItem,
  action: CommandPaletteDataQuickAction | undefined,
  searchTerm: string,
): string => {
  const openPath = getDataOpenPath(item, searchTerm);

  if (item.domain === 'installment' && action === 'payNext') return `/installment-sales/${item.id}?pay=next`;
  if (item.domain === 'repair' && action === 'receipt') return `/repairs/${item.id}/receipt`;
  if (item.domain === 'invoice' && action === 'print') return `/invoices/${item.id}?autoPrint=1`;

  return openPath;
};
