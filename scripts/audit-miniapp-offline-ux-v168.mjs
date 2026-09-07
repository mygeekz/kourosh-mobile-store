import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const apiClient = read("miniapp/apiClient.ts");
const availabilityRef = read("miniapp/reference/miniAppDataAvailability.ts");
const availabilityContext = read("miniapp/dataAvailability/MiniAppDataAvailabilityContext.tsx");
const statusComponent = read("miniapp/components/MiniAppDataAvailabilityStatus.tsx");
const shell = read("miniapp/components/MiniAppShell.tsx");
const index = read("miniapp/index.tsx");
const auth = read("miniapp/auth/MiniAppAuthContext.tsx");
const query = read("miniapp/hooks/useMiniAppQuery.ts");
const worker = read("deployment/cloudflare-pages/_worker.js");
const customerHome = read("miniapp/pages/CustomerHome.tsx");
const customerInstallments = read("miniapp/pages/CustomerInstallments.tsx");
const partnerHome = read("miniapp/pages/PartnerHome.tsx");
const dataState = read("miniapp/components/MiniAppDataState.tsx");

assert.match(apiClient, /x-kourosh-data-source/i);
assert.match(apiClient, /x-kourosh-snapshot-generated-at/i);
assert.match(apiClient, /x-kourosh-snapshot-received-at/i);
assert.match(apiClient, /x-kourosh-snapshot-version/i);

assert.match(availabilityRef, /freshMs:\s*15 \* 60 \* 1000/);
assert.match(availabilityRef, /staleMs:\s*24 \* 60 \* 60 \* 1000/);
assert.match(availabilityRef, /فروشگاه آنلاین/);
assert.match(availabilityRef, /اطلاعات زنده/);
assert.match(availabilityRef, /title:\s*"فروشگاه آنلاین است"/);
assert.match(availabilityRef, /title:\s*"فروشگاه آفلاین است"/);
assert.match(availabilityRef, /اطلاعات همگام‌شده/);
assert.match(availabilityRef, /اطلاعات با تأخیر/);
assert.match(availabilityRef, /اطلاعات قدیمی/);
assert.match(availabilityRef, /formatIsoToShamsiDateTime/);

assert.match(availabilityContext, /beginRequest/);
assert.match(availabilityContext, /reportMeta/);
assert.match(query, /reportMeta\(path, result\.meta\)/);
assert.match(auth, /reportMeta\("\/api\/miniapp\/auth", authResult\.meta\)/);
assert.match(index, /MiniAppDataAvailabilityProvider/);
assert.match(shell, /MiniAppDataAvailabilityStatus/);

assert.match(worker, /offlineSnapshot = snapshot/);
assert.match(worker, /snapshotHeaders\(offlineSnapshot\)/);
assert.match(worker, /"X-Kourosh-Snapshot-Generated-At"/);
assert.match(worker, /"X-Kourosh-Snapshot-Received-At"/);

for (const source of [availabilityRef, availabilityContext, statusComponent]) {
  assert.doesNotMatch(source, /style\s*=\s*\{/);
  assert.doesNotMatch(source, /import\s+["'][^"']+\.css["']/);
}
assert.match(statusComponent, /MINIAPP_DATA_AVAILABILITY_REFERENCE/);
assert.doesNotMatch(customerHome, /خلاصه به.?روز|خلاصه.*واقعی/);
assert.doesNotMatch(customerInstallments, /وضعیت واقعی/);
assert.doesNotMatch(partnerHome, /خلاصه.*واقعی/);
assert.doesNotMatch(dataState, /اطلاعات واقعی/);
assert.match(availabilityRef, /text-success|text-warning|text-danger/);

console.log("PASS audit-miniapp-offline-ux-v168");
