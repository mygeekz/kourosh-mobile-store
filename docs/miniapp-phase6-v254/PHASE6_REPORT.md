# Kourosh MiniApp Phase 6 — v254

## Scope
Phase 6 is limited to Telegram WebView/platform behavior, accessibility, RTL/bidirectional content, safe-area handling, and fullscreen policy.

No financial logic, database schema, snapshot payload, identity binding, diagnostic protocol, bot flow, or staff authorization logic was changed.

## Implemented
- Removed `maximum-scale=1` from MiniApp viewport metadata so browser/WebView zoom is not blocked.
- Kept Telegram `expand()` and `ready()` during bootstrap.
- Removed automatic `requestFullscreen()` from bootstrap.
- Added `requestTelegramFullscreenFromUserGesture()` as an explicit opt-in helper for a future page/action that genuinely needs fullscreen.
- Added Telegram `viewportHeight` / `viewportStableHeight` integration and `viewportChanged` refresh handling.
- Added four-sided safe-area tokens combining Telegram safe-area values with CSS `env(safe-area-inset-*)`.
- Added shared `miniapp-screen`, `miniapp-safe-inline`, and `miniapp-safe-page` platform primitives.
- Sticky headers and bottom docks now consume the shared safe-area tokens.
- Added visible focus treatment, reduced-motion behavior, and forced-colors focus fallback.
- Added `MiniAppBidiText` based on semantic `<bdi>` isolation for phone numbers, email, IMEI, invoice/reference identifiers, and similar LTR data.
- Mixed search fields use `dir="auto"`.
- Partner compact header no longer forces an LTR layout wrapper; DOM order and visual order now follow real RTL.
- Replaced physical `text-left` / `text-right` utilities inside MiniApp TS/TSX with logical `text-end` / `text-start`.
- Release markers synchronized to v254.

## Explicit non-goals
- No automatic fullscreen request was moved to a random page. No current MiniApp route requires fullscreen to function, so v254 stays expanded-standard by default.
- No business/data behavior was changed.
- No new third-party dependency was added.

## Remaining real-device QA
Physical Telegram Android/iOS/Desktop and zoom/reflow matrix testing remains a release-candidate activity because this execution environment does not provide real Telegram clients.
