# Phase 39 — Sidebar Row/Flyout Extraction

## هدف

در این مرحله، `Sidebar.tsx` از مسئولیت رندر recursive rowها و flyout حالت mini-sidebar جدا شد تا خود فایل Sidebar فقط orchestration state و policy wiring را نگه دارد.

## فایل‌های جدید

- `components/sidebar/SidebarNavTree.tsx`
- `components/sidebar/SidebarFlyoutPanel.tsx`
- `components/sidebar/sidebarNavUtils.ts`

## فایل‌های تغییرکرده

- `components/Sidebar.tsx`
- `components/sidebar/index.ts`
- `package.json`

## رفتارهای حفظ‌شده

- routeها و active state
- open/close groupها
- flyout positioning و hover delay
- favorites
- badges
- sidebar search
- branding
- RBAC و feature policy
- mobile close behavior

## چک

```bash
npm run audit:sidebar-row-flyout
```

## نکته

این مرحله عمداً state مربوط به `openGroups`, `hoveredGroupId`, `flyoutLayout` و badge aggregation را داخل `Sidebar.tsx` نگه داشت تا تغییر رفتاری ایجاد نشود. فقط رندر Row/Flyout و helperهای مربوط به active/flyout subtitle به ماژول sidebar منتقل شدند.
