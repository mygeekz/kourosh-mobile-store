// utils/rbac.ts
import { NavItem } from '../types';

/** نقش‌های شناخته‌شده در سیستم (از سمت سرور) */
export type RoleName =
  | 'Admin'
  | 'Manager'
  | 'Salesperson'
  | 'Warehouse'
  | 'Technician'
  | 'Marketer'
  | (string & {});

/** قوانین دسترسی بر اساس prefix مسیر (هرچه بالاتر، اولویت بیشتر) */
const PATH_RULES: Array<{ prefix: string; roles: RoleName[] }> = [
  // تنظیمات و لاگ
  // مسیر مالکیت/شرکا عمداً قبل از /settings آمده تا در آینده اگر بخشی از تنظیمات بازتر شد،
  // این بخش حساس همچنان با نقش Admin هم‌راستا با APIهای /api/store-ownership محافظت شود.
  { prefix: '/settings/store-ownership', roles: ['Admin'] },
  { prefix: '/settings', roles: ['Admin'] },
  { prefix: '/notifications', roles: ['Admin'] },
  { prefix: '/audit-log', roles: ['Admin', 'Manager'] },

  // فروش و فاکتور و اقساط
  { prefix: '/sales', roles: ['Admin', 'Manager', 'Salesperson'] },
  { prefix: '/invoices', roles: ['Admin', 'Manager', 'Salesperson'] },
  { prefix: '/installment-sales', roles: ['Admin', 'Manager', 'Salesperson'] },

  // تعمیرات و خدمات
  { prefix: '/repairs', roles: ['Admin', 'Manager', 'Technician'] },
  { prefix: '/services', roles: ['Admin', 'Manager', 'Technician'] },

  // محصولات / انبار
  { prefix: '/products', roles: ['Admin', 'Manager', 'Warehouse', 'Salesperson', 'Technician', 'Marketer'] },
  { prefix: '/mobile-phones', roles: ['Admin', 'Manager', 'Warehouse', 'Salesperson', 'Technician', 'Marketer'] },

  // اشخاص
  { prefix: '/customers', roles: ['Admin', 'Manager', 'Salesperson', 'Marketer'] },
  { prefix: '/partners', roles: ['Admin', 'Manager', 'Salesperson', 'Marketer'] },

  // ابزارها
  { prefix: '/tools', roles: ['Admin', 'Manager', 'Warehouse'] },

  // گزارش‌ها
  { prefix: '/reports', roles: ['Admin', 'Manager', 'Salesperson', 'Marketer'] },
];

/** نرمال‌سازی مسیر (حذف query/hash و اسلش انتهایی) */
export function normalizeAppPath(path: string): string {
  const clean = path.split('?')[0]?.split('#')[0] ?? path;
  return clean.length > 1 ? clean.replace(/\/+$/, '') : clean;
}

/** آیا این نقش اجازه ورود به مسیر را دارد؟ */
export function canAccessPath(roleName: RoleName | undefined | null, path: string): boolean {
  if (!roleName) return false;
  const p = normalizeAppPath(path);

  for (const rule of PATH_RULES) {
    if (p === rule.prefix || p.startsWith(rule.prefix + '/')) {
      return rule.roles.includes(roleName);
    }
  }
  // مسیرهای عمومی داخل اپ (مثل داشبورد، پروفایل، 404) → همهٔ نقش‌های لاگین کرده
  return true;
}


export function hasAnyRole(roleName: RoleName | undefined | null, roles: RoleName[] | undefined | null): boolean {
  if (!roles || roles.length === 0) return true;
  if (!roleName) return false;
  return roles.includes(roleName);
}

export function canPerformAction(roleName: RoleName | undefined | null, options?: {
  roles?: RoleName[];
  path?: string;
}): boolean {
  if (!roleName) return false;
  if (options?.roles && options.roles.length > 0) return hasAnyRole(roleName, options.roles);
  if (options?.path) return canAccessPath(roleName, options.path);
  return true;
}

/** فیلتر کردن منوها بر اساس نقش کاربر */
export function filterNavItemsByRole(items: NavItem[], roleName: RoleName | undefined | null): NavItem[] {
  if (!roleName) return [];
  const walk = (arr: NavItem[]): NavItem[] =>
    arr
      .map((it) => {
        const children = it.children ? walk(it.children) : undefined;
        const selfAllowed = it.path ? canAccessPath(roleName, it.path) : true;
        const keep = selfAllowed || (children && children.length > 0);
        if (!keep) return null;
        return { ...it, children };
      })
      .filter(Boolean) as NavItem[];

  return walk(items);
}

/** دسترسی‌های سطح عملیات (UI) */
export function canManageProducts(roleName: RoleName | undefined | null): boolean {
  return roleName === 'Admin' || roleName === 'Manager' || roleName === 'Warehouse';
}
