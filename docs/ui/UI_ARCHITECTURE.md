# معماری رسمی UI پروژه کوروش

## هدف

این سند از Phase `UI-0A` مرجع تصمیم‌گیری برای تمام تغییرات UI/UX است. هدف، جلوگیری از ایجاد CSSهای اصلاحی متوالی، Importهای تکراری، Componentهای موازی و تفاوت رفتاری میان ماژول‌هاست.

## اصل اول: بررسی قبل از ایجاد

قبل از اضافه‌کردن هر قابلیت، Component، Variant، CSS یا بخش UI:

1. `config/ui/ui-manifest.json` بررسی شود.
2. `components/ui/index.ts` و Componentهای فعلی بررسی شوند.
3. `styles/manifest/style-manifest.json` برای فایل یا ماژول مشابه بررسی شود.
4. اگر قابلیت مشابه کامل یا ناقص وجود دارد، همان مورد اصلاح و توسعه داده شود.
5. فقط در نبود جایگزین واقعی، Component جدید ساخته شود و هم‌زمان در Manifest ثبت گردد.

## ورودی استایل

تنها ورودی مجاز Runtime برای CSS:

```text
app/bootstrap/styles.ts
```

این فایل **Generated** است و نباید دستی ویرایش شود. منبع ترتیب Importها:

```text
styles/manifest/style-manifest.json
```

فرایند صحیح:

```bash
npm run generate:style-bootstrap
npm run audit:style-manifest
```

Import مستقیم CSS در `pages/**`، `components/**` و `app/**` به‌جز Bootstrap ممنوع است.

## وضعیت‌های Style Manifest

- `provisional-canonical`: مرجع فعلی که در UI-0B تثبیت یا تفکیک می‌شود.
- `generated`: خروجی تولیدشده و غیرقابل ویرایش مستقیم.
- `source`: منبعی که در Bundle تولیدشده Tailwind ادغام می‌شود.
- `compatibility`: استایل فعال قدیمی که هنوز مهاجرت نشده است.
- `migrating`: فایل Patch/Pass/Stage فعال با مقصد مهاجرت مشخص.
- `quarantined`: استایل قدیمی یا پرریسک که استفاده جدید از آن ممنوع است.
- `dormant`: فایل موجود ولی خارج از Runtime فعلی.

تمام فایل‌های غیرCanonical باید `debtId` و `migrationTarget` داشته باشند.

## جلوگیری از CSS Patch جدید

نام‌های Patch‌محور قدیمی مانند موارد زیر فقط به‌صورت Grandfathered در Manifest ثبت شده‌اند:

```text
*-fix.css
*-final.css
*-pass-*.css
*-stage*.css
*-phase*.css
*-v*.css
```

ایجاد فایل جدید با این الگو مجاز نیست. اصلاح باید در فایل مرجع Component یا Module انجام شود.

## Component Registry

درگاه رسمی مصرف Componentهای پایه:

```ts
import {
  Button,
  DialogShell,
  PageShell,
  PanelCard,
  TextField,
  SelectField,
  AppSearchField,
  DataTableShell,
} from '@/components/ui';
```

مسیرهای فیزیکی ممکن است در آینده تغییر کنند، اما Import عمومی باید ثابت بماند.

## بدهی فعلی و Baseline

پروژه دارای Primitiveهای خام و Importهای قدیمی زیادی است. حذف یک‌باره آن‌ها ریسک Runtime دارد؛ بنابراین Phase UI-0A از مدل «Ratchet» استفاده می‌کند:

- مقدار فعلی ثبت شده است.
- کاهش بدهی مجاز و مطلوب است.
- افزایش بدهی یا ایجاد بدهی در فایل جدید ممنوع است.

Baseline در این فایل قرار دارد:

```text
docs/ui/baselines/ui-boundary-baseline.json
```

به‌روزرسانی Baseline فقط هنگام مهاجرت کنترل‌شده و با دلیل مستند انجام می‌شود.

## قراردادهای رزروشده برای UI-0B

Manifest از اکنون نام و مقادیر هدف Breakpoint و Layer را رزرو کرده است، اما اعمال CSS آن‌ها در UI-0B انجام می‌شود تا ظاهر فعلی در UI-0A تغییر نکند.

Breakpointهای هدف:

- Mobile: `640px`
- Tablet: `768px`
- Desktop: `1024px`
- Wide: `1280px`

Layerهای هدف از `base` تا `toast` در `config/ui/ui-manifest.json` ثبت شده‌اند.

## فرمان کنترل نهایی

```bash
npm run audit:ui-system
```

این فرمان سه کنترل را اجرا می‌کند:

1. صحت UI Manifest و Componentهای مرجع
2. کامل‌بودن Style Manifest و ثبات ترتیب 389 Import Runtime
3. عدم افزایش Primitive خام، Import قدیمی و CSS Import خارج از Bootstrap
