# Final continuation report — 2026-09-08

Release is not fully approved: current Telegram network connectivity has regressed, and three real account types remain unavailable. No push, merge, additional reboot, credential rotation or new tunnel was performed.

## Manual changes and runtime repair

`package.json` parses successfully and contains exactly one `server:runtime:ensure` key. Comparison with HEAD found only the intended changes: add `server:runtime:ensure` and replace `server:runtime` with it inside `serve:https`. No other scripts or package sections changed. `server:runtime` remains `tsx server/index.ts`.

The manual helper accepted any JSON object containing success, code or message, including unrelated services. It also spawned npm.cmd directly, a Windows subprocess hazard. The reconciled helper now requires HTTP 401, JSON, success:false, code MINIAPP_INIT_DATA_INVALID and a nonempty requestId. An unknown or unresponsive service fails safely. A free port launches the equivalent Node/tsx runtime directly. Reuse stays alive, checks health, tolerates two transient failures, and never kills the externally owned API. It uses natural process completion, without process.exit().

The actual `npm run server:runtime:ensure` reused the API successfully. The foreground HTTPS stack was then stopped after proving its process tree excluded the production API and gateway. Actual `start_https.bat` completed certificate bootstrap, PWA build and HTTPS startup. The original production API PID 11260 and gateway PID 8504 were preserved. The new PWA/redirect stack stays running. No EADDRINUSE or UV_HANDLE_CLOSING occurred.

Trusted-CA Node verification of `https://kourosh.home.arpa:5173/` returned HTTP 200 with socket authorization true. `test:local-pwa-https-runtime` passed chain verification, IP SAN, shell, manifest, service-worker headers and strict asset 404. HTTP redirect returned 308 to the configured HTTPS domain. Default Schannel curl could not perform the private CA revocation check; no TLS validation was disabled. The project CA was explicitly used for independent chain/hostname verification.

## Post-reboot evidence

| Requirement | Result | Evidence |
| --- | --- | --- |
| Real restart | PASS | Boot moved from 2026-09-07T08:47:33.5000000Z to 2026-09-08T07:05:21.5000000Z |
| API autostart | PASS | Already listening before intervention; PID11260 created 07:09:12 UTC, startup log path populated |
| Gateway autostart | PASS | Already listening before intervention; PID8504 created 07:11:44 UTC; same startup parent PID7080 |
| Tunnel autostart | PASS | Existing Cloudflared Automatic service, PID5884; registry retains HTTP/2/token-file configuration; metrics show four active connections |
| Bot polling autostart | PASS | Post-reboot polling activity and actual inbox commands at 07:20:40 and 07:21:51 UTC |
| Current Bot connectivity | FAIL | Later system proxy disabled, no local proxy listener; direct Telegram connection times out, polling route probes fail |
| Duplicate polling | PASS for local process check | Exactly one API process; no getUpdates conflict diagnostic. Numeric 409 matches were a failure counter/snapshot metadata, not HTTP409 |
| Snapshot runtime autostart | PASS | Automatic signed uploads after boot and recurring reconciliation; no manual API restart |
| Production Worker routing | PASS | Structured JSON401 for unsigned auth/sync, document200, no empty405/1033 |
| Snapshot sync | PASS | Actual signed runtime receipts in D1; intermittent timeout/retry events also observed |
| D1 Manager refresh | PASS | First postboot generated07:12:12 UTC; later generated13:57:31.457Z, received13:57:34.705Z, authorized until14:57:31.457Z |

The startup-result JSON itself remained from before reboot; it is not used as proof of automatic startup. Live process creation, shared startup parent, new log paths, initial listener capture and postboot runtime activity are the evidence. No claim is made for unattended pre-login API startup: the application launcher runs at Windows login, while the tunnel is a Windows service.

## Actual Telegram coverage

The user reported correct /start and /menu responses, a fully opened Mini App and a successfully loaded dashboard. Database inbox rows contain these exact commands after reboot. Joining their sender to user_telegram_links/users/roles gives Admin; the same sender also has one Partner binding. This proves the tested account is Admin+Partner, not Manager-only. No identifiers, tokens or initData are included here.

