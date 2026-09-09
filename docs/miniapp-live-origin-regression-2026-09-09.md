# Mini App live-origin regression — 2026-09-09

## Confirmed production failure

The real Admin + Partner launch selected Manager and rendered the dashboard,
but reported snapshot provenance and stale data. The sanitized production trace
at 06:59 UTC recorded `/api/miniapp/auth` returning HTTP 200 to the client while
`live_auth_unavailable` completed in 0 ms. Subsequent Manager dashboard reads
returned HTTP 200 after the same failed live reauthentication. No live read was
attempted because no local session token had been established.

The failing hop was the Pages Worker's `proxyLive()` fetch construction, before
the tunnel or gateway. It passed `redirect: "error"`, which workerd rejects:

> Invalid redirect value, must be one of "follow" or "manual"

The TypeError was caught as `network_error`. `authenticate()` selected an active
snapshot and sealed an edge session without a local session token.
`authenticatedRead()` retried auth, then reached `serveSnapshotRead()`.
Both responses therefore used `X-Kourosh-Data-Source: snapshot`. This provenance
is established by the executed Worker branches and the real UI observation;
the sanitized production tail does not capture response headers.

An isolated workerd/Miniflare reproduction rejected the original fetch option
before network I/O. Using `manual` instead reached the public live auth route and
returned HTTP 401 / `MINIAPP_INIT_DATA_INVALID` with an empty unsigned body.

## Repair

- `deployment/cloudflare-pages/_worker.js`: use supported manual redirect mode,
  reject 3xx explicitly without following Location, and log only allowlisted
  unavailable reasons and numeric status/duration.
- `scripts/test-miniapp-release-identity-e2e.mjs`: cover the Workers redirect
  contract, live auth/token establishment, dashboard reads, snapshot-session
  recovery, and fallback on network failure, timeout, 502 and redirects.
- `scripts/test-miniapp-live-state-v250.mjs`: verify safe reason logging and
  rejection of arbitrary error text.

No identity precedence, permission checks, subject hashing, snapshot leases,
authentication rules, tunnel configuration or credentials changed.
`KOUROSH_TELEGRAM_PROXY_URL` is referenced by Telegram transport only, not the
Mini App Worker/live proxy or gateway.

## Validation

- Release suite: 20/20 passed.
- Live-state/privacy diagnostic tests: passed.
- Real workerd unsigned live-origin probe: structured HTTP 401, passed.
- `npm run build:miniapp:cloudflare`: passed; generated Worker SHA-256 matched source.
- Production Pages deployment: https://030544e3.kourosh-c5u.pages.dev
- Custom-domain POST auth probe: structured HTTP 401; observed in the new
  deployment's sanitized tail, confirming custom-domain routing.
- Automated fallback regression: passed for unavailable backend, timeout, 502
  and redirects; expired/revoked authorization checks also passed.
- Fresh authenticated production validation after repair: at 07:12:11.884 UTC,
  `live_auth_success` reported HTTP 200 in 303 ms; at 07:12:12.451 UTC,
  `live_read_success` for `/api/miniapp/manager/dashboard` reported HTTP 200
  in 293 ms. Both client responses were HTTP 200. Auth success is emitted only
  after live identity validation and local session token establishment; read
  success requires the local token. Both branches return live provenance.
  No fallback was selected for this fresh login/dashboard pair.
- At 07:12:01 UTC, before that fresh login, a sales-summary request attempted
  reauthentication and received HTTP 401 in 346 ms. It was rejected, not served
  from snapshot. The sanitized trace does not capture its rejection body, so
  the exact 401 reason is not asserted.
- Post-repair visible connection-label confirmation: pending user response.

No production outage was induced for fallback testing. Automated fixtures are
not evidence that all four real Telegram account types passed. Nothing pushed
or merged.
