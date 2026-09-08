# Final release gate — Telegram outbound connectivity (2026-09-08)

## Findings

Direct Telegram connectivity fails on this host/network. Windows resolves api.telegram.org to private IPv4 10.10.34.36. Google DNS-over-HTTPS, queried through the existing working proxy, returned public IPv4 149.154.166.110. A direct IPv4 request pinned to that public address still timed out before TCP connection or TLS handshake. The same HTTPS hostname through the existing proxy completed TLS and returned302; authenticated production getMe and sendMessage returned200.

Thus there are two observed direct-path failures: incorrect/private system DNS resolution and failure to connect directly even with public DNS resolution. This is not explained by Node/undici, Bot credentials, IPv6 address preference, or certificate validation. The Bot uses node:http/https with explicit proxy agents, not undici's implicit proxy behavior. Direct IPv4 was tested independently using curl. The observations do not identify the exact blocking firewall/network device or prove a particular ISP policy; no such attribution is claimed. Windows proxy state determines whether the configured System transport can use the working outbound path.

## Optional deployment configuration

System transport already supports HTTPS_PROXY/ALL_PROXY/HTTP_PROXY and Windows proxy discovery. Added a Telegram-only option, KOUROSH_TELEGRAM_PROXY_URL, with first preference at process startup. Use it with the existing `system` Telegram transport mode. It accepts HTTP, HTTPS or SOCKS5 proxy URLs (or host:port for HTTP), contains no built-in endpoint, and is optional. Configure it privately in the API process environment; never commit an actual proxy credential. A newly configured environment must reach the API process on its next controlled startup. This variable is consumed only by Telegram transport; no Tunnel configuration or credentials changed.

Malformed explicit configuration fails before network access with TELEGRAM_PROXY_NOT_CONFIGURED and a sanitized explanatory message. Existing route diagnostics redact proxy credentials and preserve Bot token secrecy. TLS verification is unchanged. System mode retains existing fallback behavior; the existing Proxy mode remains available for strict proxy-only routing.

Real verification supplied the current Windows proxy URL to this variable in a separate diagnostic process only. Both production getMe and sendMessage succeeded with route=environment. The running production API was not restarted or assigned a hardcoded proxy. It continues using the restored Windows system proxy.

## Remaining real checks

Earlier actual /start and /menu commands remain proven at 07:20:40 and07:21:51 UTC for the canonical Admin+Partner account. Default Manager/dashboard flow is carried forward from user verification. Fresh /start and /menu after the latest network recovery are pending; getMe and outgoing sendMessage alone do not prove current update polling.

The user was instructed to tap the top three-dot button (تغییر فضای کاری), choose حساب همکار من, verify the Partner dashboard, choose مدیریت فروشگاه, verify Manager, then fully close/reopen to confirm Manager remains default. These real switching results are still pending. The implementation reauthenticates with an explicit requested workspace and replaces the current session; no canonical binding or role row is changed. Automated explicit-workspace authorization tests passed; that is not real-account verification.

Manager-only, Partner-only and Customer-only: UNVERIFIED — REAL ACCOUNT REQUIRED. No fake production users were created.

## Evidence and validation

- Targeted Telegram transport test passed, including direct fallback, optional environment precedence, credential redaction and invalid configuration rejection.
- All20 release checks passed; existing identity/permission/snapshot tests remain unchanged.
- Server typecheck remains blocked by previously reported errors outside the changed SystemTelegramTransport file. An isolated transport compile also reports the existing DirectTelegramTransport Uint8Array/BlobPart incompatibility at line152. These failures are disclosed, not counted as passing builds. No frontend/Worker code changed in this gate, so prior verified Cloudflare and HTTPS builds were not repeated.
- Signed runtime Manager snapshot generated2026-09-08T14:23:20.481Z, received14:23:24.162Z, authorized until15:23:20.481Z. Recurring refresh and snapshot sync remain operational.
- Production snapshot POST without a signature returned structured401; live-origin auth POST without initData returned structured401. No empty405 or1033.
- The previous proven one-API/one-polling-runtime architecture and healthy HTTPS reuse are preserved. No second poller was started by diagnostics (getUpdates was not called by the diagnostic process).
- Current Persian labels remain: live provenance → اتصال زنده برقرار است; snapshot provenance → اتصال زنده برقرار نیست; timestamp → آخرین همگام‌سازی from receivedAt, generatedAt fallback. No last-live timestamp was added.

## Cleanup and release decision

Repository history explicitly tracks dist-miniapp files, despite the user's pending ignore rule. Restored only the two generated tracked changes (miniapp.html and the previous hashed JS asset) to HEAD. Other generated build output stays ignored/uncommitted; deployed production was not altered. The user's .gitignore and unrelated database-backup checksum are untouched. No database files or user data were deleted.

Accounting assessment is unchanged: pre-existing reconciliation hits immutable-ledger protection, rolls back the repair transaction and does not prevent API/auth/snapshot startup. Financial dashboard correctness is not certified by these connectivity tests. Accounting data and guards were untouched.

Release remains pending fresh inbound Bot commands and real explicit workspace switching. Direct Telegram access requires a working outbound network route/proxy on this machine. No push, merge, additional Windows restart, new tunnel or credential rotation occurred.
