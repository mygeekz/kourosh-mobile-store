# Phase 37 — Telegram Manual Selector Consolidation — Pass 1

This phase performs a very small manual consolidation inside `styles/system/telegram-ui-foundation.css`.

## Scope

Only the `telegram-plain-field-heading` selector family was touched:

- `#telegram-settings-form .telegram-plain-field-heading`
- `#telegram-settings-form .telegram-plain-field-heading__icon`
- `.dark #telegram-settings-form .telegram-plain-field-heading__icon`

## Why this group was safe

The earlier rules were superseded later in the same file with the same specificity. Two unique declarations from the earlier rules were preserved by moving them into the final rule:

- `min-width: 0 !important` on the heading
- `flex: 0 0 26px !important` on the heading icon

The earlier dark icon rule was fully superseded by a later dark icon rule for the same selector, so it was removed.

## Result

| Metric | Value |
|---|---:|
| Removed blocks | 3 |
| Size delta | -864 bytes |
| Line delta | -23 lines |
| Missing CSS imports | 0 |
| Runtime imports in index | False |
| CSS parser errors | 0 |
| Literal `\n` CSS issues | 0 |
| Brace balance issues | 0 |

## Deliberately not changed

Other repeated Telegram selectors were not touched because their bodies represent multiple hotfix layers and need separate visual testing.
