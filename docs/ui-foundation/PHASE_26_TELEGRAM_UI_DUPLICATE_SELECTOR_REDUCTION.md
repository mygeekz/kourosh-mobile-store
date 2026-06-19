# Phase 26 — Telegram UI Duplicate Selector Reduction
Scope: `styles/system/telegram-ui-foundation.css` only.
This phase removes only top-level qualified CSS rules whose selector and declaration body are exactly identical after whitespace normalization. Rules with the same selector but different declarations were intentionally preserved because they may be part of the previous cascade/hotfix chain.
## Summary
- Removed duplicate rules: 9
- Size: 181,278 bytes → 180,071 bytes
- Lines: 5,833 → 5,809
- `!important`: 2,107 → 2,095
- Remaining exact duplicate groups in target file: 0

## Removed selectors
- `#telegram-settings-form .tg-apple-check-row__icon i` — removed rule index 418, first occurrence kept at 310.
- `#telegram-settings-form .telegram-template-mode-buttons` — removed rule index 1058, first occurrence kept at 1014.
- `.dark #telegram-settings-form .telegram-studio-mini-card__icon` — removed rule index 1186, first occurrence kept at 1158.
- `.dark #telegram-settings-form .telegram-studio-mini-card__meta` — removed rule index 1190, first occurrence kept at 1162.
- `.dark #telegram-settings-form .telegram-studio-mini-card__value` — removed rule index 1194, first occurrence kept at 1166.
- `.dark #telegram-settings-form .telegram-studio-mini-card__desc` — removed rule index 1198, first occurrence kept at 1170.
- `.dark #telegram-settings-form .telegram-monitor-v2-action__label` — removed rule index 1274, first occurrence kept at 1246.
- `.dark #telegram-settings-form .telegram-monitor-v2-action__value` — removed rule index 1278, first occurrence kept at 1250.
- `#telegram-settings-form .tg-apple-setup-card__head, #telegram-settings-form .tg-apple-setup-card__body, #telegram-settings-form .telegram-monitor-v2-action__top, #telegram-settings-form .telegram-monitor-v2-action__copy` — removed rule index 1366, first occurrence kept at 1318.

## Safety notes
- No JSX, API, routing, Telegram service, queue, database, or business logic was changed.
- No cross-file deduplication was attempted.
- Rules with same selector but different body were not modified.
