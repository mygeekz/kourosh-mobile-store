# Phase 06 — Reports Shell Foundation

## Scope
This phase standardizes the shared shell/header contract for report pages that use:

- `components/reports/PremiumReportShell.tsx`
- `components/reports/ModernReportShell.tsx`

No report API, calculations, route mapping, filters, exports, database behavior, or business logic were changed.

## Changed files

- `components/reports/PremiumReportShell.tsx`
- `components/reports/ModernReportShell.tsx`
- `styles/system/reports-shell-foundation.css`
- `index.tsx`
- `docs/ui-foundation/PHASE_06_REPORTS_SHELL_FOUNDATION.md`

## UX goals

- One consistent report header contract across Premium and Modern report pages.
- Compact Apple-minimal shell with less visual noise.
- RTL-safe title, subtitle, badge, and actions layout.
- Better responsive behavior for report action buttons.
- Preserve existing class names where possible to avoid breaking older report CSS.

## What was intentionally not changed

- Report calculations
- Date filters and preset logic
- Export handlers
- Telegram/schedule modals inside `ReportsLayout`
- Individual report table/card internals
- Runtime override cleanup beyond the new shell layer

## Manual test checklist

1. Open `/reports` and key nested report pages.
2. Test pages using `PremiumReportShell`, especially Financial Overview.
3. Test pages using `ModernReportShell`, especially Inventory/Profitability/Purchase Suggestion/Analysis Hub.
4. Check header title/subtitle truncation in desktop and mobile widths.
5. Check action buttons in report headers.
6. Check dark mode and light mode.
7. Confirm no report data/loading/export behavior changed.
