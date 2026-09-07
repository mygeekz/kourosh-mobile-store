# Header Architecture — Contract v3

## ساختار مرجع

هدر یک ردیف آرام و چهارناحیه‌ای است:

`utilities | live-actions | search | title`

- عنوان فقط یک‌بار نمایش داده می‌شود و علاقه‌مندی کنار آن قرار دارد.
- Search فقط یک Surface دارد و Focus آن Ring یا Glow تولید نمی‌کند.
- اکشن‌های زنده به‌شکل Icon + Count و با Divider ساختاری نمایش داده می‌شوند.
- Utilityها از اکشن‌های عملیاتی جدا هستند.
- Popoverها فقط با Click باز می‌شوند.
- Responsive behavior بر اساس Container Query خود هدر است.

## فایل‌های مرجع

- `components/header/HeaderShell.tsx`
- `components/header/HeaderLayout.tsx`
- `components/header/HeaderTitleArea.tsx`
- `components/header/HeaderSearch.tsx`
- `components/header/HeaderQuickActions.tsx`
- `components/header/HeaderRiskBadge.tsx`
- `styles/system/ui-contracts/navigation-shell-contract-phase5.css`
- `config/ui/header-surface-manifest.json`

هیچ CSS مرحله‌ای یا Namespace قدیمی نباید روی DOM فعال هدر Match شود.

## Header-1D — Canonical icon controls and popovers

- `HeaderIconButton` is a native canonical icon control. It intentionally does not consume the generic application `Button`, so icon-only Header controls cannot inherit internal label/icon backgrounds.
- `HeaderQuickPopover` is the only frame for sales, due-date and notification previews.
- The popover is one surface with three structural rows: fixed header, independently scrolling body and fixed footer.
- Quick-menu content uses separators and lists instead of nested gradient cards.
- The profile menu opens toward the viewport interior (`inset-inline-end`) and shares the Header surface tokens.
- Header popovers contain no preview badge, dark CTA pill or accent gradient.
