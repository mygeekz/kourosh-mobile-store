# قرارداد Componentهای رسمی UI

## Import عمومی

تمام مصرف‌کننده‌های جدید باید از Barrel رسمی استفاده کنند:

```ts
import { Button, DialogShell, PanelCard } from '@/components/ui';
```

Import مستقیم از مسیر فیزیکی Component برای کد جدید مجاز نیست، مگر برای جلوگیری از Circular Dependency و با ثبت دلیل در Manifest.

## Action

### `Button`

مرجع:

```text
components/Button.tsx
```

قواعد:

- تگ خام `<button>` در کد جدید ایجاد نشود.
- Variant و Size از Props رسمی استفاده کنند.
- وضعیت Permission و Loading از همان Component مدیریت شود.
- Button جدید برای ظاهر متفاوت ساخته نشود؛ Variant موجود اصلاح یا با قرارداد رسمی توسعه داده شود.

## Overlay

### `DialogShell`

مرجع:

```text
components/ui/DialogShell.tsx
```

مسئولیت‌ها:

- Portal
- Focus trap
- Escape
- Body scroll lock
- بازگرداندن Focus
- ترتیب Dialogهای تو‌در‌تو

ساخت Portal یا Overlay مستقل در Modal جدید ممنوع است.

### `PortalLayer`

برای Tooltip، Toast، Popover و Floating Surfaceهایی استفاده شود که Dialog نیستند.

## Layout و Surface

### `PageShell`

مرجع ساختار صفحه و Header است. Page جدید نباید Page Header مستقل و تکراری بسازد.

### `PanelCard`

مرجع Surfaceهای محتوایی است. کارت جدید ابتدا باید با Props و Slotهای این Component پیاده‌سازی شود.

### `SurfaceHeader`

مرجع عنوان، زیرعنوان، آیکون و Actionهای Surface است.

## Form

### `ControlShell`

پایه مشترک Label، Hint، Error، Icon و Data Contract کنترل‌هاست.

### `TextField`

جایگزین Input متنی خام در مصرف‌کننده‌های جدید.

### `SelectField`

مرجع واحد Selectهای عمومی برنامه است. `AppSelectField` فقط Adapter قدیمی و ممنوع برای مصرف جدید است.

### `TextareaField`

مرجع ورودی چندخطی.

### `AppSearchField`

مرجع Search Box تک‌فریم؛ Search تو‌در‌تو و Clear Icon اضافی بدون نیاز واقعی ممنوع است.

## Data

### `DataTableShell`

مرجع Container، Header، Toolbar و Scroll Surface جدول است. منطق Row/Column می‌تواند ماژولی باشد، ولی Shell نباید دوباره ساخته شود.

### `ResponsiveFilterBar`

مرجع چیدمان Filterها در Desktop و Mobile.

## Feedback

### `EmptyState`

مرجع وضعیت بدون داده.

### `Skeleton`

مرجع Loading Placeholder.

## Componentهای Legacy ثبت‌شده

مصرف جدید این Componentها ممنوع و فقط کاهش مصرف آن‌ها مجاز است:

- `components/Modal.tsx`
- `components/SearchBox.tsx`
- `components/StatCard.tsx`
- `components/reports/PremiumStatCard.tsx`
- `components/reports/ModernKpiCard.tsx`
- `components/reports/PremiumDataTable.tsx`

جایگزین هر مورد در `config/ui/ui-manifest.json` ثبت شده است.
