# Mini App Phase 2 — v250 Availability Semantics

Date: 2026-08-29
Source: v249 Phase 1 release-identity baseline
Output release: v250

## Objective
Separate live connectivity from snapshot freshness so a recent Cloudflare snapshot can never be presented as proof that the Local Kourosh store is online.

## Root cause verified in v249
`miniapp/reference/miniAppConnectivity.ts` treated snapshots generated within a seven-minute grace window as `online`. `miniapp/reference/miniAppDataAvailability.ts` then rendered those responses as `فروشگاه آنلاین است` with an `اطلاعات همگام‌شده` badge. This conflated two independent facts:

- whether the current request reached the live Local Kourosh origin; and
- how recently the fallback snapshot was generated.

## v250 semantic contract

### Connectivity
- `live` response => live connection is established.
- `snapshot` response => live connection is not established for that response.
- snapshot age never changes connectivity to live.
- `recovering` remains part of the connectivity type for a later transitional-state phase; v250 does not infer it without evidence.

### Data source
- `live`
- `snapshot`

### Snapshot freshness
- `fresh`: <= 15 minutes
- `stale`: > 15 minutes and <= 24 hours
- `very_stale`: > 24 hours
- `unknown`: missing/invalid timestamp or timestamp materially in the future

Freshness changes only the snapshot warning level; it never changes the connectivity state.

## UI behavior

### Live
- Title: `اتصال زنده برقرار است`
- Badge: `اطلاعات زنده`
- Live/green treatment remains reserved for actual live responses.

### Snapshot — fresh
- Title: `اتصال زنده برقرار نیست`
- Badge: `اطلاعات همگام‌شده`
- Warning/orange treatment.
- Detail includes relative age and last synchronization timestamp.

### Snapshot — stale
- Title: `اتصال زنده برقرار نیست`
- Badge: `اطلاعات با تأخیر`
- Warning/orange treatment.

### Snapshot — very stale
- Title: `اتصال زنده برقرار نیست`
- Badge: `اطلاعات قدیمی`
- Danger/red treatment.

### Unknown pending partner state
The fallback label is now `وضعیت اتصال`; it no longer claims `فروشگاه آنلاین` before availability metadata exists.

## Staff behavior
Staff remains live-only. No staff snapshot was added. The Edge error message for `MINIAPP_STAFF_OFFLINE_UNAVAILABLE` is now explicit:

`اتصال زنده به فروشگاه برقرار نیست. دسترسی مدیریتی فقط هنگام اتصال زنده فعال است.`

The Mini App bootstrap title also recognizes the same code if surfaced.

## Files changed
- `KOUROSH_SOURCE_VERSION`
- `miniapp.html` (release marker only)
- `deployment/cloudflare-pages/_worker.js`
- `miniapp/App.tsx`
- `miniapp/reference/miniAppConnectivity.ts`
- `miniapp/reference/miniAppDataAvailability.ts`
- `miniapp/components/MiniAppDataAvailabilityStatus.tsx`
- `miniapp/components/premium/PartnerCompactHeader.tsx`
- `miniapp/pages/PartnerHome.tsx`
- `miniapp/pages/PartnerAccount.tsx`
- `package.json`
- new v250 regression/audit scripts

No identity schema, snapshot schema/payload, financial/business logic, Telegram Bot behavior, or staff snapshot capability was changed.

## Verification actually executed

`npm run test:v250` — PASS

The v250 gate includes and passed:
- release synchronization / v250 release audit
- stale Cloudflare build rejection
- v248 identity-sync regression
- snapshot runtime regression
- offline Edge snapshot fallback regression
- style manifest audit
- v250 connectivity semantics
- v250 live-state / gateway regression
- Cloudflare Edge v167 regression suite
- Mini App live-refresh v235 regression

Observed Edge test logs report `edgeVersion: v250`.

## Environment limitation
The supplied source does not contain `node_modules`. Therefore Vite production build/typecheck is not claimed as executed in this environment. The pure-Node/source-level test gate above was executed successfully.

## Deferred by roadmap
The following are intentionally not part of Phase 2:
- identity transitional sync/retry states (Phase 3 / v251)
- Mini App Diagnostic Center (Phase 4 / v252)
- preserving last availability while a primary request refreshes / unified Availability ViewModel (Phase 5 / v253)
- Telegram fullscreen/accessibility/RTL cleanup (Phase 6 / v254)

## Next roadmap phase
Phase 3 / v251: harden identity synchronization with explicit pending/ready/failure state and bounded retry without rolling back a successful local identity link.