| Real case | Result |
| --- | --- |
| /start | PASS — user report plus postboot inbox |
| /menu | PASS — user report plus postboot inbox |
| Mini App dashboard | PASS — user report |
| Manager-only | UNVERIFIED — REAL ACCOUNT REQUIRED |
| Manager+Partner | PASS for reported default Bot/Mini App flow on the canonically classified account; explicit Partner switching/denial tests are not separately user-verified |
| Partner-only | UNVERIFIED — REAL ACCOUNT REQUIRED |
| Customer-only | UNVERIFIED — REAL ACCOUNT REQUIRED; no Customer production snapshot found |

Postboot getMe returned200 for the expected Bot. A single authorized sendMessage delivery probe to the sole bound Admin returned200/success. Current route failure must not be hidden by those earlier successes. The user has been asked to restore their usual Telegram-capable network route and send /menu again; network settings were not overwritten.

## Online status and timestamp semantics

A production backend can correctly be live with the desktop/PWA window closed. The background API, gateway and tunnel provide that path. Desktop window state is not the heartbeat.

A genuine UI bug was found in `miniapp/reference/miniAppConnectivity.ts`: snapshot source returned live. `miniAppDataAvailability.ts` also said فروشگاه آنلاین است for every snapshot freshness, including very stale. These now report offline live-connectivity / اتصال زنده برقرار نیست while retaining snapshot availability and freshness. Only live response provenance yields اتصال زنده برقرار است. No auth, permission, precedence, subject key or snapshot lease changes were made.

Provenance is supplied by the Worker: `liveHeaders()` emits X-Kourosh-Data-Source:live after live response handling; auth success requires a successful upstream envelope and validated identity/session. `snapshotHeaders()` emits snapshot source plus generatedAt and receivedAt. `miniapp/apiClient.ts:readResponseMeta` parses these headers; the shared availability view model displays them. Snapshot freshness cannot establish live connectivity, and no desktop/tunnel timestamps are substituted.

The literal آخرین اتصال was not found in the current Mini App source. The timestamp actually rendered by this version is آخرین همگام‌سازی: `snapshotReceivedAt || snapshotGeneratedAt`, formatted as a Shamsi date/time. It is explicitly snapshot synchronization provenance, not a last successful live request. Snapshot age uses generatedAt. The Mini App does not maintain a separate last-live-connection timestamp. No fake timestamp was added.

The corrected artifact was deployed to Production/main in Pages project kourosh: https://83fc2ebe.kourosh-c5u.pages.dev . The custom domain returned /assets/miniapp-tQUD9IOW.js byte-for-byte identical to the built asset; Worker release v363 remained unchanged. Postdeploy unsigned snapshot and live-origin auth probes returned expected JSON401.

## Accounting assessment

Exact warning: `Legacy accounting reconciliation failed: SQLITE_CONSTRAINT: customer_ledger financial fields are immutable; use reversal + replacement`.

`server/db/migrations/dataRepair.ts:runPostSeedDataRepairs` catches the error from `runLegacyAccountingReconciliation` in `server/db/migrations/legacyAccountingReconciliation.ts`. The immutable trigger in `server/db/schema/audit.schema.ts` rejects financial/reference-field updates. Reconciliation rolls back its transaction on error; startup continues. These files are unchanged from pre-repair commit6407bc3. Authentication, Bot handling and snapshot publication ran despite the warning. Financial dashboard correctness is not certified by connectivity tests; the skipped reconciliation remains a separate accounting concern. No accounting data or guards were changed.

## Validation and changes

Targeted runtime-supervisor, connectivity-v250 and availability-state-v253 tests passed. The release runner includes them alongside the existing17 checks. Cloudflare Mini App build passed. Full PWA build and actual HTTPS runtime tests passed. Source/build Worker identity and custom-domain asset identity were verified.

Changed source: package.json; scripts/ensure-server-runtime.mjs; scripts/test-ensure-server-runtime.mjs; scripts/test-telegram-miniapp-release.mjs; miniapp/reference/miniAppConnectivity.ts; miniapp/reference/miniAppDataAvailability.ts; this report. Build-generated dist-miniapp differences, the user's .gitignore change and the unrelated backup checksum are excluded from the source commit.

Remaining blockers: restore current Telegram network route and recheck polling; real Manager-only, Partner-only and Customer-only accounts; explicit Partner switching/security coverage on the real mixed account; no separate proof of the displayed role text beyond the reported correct flow and canonical account classification. No broad production-ready claim is made.
