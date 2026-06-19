# Stage 127 — PartnerDetail Telegram status colors

Requirement:
- `تلگرام لینک شده` must be green.
- `تلگرام لینک نشده` must be red.

Implemented:
- Replaced the header Telegram status chip with semantic status classes:
  - `partner-telegram-status-chip`
  - `partner-telegram-status-chip--linked`
  - `partner-telegram-status-chip--unlinked`
- Added scoped CSS:
  `styles/runtime-overrides/10zt-partner-telegram-status-colors.css`
