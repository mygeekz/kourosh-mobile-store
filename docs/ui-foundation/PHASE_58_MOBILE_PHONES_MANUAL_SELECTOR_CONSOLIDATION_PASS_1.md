# PHASE 58 — Mobile Phones Manual Selector Consolidation — Pass 1

Scope: `styles/system/mobile-phones-foundation.css` only.

No JSX, API, database, sales, inventory, IMEI, pricing, reports, Telegram, routes, or business logic was changed.

## Target family

```css
.phone-addable-autocomplete
.phone-addable-autocomplete__menu
```

## Change

Two early scattered blocks for the autocomplete wrapper/menu were consolidated into the later canonical contract block. The effective declarations were preserved:

```css
.phone-addable-autocomplete {
  z-index: 2;
  isolation: isolate;
}

.phone-addable-autocomplete__menu {
  top: calc(100% + 0.5rem) !important;
  left: 0;
  right: 0;
  max-height: min(330px, 44vh);
  overflow-y: auto;
}
```

The open/focus z-index rule remained in its original place.

## Safety notes

- Media queries were not changed.
- Dark-mode selectors were not changed.
- Form layout, IMEI fields, pricing fields, tables, submit bar, and responsive rules were not changed.
- This is a selector-family consolidation only.

## QA

```json
{
  "css_files": 152,
  "textual_newline_issues": [],
  "brace_balance_issues": [],
  "css_import_count": 58,
  "missing_css_imports": [],
  "runtime_override_imports": []
}
```
