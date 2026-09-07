# Mini App deployment verification — 2026-09-07

Production Pages routing is restored. Manager login is not yet verified: the live tunnel is unavailable and the Manager snapshot is expired.

## URL resolution

- Browser bundle uses relative `/api/miniapp/auth`, so a launch at `https://miniapp.blackgem.ir/miniapp.html` authenticates against `https://miniapp.blackgem.ir/api/miniapp/auth`.
- Snapshot sync runs in the local server, not in the browser bundle. `resolveMiniAppSnapshotRuntimeConfig` uses `KOUROSH_MINIAPP_SNAPSHOT_SYNC_ENDPOINT` when set, otherwise the origin of `telegram_miniapp_public_url`. `validateEndpoint` fixes the path to `/cloud/v1/miniapp/snapshots`.
- Current database settings: public URL `https://miniapp.blackgem.ir/miniapp.html`; live origin `https://live-miniapp.blackgem.ir/`; mode `stable_tunnel`.
- No endpoint override was found in this shell or the checked project environment files. These resolve to `https://miniapp.blackgem.ir/cloud/v1/miniapp/snapshots`. An already-running server's inherited environment was not inspected.

## Deployment evidence

- Actual Pages project: `kourosh`, serving `miniapp.blackgem.ir` and `edge-miniapp.blackgem.ir`.
- Previous production: `36e37b43-d3e8-4c89-a3ed-d913316e35f8`, branch `main`.
- Preview: `59be763c-8ba4-4eec-8381-7da3aa7d9a5a`, branch `fix/telegram-manager-identity`. Uploading this preview did not update the production domain.
- New production: `10f1c5ea-a2a0-4202-bd9b-34c097ec2b53`, branch `main`, Worker release `v363`. Wrangler explicitly reported compiling and uploading the Worker bundle, and deployment metadata confirms `Production`.
- `npm run build:miniapp:cloudflare` passed. `dist-miniapp/_worker.js` is byte-for-byte identical to `deployment/cloudflare-pages/_worker.js`.
- Wrangler configuration was corrected to the actual project name. Standard Mini App builds now also prepare the Worker so a subsequent upload cannot inadvertently omit it.
- Downloaded Pages config confirms the same compatibility settings, four ordinary environment variables and D1 binding in Preview and Production. Binding: `KOUROSH_EDGE_DB`; database ID `cf2beae0-5b77-47ac-a604-e10691ed7ef7`.
- Production has secret names `KOUROSH_EDGE_SESSION_KEY` and `KOUROSH_EDGE_SUBJECT_PEPPER`. Preview has no secrets. Secret values were not read or changed; equality of values was not asserted.

## Live checks

Before deployment, curl POSTs to both production sync and authentication returned empty HTTP 405 responses, without the Worker's JSON envelope.

After deployment:

| Check | Result |
| --- | --- |
| POST production `/cloud/v1/miniapp/snapshots`, empty JSON without credentials | HTTP 401, `MINIAPP_SNAPSHOT_SYNC_AUTH_INVALID`, release v363 |
| POST production `/api/miniapp/auth`, empty JSON | HTTP 401, `MINIAPP_INIT_DATA_INVALID`, release v363 |
| Signed connector diagnostics against production | HTTP 200 for Manager and Partner; authenticated D1 lookup succeeds |
| D1 schema/tenant inspection | All snapshot tables present; active tenant matches configured production host and live origin |
| Real Telegram launch, reported by user | Mini App opens but selects Partner |

The HTTP 401 probes establish correct routing and secure rejection, not successful Telegram authentication or a successful snapshot upload. Signed diagnostics establish the credential/tenant/D1 read path, not snapshot mutation.

## Remaining live-backend blocker

- Manager snapshot found through authenticated diagnostics: generated `2026-09-06T15:57:58.985Z`, authorization expired `2026-09-06T16:57:58.985Z`.
- Partner snapshot remains authorized until `2026-09-10T07:38:14.409Z`.
- Local API port 3001 was healthy. Gateway port 4180 was absent. Started the existing `scripts/serve-miniapp-gateway.mjs` hidden, using the saved runtime configuration restricted to `live-miniapp.blackgem.ir` and the existing local API. Local gateway POST now returns the expected JSON 401.
- Gateway PID at launch: 11900. Output logs: `%TEMP%/kourosh-pages-routing-audit/gateway.stdout.log` and `gateway.stderr.log`. This manual recovery does not establish reboot persistence.
- Public live origin remained unavailable: initially HTTP 502, subsequently HTTP 530 / Cloudflare error 1033. Thus an expired Manager snapshot plus a valid Partner snapshot explains the observed offline fallback without proving an identity-resolution defect.
- Automatic approval review rejected reading the tunnel token and Wrangler OAuth files for direct API inspection because that credential access was not specifically authorized. No workaround was attempted. Further tunnel inspection using these credentials requires explicit user approval.
- No identity or Worker authentication changes were made during this deployment phase. Earlier uncommitted application/test changes remain separate and require their own review/commit.

## Required completion checks

1. Restore the named tunnel connection and verify the public live origin reaches the healthy gateway/API.
2. Refresh snapshots through the running authorized server and verify fresh receipt/authorization times in D1.
3. Reopen Telegram Mini App with fresh initData and verify Manager workspace for the bound Admin account.
4. Verify gateway/tunnel startup persistence; the manual gateway launch alone is not a permanent startup fix.
