import type { RefObject } from 'react';
import type { FlatNavItem } from '../../utils/nav';

export type CommandPaletteProps = {
  open: boolean;
  onClose: () => void;
};

export type DataSearchDomain =
  | 'customer'
  | 'partner'
  | 'product'
  | 'phone'
  | 'service'
  | 'invoice'
  | 'repair'
  | 'installment';

export type DataSearchItem = {
  id: number;
  domain: DataSearchDomain;
  title?: string;
  subtitle?: string;
  titleHL?: string;
  snippet?: string;
  matchSource?: string;
  matchReason?: string;
};

export type CommandPaletteDataQuickAction = 'open' | 'payNext' | 'receipt' | 'print';

export type CommandPaletteCombinedItem =
  | { kind: 'data'; key: string; data: DataSearchItem }
  | { kind: 'nav'; key: string; nav: FlatNavItem };

export type CommandPaletteNavLike = Pick<FlatNavItem, 'title' | 'path' | 'icon' | 'parentTitle'>;

export type SearchInsightChip = {
  query: string;
  count?: number;
};

export type CommandPaletteInputRef = RefObject<HTMLInputElement | null>;
