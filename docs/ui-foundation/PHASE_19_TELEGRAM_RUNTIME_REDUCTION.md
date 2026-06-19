# Phase 19 — Telegram Runtime Reduction

## Scope
This phase moves the remaining Telegram-specific runtime override CSS imports into controlled `styles/system/telegram-runtime/*` foundation files.

No JSX, API, Telegram service, bot flow, database logic, message queue logic, or routing was changed.

## Files moved out of runtime imports

- `styles/runtime-overrides/02b-settings-telegram-compact.css` → `styles/system/telegram-runtime/settings-telegram-compact-foundation.css`
- `styles/runtime-overrides/02g-telegram-real-compact-patch.css` → `styles/system/telegram-runtime/telegram-real-compact-foundation.css`
- `styles/runtime-overrides/03d-legacy-telegram-monitor-patches.css` → `styles/system/telegram-runtime/legacy-telegram-monitor-foundation.css`
- `styles/runtime-overrides/08b-message-composer-controls.css` → `styles/system/telegram-runtime/message-composer-controls-foundation.css`

## Cascade policy
Import positions were preserved exactly in `index.tsx`. These files were not merged into one file because they originally sit in different cascade zones and merging them could change specificity outcomes around Settings, compact Telegram cards, monitor cards, and composer controls.

## Runtime status
Direct `runtime-overrides` imports in `index.tsx` decreased from 8 to 4.

Remaining direct runtime imports are intentionally left untouched:

- `02a-reports-apple-minimal.css`
- `02e-people-commercial-redesign.css`
- `10a-installments-phone-edit-overrides.css`
- `10zk-partner-phone-capital-solid-reset.css`

These should be handled in separate feature-scoped phases.

## Test checklist

- Settings > Telegram
- Telegram compact layout
- Telegram monitor cards
- Telegram Studio filters/search
- Telegram logs accordion
- Message composer modal
- Message template/test modal
- Customer/partner Telegram status badges
- Dark mode / light mode
- Responsive widths: mobile, 1280, 1366
