import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const apiClient = read("miniapp/apiClient.ts");
const pagination = read("miniapp/hooks/useMiniAppPagination.ts");
const staffSearch = read("miniapp/pages/StaffSearch.tsx");

assert.match(
  apiClient,
  /Promise<MiniAppApiResult<T>>/,
  "fetchMiniAppData must keep the { data, meta } response envelope contract.",
);

assert.match(
  pagination,
  /const result = await fetchMiniAppData<TData>\(requestPath\);/,
  "Pagination must receive the MiniApp API result envelope.",
);
assert.match(
  pagination,
  /const data = result\.data;/,
  "Pagination must unwrap result.data before reading page/items fields.",
);
assert.match(
  pagination,
  /reportMeta\(requestPath, result\.meta\);/,
  "Pagination must forward Live/Snapshot provenance metadata.",
);
assert.doesNotMatch(
  pagination,
  /const data = await fetchMiniAppData<TData>/,
  "Pagination must not treat MiniAppApiResult as the page DTO.",
);
assert.match(
  pagination,
  /Array\.isArray\(data\.items\)/,
  "Pagination must fail gracefully on malformed list payloads instead of crashing React render.",
);

assert.match(
  staffSearch,
  /\.then\(\(result\) => \{/,
  "Staff search must consume the MiniApp API result envelope.",
);
assert.match(
  staffSearch,
  /data: result\.data/,
  "Staff search must store result.data, not the result envelope.",
);
assert.match(
  staffSearch,
  /reportMeta\(requestPath, result\.meta\);/,
  "Staff search must forward Live/Snapshot provenance metadata.",
);
assert.doesNotMatch(
  staffSearch,
  /\.then\(\(data\) => setState\(\{ data,/,
  "Staff search must not treat MiniAppApiResult as StaffSearchData.",
);

const miniappRoot = path.join(root, "miniapp");
const consumers = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(absolute);
    else if (/\.(?:ts|tsx)$/.test(entry.name)) {
      const source = fs.readFileSync(absolute, "utf8");
      if (source.includes("fetchMiniAppData<")) consumers.push(path.relative(root, absolute).replaceAll("\\", "/"));
    }
  }
};
walk(miniappRoot);

assert.deepEqual(
  consumers.sort(),
  [
    "miniapp/hooks/useMiniAppPagination.ts",
    "miniapp/hooks/useMiniAppQuery.ts",
    "miniapp/pages/StaffSearch.tsx",
  ].sort(),
  "Every direct fetchMiniAppData consumer must be reviewed for the { data, meta } envelope contract.",
);

console.log("Mini App API result-envelope audit passed (query, pagination and staff search unwrap data/meta correctly). ");
