# Phase 65 — Settings > Telegram Redesign Pass 4

## Scope
Redesign polish for the Telegram logs/timeline area inside `Settings > Telegram`.

## Files changed
- `index.tsx`
- `styles/system/telegram-redesign/settings-telegram-redesign-pass-4.css`
- `docs/ui-foundation/PHASE_65_SETTINGS_TELEGRAM_REDESIGN_PASS_4.md`
- `docs/ui-foundation/PHASE_65_SETTINGS_TELEGRAM_REDESIGN_PASS_4.json`
- `docs/ui-foundation/PHASE_65_QA_CHECKS.json`

## What changed
- Added a scoped Telegram logs redesign layer under `#telegram-settings-form.telegram-redesign-v1`.
- Polished logs container, header, summary stats, filters, table surface, status badges, inline fix row, pagination and debug modal cards.
- Added mobile treatment that turns the logs table into card-like rows at narrow widths.
- Preserved all retry, quick-fix, modal details, filter and API behavior.

## Guardrails
- No API changes.
- No queue/retry logic changes.
- No database changes.
- No Telegram service/bot changes.
- No route changes.
- No direct imports from `styles/runtime-overrides`.

## Test checklist
- Settings > Telegram
- Logs panel header and refresh button
- Stats cards
- Status/event/recipient filters
- Logs table
- Failed log inline guidance row
- Retry button
- Details modal
- Request/Tokens/Raw Response/Response JSON blocks
- Pagination
- Dark mode and light mode
- Widths 1366, 1280 and mobile
