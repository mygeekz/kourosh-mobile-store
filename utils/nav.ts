import { NavItem } from '../types';

export type FlatNavItem = {
  id: string;
  title: string;
  path: string;
  icon?: string;
  parentTitle?: string;
};

export function flattenNav(items: NavItem[], parentTitle?: string): FlatNavItem[] {
  const out: FlatNavItem[] = [];
  for (const it of items) {
    if (it.path) {
      out.push({ id: it.id, title: it.name, path: it.path, icon: it.icon, parentTitle });
    }
    if (it.children?.length) out.push(...flattenNav(it.children, it.name));
  }
  return out;
}

export function findNavByPath(items: NavItem[], path: string): FlatNavItem | undefined {
  return flattenNav(items).find(i => i.path === path);
}

export function normalizePath(path: string): string {
  return path.split('?')[0].split('#')[0];
}
