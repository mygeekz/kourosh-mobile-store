import assert from "node:assert/strict";
import fs from "node:fs";
import { KOUROSH_RELEASE } from "./lib/kourosh-release.mjs";
import { resolveMiniAppStoreConnectivity } from "../miniapp/reference/miniAppConnectivity.ts";

assert.ok(Number(KOUROSH_RELEASE.slice(1)) >= 250, `expected v250 or a compatible successor; found ${KOUROSH_RELEASE}`);
assert.equal(resolveMiniAppStoreConnectivity("live"), "live");
assert.equal(resolveMiniAppStoreConnectivity("snapshot"), "offline");
assert.equal(resolveMiniAppStoreConnectivity(null), "unknown");
assert.equal(resolveMiniAppStoreConnectivity(undefined), "unknown");

const connectivity = fs.readFileSync("miniapp/reference/miniAppConnectivity.ts", "utf8");
const availability = fs.readFileSync("miniapp/reference/miniAppDataAvailability.ts", "utf8");
const status = fs.readFileSync("miniapp/components/MiniAppDataAvailabilityStatus.tsx", "utf8");
const home = fs.readFileSync("miniapp/pages/PartnerHome.tsx", "utf8");
const account = fs.readFileSync("miniapp/pages/PartnerAccount.tsx", "utf8");
const compactHeader = fs.readFileSync("miniapp/components/premium/PartnerCompactHeader.tsx", "utf8");
const partnerPage = fs.readFileSync("miniapp/components/partner/PartnerUI.tsx", "utf8");
const availabilityViewModel = fs.readFileSync("miniapp/dataAvailability/useMiniAppAvailabilityViewModel.ts", "utf8");
const app = fs.readFileSync("miniapp/App.tsx", "utf8");
const worker = fs.readFileSync("deployment/cloudflare-pages/_worker.js", "utf8");

assert.doesNotMatch(connectivity, /ONLINE_GRACE|7 \* 60 \* 1000/);
assert.match(connectivity, /source === "snapshot"\) return "offline"/);
assert.match(availability, /connectivity:\s*MiniAppStoreConnectivity/);
assert.match(availability, /source:\s*MiniAppDataSource/);
assert.match(availability, /title:\s*"اتصال زنده برقرار است"/);
assert.match(availability, /title:\s*"اتصال زنده برقرار نیست"/);
assert.match(availability, /badge:\s*freshness === "fresh" \? "اطلاعات همگام‌شده" : "اطلاعات ذخیره‌شده"/);
assert.match(availability, /اطلاعات با تأخیر/);
assert.match(availability, /اطلاعات قدیمی/);
assert.match(availability, /آخرین همگام‌سازی/);
assert.match(availability, /formatRelativeSnapshotAge/);
assert.doesNotMatch(availability, /tone:\s*"synced"/);
assert.doesNotMatch(availability, /title:\s*"فروشگاه آنلاین است"/);

assert.match(availabilityViewModel, /isMiniAppAvailabilityLiveTone/);
for (const source of [status, home, account, compactHeader, partnerPage, availabilityViewModel]) {
  assert.doesNotMatch(source, /isMiniAppAvailabilityOnlineTone/);
}
assert.match(status, /useMiniAppAvailabilityViewModel/);
assert.match(compactHeader, /useMiniAppAvailabilityViewModel/);
assert.match(compactHeader, /availabilityView \? availabilityView\.title : "وضعیت اتصال"/);
assert.match(home, /<PartnerPage/);
assert.match(account, /<PartnerPage/);
assert.match(partnerPage, /<MiniAppDataAvailabilityStatus\s*\/>/);
assert.match(status, /const view = availability\.presentation!/);
assert.match(status, /\{view\.title\}/);
assert.match(worker, /MINIAPP_STAFF_OFFLINE_UNAVAILABLE/);
assert.match(worker, /دسترسی مدیریتی فقط هنگام اتصال زنده فعال است/);
assert.match(app, /MINIAPP_STAFF_OFFLINE_UNAVAILABLE/);
assert.match(app, /اتصال زنده فروشگاه برقرار نیست/);

console.log(JSON.stringify({
  status: "PASS",
  release: KOUROSH_RELEASE,
  liveResponseConnectivity: "live",
  freshSnapshotConnectivity: "offline",
  staleSnapshotConnectivity: "offline",
  freshnessSeparatedFromConnectivity: true,
  partnerLiveColorReservedForLiveResponses: true,
  staffLiveOnlyMessageExplicit: true,
}, null, 2));
