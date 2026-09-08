# Telegram Mini App production verification — 2026-09-08

Production connectivity is restored. Automated identity checks pass. Final human Telegram workspace confirmation is pending; this is not a claim that four real Telegram accounts have been exercised.

## Root causes and repairs

1. The production Pages deployment did not serve the required Worker routes, although the preview did. Both POST endpoints returned empty 405 responses. Deploying the prepared artifact explicitly to project `kourosh`, branch `main` (Production), restored the routes. The build now always prepares `_worker.js`; project configuration names the actual Pages project.
2. The existing `kourosh-miniapp` tunnel had no active edge connections. QUIC connectivity failed; HTTP/2 connected successfully. The existing Windows `Cloudflared` service now runs with `--protocol http2 --edge-ip-version 4`, retains its original token file, and uses Automatic startup. The service was restarted successfully, then the temporary diagnostic connector was stopped. Public live API requests still succeed through the service alone. No credentials were rotated and no tunnel was created.
3. The local gateway was absent, and the API later stopped. Both existing entry points were restarted hidden. The route remains `live-miniapp.blackgem.ir` → `http://127.0.0.1:4180` → local API port 3001. The gateway uses its existing hostname restriction.
4. The Manager snapshot had expired while the Partner snapshot remained valid. With the live backend unavailable, this explained the reported Partner fallback. Restoring the backend allowed the actual local runtime to refresh Manager snapshots. No subject-key, authentication, schema or permission workaround was applied.
5. Additional regression fixes: Customer now precedes Partner in unknown-callback and ordinary-text fallback routing; explicit Partner callbacks retain authorization checks. Snapshot sync now requires an explicit JSON `success:true` response, preventing HTML/empty HTTP 200 responses from being recorded as successful sync. Rejection diagnostics include method, sanitized endpoint and response content type, without credentials or bodies.

## URL and deployment verification

- Public Mini App: `https://miniapp.blackgem.ir/miniapp.html` (Pages redirects to `/miniapp`, HTTP 200).
- Browser authentication: relative `/api/miniapp/auth`, therefore the production custom domain.
- Local runtime endpoint: `KOUROSH_MINIAPP_SNAPSHOT_SYNC_ENDPOINT` override, otherwise the origin of the saved Telegram Mini App public URL; the sync client sets `/cloud/v1/miniapp/snapshots`. Current resolved endpoint: `https://miniapp.blackgem.ir/cloud/v1/miniapp/snapshots`.
- Live origin: `https://live-miniapp.blackgem.ir/`; mode `stable_tunnel`.
- Production deployment: `10f1c5ea-a2a0-4202-bd9b-34c097ec2b53`, project `kourosh`, Production/main, Worker v363. URL: `https://10f1c5ea.kourosh-c5u.pages.dev`.
- Source `deployment/cloudflare-pages/_worker.js` and rebuilt `dist-miniapp/_worker.js` SHA256 both `AD5204B1A1BB6E3DFEA3580DBEC537A748921311996A45CDB6B9D550E721C0EA`.
- D1 binding `KOUROSH_EDGE_DB` is present. Production secret names `KOUROSH_EDGE_SESSION_KEY` and `KOUROSH_EDGE_SUBJECT_PEPPER` exist. Preview has no secrets; environment secret parity is not claimed.

## Production evidence

| Probe | Result |
| --- | --- |
| Production Mini App document, following redirect | HTTP 200; Worker release v363 |
| Production auth POST without initData | JSON 401 `MINIAPP_INIT_DATA_INVALID` |
| Production snapshot POST without signature | JSON 401 `MINIAPP_SNAPSHOT_SYNC_AUTH_INVALID`, not 405 |
| Live origin auth POST after temporary connector removal | Backend JSON 401, no 1033 or 502 |
| Actual signed local snapshot runtime uploads | `miniapp_snapshot_sync_succeeded`; confirmed by new D1 received timestamps |
| Active Manager snapshot, second automatic refresh | Generated 2026-09-08T06:45:43.421Z; received 06:45:47.383Z; authorized until 07:45:43.421Z |
| Existing tunnel Windows service | Running, Automatic, HTTP/2; service restart verified |

The unsigned probes prove routing and secure rejection, not successful Telegram authentication. Actual runtime success logs plus D1 receipts prove accepted signed snapshot writes. A full machine reboot was not performed.

## Executed tests

`node scripts/test-telegram-miniapp-release.mjs`: **17/17 passed**. Covers canonical Bot identity resolution through polling/webhook fixtures, commands `/start`, `/help`, `/menu`, `/restart`, menu/help buttons, Mini App entry, callback guards, Manager-only, Manager+Partner, Partner-only, Customer-only and mixed Customer cases. Includes staff/partner unlink, role downgrade, permission and transport regressions.

Worker integration tests use the actual Worker, signed requests and actual SQL schemas in memory, with a fixture Telegram public key substituted only in the in-memory test module. They cover Manager/staff, Partner and Customer workspaces, identity priority, subject-key parity and scope separation, snapshot upload, expired fallback, explicit expired/revoked Manager rejection, tampering and replay rejection. They do not use real Telegram accounts or send Bot messages.

Legacy authorization/staff fixtures were brought up to date with current audit/token/settings schema and effective-balance view. The linked-Partner test now uses the canonical relink operation. An obsolete prohibition of all CSS rules was removed; the existing no-`@apply` check remains.

`npm run build:miniapp:cloudflare`: passed (includes `build:miniapp` and Worker preparation). The font build warning is non-fatal; the font is present in output. `git diff --check`: passed. `npm test` has no configured script; the explicit release runner is the reproducible test entry point. Prior TypeScript ratchet checks showed 22 pre-existing baseline errors, so repository-wide type cleanliness is not claimed.

## Remaining verification and operational limits

- Fresh real Telegram launch confirmation is pending. The earlier Partner report predates the restored live backend and fresh Manager snapshot. No signed production initData was fabricated or exposed. All four identity cases passed automated fixtures, but all four have not been verified with real production Telegram sessions.
- Tunnel startup is persistent via the repaired Windows service. API and gateway were manually recovered; a full machine reboot and unattended application startup were not exercised. The repository's existing Windows startup coordinator launches the gateway after backend readiness. The local application must remain running for live requests and recurring snapshot refresh.
- API startup logged an existing legacy accounting reconciliation failure (`customer_ledger` immutable financial fields). Startup completed and sync works; accounting guards/data were not modified. This warning requires separate accounting investigation.
- No Git push was performed. Unrelated `.gitignore` and runtime backup checksum changes are excluded from the repair commit.
