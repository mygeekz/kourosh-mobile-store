# Stage 63 — Technical token bidi sweep

## Purpose
Stabilize mixed Persian/English/number values across RTL UI, especially technical values:
IMEI, System ID, URL, username, phone numbers, tokens, tracking codes, serials and exported identifiers.

## Changes
- Extended `styles/runtime-overrides/10i-bidi-text-contract.css`.
- Added broad but safe selectors for common technical-value class/name/data patterns.
- Added explicit LTR token behavior for URL, tel, email, token and username inputs.
- Added `ux-ltr-token` / `ux-code-token` to local-domain and telegram technical inputs.

## Safety
- No API logic changed.
- No state ownership changed.
- No business logic changed.
- CSS-only + small className-only adjustments.
