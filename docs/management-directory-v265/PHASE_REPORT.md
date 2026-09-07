# Kourosh Store Management v265 — Management Directory Table Standard

## هدف

استاندارد رسمی جدول‌های لیستی مدیریتی پروژه بر اساس الگوی تأییدشده‌ی بخش‌های «مشتریان» و «همکاران» ایجاد شد و لیست «تعمیرات» نیز به همان قرارداد منتقل شد.

## Source of Truth جدید

کامپوننت زیر مرجع رسمی جدول‌های directory/list مدیریتی است:

- `components/ui/ManagementDirectoryTable.tsx`

این primitive بدون CSS اختصاصی و بدون inline style ساخته شده و از utility/token/primitiveهای موجود پروژه استفاده می‌کند.

## قرارداد بصری/رفتاری

- جدول semantic واقعی؛ نه cardification خودکار در موبایل
- چهار ستون گروه‌بندی‌شده با نسبت پایه 33% / 28% / 25% / 14%
- عملیات در `inline-end` و sticky
- scroll افقی محلی در عرض‌های compact
- RTL واقعی
- row hover و background مشترک
- rail وضعیت در `inline-start` با utilityهای semantic
- pagination مشترک از `ManagementDirectoryPagination`
- toolbar استاندارد تعمیرات از `ManagementDirectoryToolbar`
- page-level horizontal scroll ایجاد نمی‌شود

## مهاجرت‌ها

### Customers

`pages/Customers.tsx` اکنون مستقیماً از `ManagementDirectoryTable` استفاده می‌کند. منطق ردیف‌ها و عملیات مشتری تغییر نکرده است.

### Partners

`components/people/PartnerDirectoryList.tsx` اکنون مستقیماً از همان primitive استفاده می‌کند. wrapper سازگاری `data-ui-partners-directory="true"` برای قراردادهای موجود حفظ شده است.

### Repairs

`pages/Repairs.tsx` از Cardification موبایل و shell جدولی اختصاصی خارج شده و همان جدول استاندارد Customers/Partners را استفاده می‌کند.

- لیست تعمیرات در موبایل همچنان جدول باقی می‌ماند و داخل خودش scroll می‌خورد.
- ستون عملیات sticky باقی می‌ماند.
- Pagination لیست با گزینه‌های 25 / 50 / 100 اضافه شده است.
- Export/Print همچنان روی تمام نتایج فیلترشده عمل می‌کند، نه فقط صفحه جاری.
- منطق تعمیرات، API، وضعیت‌ها و عملیات تجاری تغییر نکرده است.

## Custom CSS

در v265 هیچ CSS جدیدی اضافه نشده و هیچ فایل CSS برای این استاندارد تغییر نکرده است.

قاعده پروژه: برای UI معمول، Custom CSS ممنوع است؛ فقط استثنای تخصصی واقعی، component-scoped و مستند مجاز است.

## موارد خارج از Scope

- Kanban تعمیرات هنوز از قراردادهای تاریخی `repairs-apple-*` استفاده می‌کند و در این نسخه بازطراحی نشده است.
- CSS چاپ/رسید تعمیر یک مسیر تخصصی Print است و در v265 دست‌کاری نشده است.

## Release

- Source version: `v265`
- MiniApp HTML marker: `v265`
- Cloudflare Edge marker: `v265`
