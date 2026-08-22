Kourosh Telegram Mini App gateway — stable production deployment profile

The gateway is provider-neutral and terminates no public TLS. Keep both the
Kourosh backend and this gateway on loopback. The production Mini App public
URL and the Store Live Origin are separate identities.

Canonical Telegram Mini App URL (example only):

  https://miniapp.example.com/miniapp.html

This is the stable URL configured once as Telegram Main Mini App in BotFather.
Kourosh also reconciles the Telegram Menu Button to this same canonical URL.
Windows restart, Kourosh restart, modem/public-IP changes and Named Tunnel
reconnects must not rotate this canonical URL.

Store Live Origin (example only):

  https://live-store.example.com/

The Live Origin is used only for Edge -> Store traffic and must route through a
stable provider/tunnel to:

  http://127.0.0.1:4180

Never route a public or tunnel origin directly to backend port 3001.

Required runtime boundaries (example values only):

  KOUROSH_API_BIND_HOST=127.0.0.1
  KOUROSH_MINIAPP_GATEWAY_HOST=127.0.0.1
  KOUROSH_MINIAPP_GATEWAY_PORT=4180
  KOUROSH_BACKEND_INSTANCE_COUNT=1
  KOUROSH_MINIAPP_MEMORY_SESSIONS_ACK=1

For a Cloudflare Named Tunnel, the generated ingress must expose only the
configured stable Live Origin hostname to http://127.0.0.1:4180 and end with a
catch-all 404 rule. Tunnel credentials stay outside the project Source ZIP.

Quick Tunnel (*.trycloudflare.com) is diagnostic/development only. It must not
be accepted as the Production canonical Telegram Mini App URL and must not
rewrite the Telegram default Menu Button or the one-time BotFather Main Mini App
configuration.

Telegram Main Mini App is configured manually in BotFather. The Bot API can
reconcile/read back the Menu Button, but Kourosh does not pretend to automate
BotFather Main Mini App configuration at every startup.

Build and audit:

  npm run build:miniapp
  npm run audit:miniapp-production-readiness
  npm run test:telegram-stable-url-v169
  npm run audit:telegram-stable-url-v169

No public port-forwarding is required. Never put a tunnel token, credentials
JSON, Bot token, certificate private key, .env file, runtime database, logs or
other generated secrets in the project or release ZIP.

Restart behavior: Local Kourosh remains independent of Cloud/Tunnel health.
Mini App live access may temporarily fall back to the approved read-only
snapshot layer, but the canonical Telegram URL itself remains unchanged.

Offline Snapshot production runtime:

  miniapp.example.com      -> Cloudflare Pages / Edge Worker / D1
  live-miniapp.example.com -> Named Tunnel -> http://127.0.0.1:4180

These two origins MUST be different. If the canonical Telegram URL points
straight to the Named Tunnel, shutting down the store also shuts down the
public Mini App and Edge Snapshot fallback cannot run.

When stable_tunnel mode is configured, Local Kourosh starts an optional,
outbound-only Snapshot runtime after the loopback listener is already ready.
It publishes only the approved Customer/Partner read DTO snapshots, never the
SQLite file. The first reconciliation is scheduled shortly after startup and
periodic reconciliation defaults to five minutes. Successful live Mini App
auth also requests a debounced refresh. Cloud/Edge failure never blocks Local
Kourosh.

Admin-only Local API helpers:

  GET  /api/settings/miniapp-snapshot/status
  GET  /api/settings/miniapp-snapshot/provisioning
  POST /api/settings/miniapp-snapshot/prepare
  POST /api/settings/miniapp-snapshot/refresh

The prepare endpoint creates/loads the local Ed25519 Connector credential and
returns only its PUBLIC key plus a D1 tenant_installations UPSERT statement.
The private key stays under the local Kourosh runtime directory and must never
be copied to Cloudflare or Source ZIPs.

After D1 schema/tenant provisioning and Edge deployment, a local refresh should
show state idle with failedSubjects=0. When the Live Origin is then unavailable,
Customer/Partner reads are served from D1 with X-Kourosh-Data-Source: snapshot
and Snapshot generated/received timestamps. The UI labels these values as saved
or delayed data and shows the last update time instead of calling them Live.
