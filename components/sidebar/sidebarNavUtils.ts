import type { NavItem } from '../../types';

export const isActivePath = (pathname: string, itemPath?: string): boolean => {
  if (!itemPath) return false;
  if (itemPath === '/') return pathname === '/';
  return pathname === itemPath || pathname.startsWith(itemPath + '/');
};

export const isItemActive = (pathname: string, item: NavItem): boolean => {
  if (isActivePath(pathname, item.path)) return true;
  if (item.children?.length) return item.children.some((child) => isItemActive(pathname, child));
  return false;
};

// Active-box contract:
// - A parent/group can be open because one of its children is active.
// - But the visual active box must stay only on the exact route row.
// - For groups with a hub path like /reports, /reports/* must not make the parent boxed.
export const isExactRouteActive = (pathname: string, item: NavItem): boolean => {
  if (!item.path) return false;
  if (item.path === '/') return pathname === '/';

  // Parent rows with children are navigational groups.
  // Even if the parent path is the current page, the boxed active state must stay on the matching child row
  // so the group header only acts as an open/section indicator.
  if (item.children?.length) return false;

  return isActivePath(pathname, item.path);
};

const FLYOUT_SUBTITLE_MAP: Record<string, string> = {
  dashboard: 'پیشخوان مدیریتی، شاخص‌های روز و دسترسی‌های سریع',
  customers: 'لیست مشتریان، پرونده‌ها و پیگیری تعاملات',
  customer: 'لیست مشتریان، پرونده‌ها و پیگیری تعاملات',
  partners: 'مدیریت همکاران، تأمین‌کننده‌ها و حساب همکاری',
  partner: 'مدیریت همکاران، تأمین‌کننده‌ها و حساب همکاری',
  inventory: 'موجودی، ورود و خروج کالا و کنترل انبار',
  product: 'مدیریت کالاها، دسته‌بندی و وضعیت فروش',
  products: 'مدیریت کالاها، دسته‌بندی و وضعیت فروش',
  report: 'گزارش‌های رسمی مالی، فروش و تحلیل عملکرد',
  reports: 'گزارش‌های رسمی مالی، فروش و تحلیل عملکرد',
  repair: 'ثبت اطلاعات، پیگیری و تحویل تعمیرات مشتریان',
  repairs: 'ثبت اطلاعات، پیگیری و تحویل تعمیرات مشتریان',
  installment: 'فروش اقساطی، سررسیدها و مدیریت پرداخت‌ها',
  installments: 'فروش اقساطی، سررسیدها و مدیریت پرداخت‌ها',
  sale: 'ثبت اطلاعات فروش، فاکتور و عملیات روزانه فروش',
  sales: 'ثبت اطلاعات فروش، فاکتور و عملیات روزانه فروش',
  purchase: 'ثبت اطلاعات خرید، تأمین کالا و گردش هزینه',
  purchases: 'ثبت اطلاعات خرید، تأمین کالا و گردش هزینه',
  expense: 'هزینه‌ها، پرداخت‌ها و کنترل مخارج',
  expenses: 'هزینه‌ها، پرداخت‌ها و کنترل مخارج',
  notification: 'اعلان‌ها، پیگیری‌ها و رویدادهای مهم سیستم',
  notifications: 'اعلان‌ها، پیگیری‌ها و رویدادهای مهم سیستم',
  setting: 'پیکربندی سیستم، برند و تنظیمات عملیاتی',
  settings: 'پیکربندی سیستم، برند و تنظیمات عملیاتی',
  'store-ownership': 'ساختار شرکا، سهم سود، مالکیت موجودی و اتصال داده‌های قدیمی',
  message: 'پیام‌ها، ارسال‌ها و وضعیت صف ارتباطات',
  sms: 'پیامک‌ها، الگوها و لاگ ارسال',
  telegram: 'تنظیمات تلگرام، قالب‌ها و وضعیت اتصال',
  outbox: 'پیام‌های در صف، خطا در عملیاتها و تاریخچه ارسال',
  more: 'آیتم‌های مدیریتی و کم‌تکرار؛ سطح اصلی سایدبار برای عملیات روزانه خلوت می‌ماند',
  'settings-home': 'تنظیمات عمومی سیستم، برند، دسترسی‌ها و پیکربندی‌های اصلی',
  invoice: 'فاکتورها، چاپ و سوابق صدور',
  invoices: 'فاکتورها، چاپ و سوابق صدور',
  profile: 'مشاهده حساب کاربری و تنظیمات شخصی',
};

export const getNavSurfaceRole = (item: NavItem, parent?: NavItem): { label: string; hint: string } => {
  const haystack = [item.id, item.path || '', item.name || '', parent?.id || '', parent?.path || '']
    .map((value) => String(value).toLowerCase())
    .join(' ');

  if (/more|بیشتر/.test(haystack)) return { label: 'مسیرهای تکمیلی', hint: 'بخش‌های مدیریتی و کم‌تکرار اینجا جمع شده‌اند تا منوی اصلی خلوت بماند.' };
  if (/report|گزارش/.test(haystack)) return { label: 'منبع رسمی گزارش', hint: 'گزارش‌ها مرجع رسمی تحلیل و خروجی هستند؛ هدر فقط پیش‌نمایش می‌دهد.' };
  if (/dashboard|پیشخوان|داشبورد/.test(haystack)) return { label: 'تصمیم سریع', hint: 'پیشخوان برای تصمیم روزانه است، نه جایگزین گزارش رسمی.' };
  if (/notification|اعلان/.test(haystack)) return { label: 'مرکز پیگیری', hint: 'اعلان‌ها از هدر پیش‌نمایش می‌شوند و اینجا مرکز کامل پیگیری است.' };
  if (/sale|فروش/.test(haystack)) return { label: 'مسیر عملیاتی', hint: 'شروع عملیات فروش از Dashboard/Mobile سریع‌تر است؛ این مسیر نقشه کامل بخش است.' };
  return { label: 'نقشه ناوبری', hint: parent?.name ? `مسیر بخش ${parent.name}` : 'مسیر رسمی این بخش' };
};

export const getFlyoutSubtitle = (item: NavItem, parent?: NavItem): string => {
  const haystacks = [item.id, item.path || '', item.name || '', parent?.id || '', parent?.path || '']
    .map((value) => String(value).toLowerCase());

  const match = Object.entries(FLYOUT_SUBTITLE_MAP).find(([key]) =>
    haystacks.some((value) => value.includes(key))
  );

  if (match) return `${match[1]}؛ ${getNavSurfaceRole(item, parent).hint}`;
  if (parent?.name) return `نقشه ناوبری به بخش ${parent.name}؛ اکشن عملیاتی سریع در پیشخوان/هدر مدیریت می‌شود`;
  return 'نقشه ناوبری این بخش؛ برای اجرای سریع کارهای روزانه از پیشخوان یا هدر استفاده کن';
};
