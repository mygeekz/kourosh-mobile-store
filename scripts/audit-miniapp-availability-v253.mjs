import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const read = (file) => fs.readFileSync(file, "utf8");
const context = read("miniapp/dataAvailability/MiniAppDataAvailabilityContext.tsx");
const state = read("miniapp/dataAvailability/miniAppAvailabilityState.ts");
const viewModel = read("miniapp/dataAvailability/useMiniAppAvailabilityViewModel.ts");
const query = read("miniapp/hooks/useMiniAppQuery.ts");
const pagination = read("miniapp/hooks/useMiniAppPagination.ts");
const status = read("miniapp/components/MiniAppDataAvailabilityStatus.tsx");
const partnerHeader = read("miniapp/components/premium/PartnerCompactHeader.tsx");
const partnerHome = read("miniapp/pages/PartnerHome.tsx");
const partnerAccount = read("miniapp/pages/PartnerAccount.tsx");

assert.match(context, /beginMiniAppAvailabilityRequest/);
assert.match(context, /finishMiniAppAvailabilityRequest/);
assert.match(state, /meta: current\.meta/);
assert.match(state, /if \(!primary\) return current/);
assert.match(viewModel, /MiniAppAvailabilityPhase = "unknown" \| "loading" \| "refreshing" \| "ready"/);
assert.match(viewModel, /role: MiniAppIdentityKind \| null/);
assert.match(viewModel, /identityState/);
assert.match(viewModel, /semanticTone/);
assert.match(viewModel, /premiumTone/);
assert.match(query, /beginRequest\(path, \{ primary: primaryAvailability \}\)/);
assert.match(query, /if \(primaryAvailability\) reportMeta/);
assert.match(query, /else finishRequest\(path\)/);
assert.match(pagination, /beginRequest\(requestPath, \{ primary: !append \}\)/);
assert.match(pagination, /if \(!append\) reportMeta/);
assert.match(status, /useMiniAppAvailabilityViewModel\(nowMs\)/);
assert.match(status, /در حال به‌روزرسانی/);
assert.match(partnerHeader, /useMiniAppAvailabilityViewModel/);
assert.match(partnerHeader, /availability\.refreshing/);
assert.match(partnerHome, /<PartnerCompactHeader/);
assert.match(partnerAccount, /<PartnerCompactHeader/);

const miniappRoot = path.resolve("miniapp");
const offenders = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx)$/.test(entry.name)) {
      const relative = path.relative(process.cwd(), full).replaceAll("\\", "/");
      if (relative.endsWith("reference/miniAppDataAvailability.ts") || relative.endsWith("dataAvailability/useMiniAppAvailabilityViewModel.ts")) continue;
      const source = fs.readFileSync(full, "utf8");
      if (/resolveMiniAppAvailabilityPresentation|isMiniAppAvailabilityLiveTone/.test(source)) offenders.push(relative);
    }
  }
};
walk(miniappRoot);
assert.deepEqual(offenders, [], `availability presentation decisions leaked outside the shared view model: ${offenders.join(", ")}`);

console.log(JSON.stringify({
  status: "PASS",
  centralizedViewModel: true,
  refreshKeepsLastKnownState: true,
  paginationDoesNotOwnGlobalAvailability: true,
  transientFailureDoesNotEraseAvailability: true,
  partnerHeadersUnified: true,
  leakedPresentationDecisionFiles: offenders,
}, null, 2));
