Kourosh Telegram Mini App gateway — deployment profile

The gateway is provider-neutral and terminates no public TLS. Keep both the
Kourosh backend and this gateway on loopback. A public reverse proxy or tunnel
must terminate valid HTTPS and forward only to the gateway.

Required runtime settings (example values only):

  KOUROSH_API_BIND_HOST=127.0.0.1
  KOUROSH_MINIAPP_GATEWAY_HOST=127.0.0.1
  KOUROSH_MINIAPP_GATEWAY_PORT=4180
  KOUROSH_MINIAPP_PUBLIC_HOST=miniapp.example.com
  KOUROSH_MINIAPP_EXTERNAL_PROTO=https
  KOUROSH_BACKEND_INSTANCE_COUNT=1
  KOUROSH_MINIAPP_MEMORY_SESSIONS_ACK=1

For Cloudflare Tunnel only, also set:

  KOUROSH_MINIAPP_TRUSTED_EDGE=cloudflare

This mode accepts CF-Connecting-IP only from a loopback peer and converts it to
the canonical X-Forwarded-For header. Never expose port 4180 publicly and never
put a tunnel token, credentials JSON, Bot token, certificate private key, or
.env file in the project.

Build and audit:

  npm run build:miniapp
  npm run audit:miniapp-production-readiness
  npm run serve:miniapp-gateway

Cloudflare Tunnel is an external deployment dependency. Install and authenticate
cloudflared through the operator's managed environment. Do not add it to npm.
Configure the public hostname to forward to http://127.0.0.1:4180 and use a
catch-all 404 ingress rule. No public port-forwarding is required.

BotFather Main Mini App cannot be verified by this source audit. After the
gateway is reachable over valid HTTPS, set the same public URL in Kourosh,
verify the Bot Menu Button, and manually set BotFather Main Mini App to that URL.

Restart behavior: all Mini App sessions are intentionally in-memory and are
revoked on restart. Users must reopen the Mini App. Multi-instance deployment
is rejected until a separately reviewed shared session store exists.
