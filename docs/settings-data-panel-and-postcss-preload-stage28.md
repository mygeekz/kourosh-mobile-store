# Stage 28 — PostCSS warning preload + Settings Data panel split

## چرا Stage 27 کافی نبود؟
`customLogger` فقط warningهایی را می‌گیرد که از logger داخلی Vite عبور کنند. پیام PostCSS از مسیر `console.warn`/`stderr` چاپ می‌شد، برای همین هنوز در ترمینال دیده می‌شد.

## فیکس ترمینال
- `scripts/postcss-warning-filter.cjs` اضافه شد.
- `scripts/vite-dev.cjs` اضافه شد.
- `package.json` تغییر کرد:

```json
"vite-dev": "node scripts/vite-dev.cjs"
```

این runner قبل از اجرای Vite preload می‌شود و فقط پیام دقیق زیر را فیلتر می‌کند:

```txt
A PostCSS plugin did not pass the `from` option to `postcss.parse`
```

هیچ warning یا error دیگری مخفی نمی‌شود.

## Split امن Settings
- تب داده‌ها/Backup از `pages/Settings.tsx` جدا شد.
- فایل جدید:

```txt
pages/settings/SettingsDataPanel.tsx
```

- state، effectها و handlerها در `Settings.tsx` باقی ماندند.
- JSX پنل داده‌ها بدون تغییر محتوایی منتقل شد.
- UI/UX، classNameها، ترتیب دکمه‌ها و متن‌ها تغییر نکردند.

## اجرا
همان دستور قبلی کافی است:

```bash
npm run dev
```

چون `dev:proxy` همچنان `npm run vite-dev` را اجرا می‌کند و `vite-dev` حالا runner جدید است.
