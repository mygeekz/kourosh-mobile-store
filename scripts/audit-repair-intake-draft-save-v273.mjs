#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = process.cwd();
const draftUtilPath = path.join(root, 'utils', 'repairIntakeDrafts.ts');
const storageUtilPath = path.join(root, 'utils', 'repairIntakeDraftStorage.ts');
const pagePath = path.join(root, 'pages', 'AddRepair.tsx');
const draftUtilSource = fs.readFileSync(draftUtilPath, 'utf8');
const storageUtilSource = fs.readFileSync(storageUtilPath, 'utf8');
const pageSource = fs.readFileSync(pagePath, 'utf8');

const compileCommonJs = (source, fileName) => ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
    esModuleInterop: true,
  },
  fileName,
}).outputText;

const evaluateCommonJs = (compiled, fileName, requireImpl) => {
  const module = { exports: {} };
  const execute = new Function('exports', 'require', 'module', '__filename', '__dirname', compiled);
  execute(module.exports, requireImpl, module, fileName, path.dirname(fileName));
  return module.exports;
};

const draftUtils = evaluateCommonJs(
  compileCommonJs(draftUtilSource, draftUtilPath),
  draftUtilPath,
  () => { throw new Error('repairIntakeDrafts.ts must stay dependency-free at runtime'); },
);

const storageUtils = evaluateCommonJs(
  compileCommonJs(storageUtilSource, storageUtilPath),
  storageUtilPath,
  (specifier) => {
    if (specifier === './repairIntakeDrafts') return draftUtils;
    throw new Error(`Unexpected runtime dependency in repairIntakeDraftStorage.ts: ${specifier}`);
  },
);

const {
  REPAIR_INTAKE_DRAFTS_KEY,
  buildRepairIntakeDraft,
  normalizeRepairFormData,
  parseRepairIntakeDrafts,
  upsertRepairIntakeDraft,
} = draftUtils;

const {
  loadRepairIntakeDraftsFromStores,
  persistRepairIntakeDraftsWithStores,
  serializeRepairIntakeDrafts,
} = storageUtils;

assert.equal(REPAIR_INTAKE_DRAFTS_KEY, 'kourosh:repair-intake-drafts:v1');

const partialDraft = buildRepairIntakeDraft({
  id: 'draft-partial',
  formData: { customerId: 4, deviceModel: undefined, problemDescription: undefined },
  customerMobile: undefined,
  selectedAccessories: ['شارژر', null, 42],
  internalNote: undefined,
});
assert.equal(partialDraft.formData.problemDescription, '');
assert.equal(partialDraft.deviceLabel, 'بدون مدل دستگاه');
assert.equal(partialDraft.issuePreview, 'بدون شرح مشکل');
assert.deepEqual(partialDraft.selectedAccessories, ['شارژر', '42']);

const normalizedForm = normalizeRepairFormData(null);
assert.deepEqual(normalizedForm, {
  customerId: null,
  deviceModel: '',
  deviceColor: '',
  serialNumber: '',
  problemDescription: '',
  estimatedCost: '',
});

const parsed = parseRepairIntakeDrafts(JSON.stringify([
  partialDraft,
  null,
  { id: '', formData: {} },
  { id: 'legacy', formData: { deviceModel: 'A55' }, savedAt: 'bad-date' },
]));
assert.equal(parsed.length, 2);
assert.equal(parsed[1].formData.problemDescription, '');

const upserted = upsertRepairIntakeDraft(parsed, buildRepairIntakeDraft({
  id: 'draft-new',
  formData: { customerId: '7', deviceModel: 'iPhone 13', problemDescription: 'خاموش می‌شود' },
  customerName: 'مشتری تست',
}));
assert.equal(upserted[0].id, 'draft-new');
assert.equal(JSON.parse(serializeRepairIntakeDrafts(upserted))[0].id, 'draft-new');

const createMemoryStore = (name, initial = null) => {
  let value = initial;
  return {
    name,
    async getItem(key) {
      assert.equal(key, REPAIR_INTAKE_DRAFTS_KEY);
      return value;
    },
    async setItem(key, nextValue) {
      assert.equal(key, REPAIR_INTAKE_DRAFTS_KEY);
      value = nextValue;
    },
  };
};

const primary = createMemoryStore('localStorage');
const mirror = createMemoryStore('indexedDB');
const persistedPrimary = await persistRepairIntakeDraftsWithStores(upserted, [primary, mirror]);
assert.equal(persistedPrimary.backend, 'localStorage');
assert.equal((await loadRepairIntakeDraftsFromStores([primary])).drafts[0].id, 'draft-new');
assert.equal((await loadRepairIntakeDraftsFromStores([mirror])).drafts[0].id, 'draft-new', 'fallback mirror must receive a copy after primary persistence succeeds');

const emptyPrimaryWithFallbackData = createMemoryStore('localStorage', '[]');
const fallbackOnlyDraft = buildRepairIntakeDraft({
  id: 'draft-from-indexeddb',
  formData: { deviceModel: 'Galaxy S24', problemDescription: 'مشکل شارژ' },
  savedAt: '2026-08-31T05:00:00.000Z',
});
const populatedFallback = createMemoryStore('indexedDB', JSON.stringify([fallbackOnlyDraft]));
const mergedRecovery = await loadRepairIntakeDraftsFromStores([emptyPrimaryWithFallbackData, populatedFallback]);
assert.equal(mergedRecovery.drafts[0]?.id, 'draft-from-indexeddb',
  'an empty/stale localStorage value must not hide a successfully persisted IndexedDB fallback draft');

const olderPrimaryDraft = buildRepairIntakeDraft({
  id: 'same-draft',
  formData: { deviceModel: 'old-model' },
  savedAt: '2026-08-31T04:00:00.000Z',
});
const newerFallbackDraft = buildRepairIntakeDraft({
  id: 'same-draft',
  formData: { deviceModel: 'new-model' },
  savedAt: '2026-08-31T06:00:00.000Z',
});
const mergedNewest = await loadRepairIntakeDraftsFromStores([
  createMemoryStore('localStorage', JSON.stringify([olderPrimaryDraft])),
  createMemoryStore('indexedDB', JSON.stringify([newerFallbackDraft])),
]);
assert.equal(mergedNewest.drafts[0]?.formData.deviceModel, 'new-model',
  'when storage backends disagree, the newest savedAt version of the same draft id must win');

const failingPrimary = {
  name: 'localStorage',
  async getItem() { return null; },
  async setItem() { throw new Error('quota exceeded'); },
};
const fallback = createMemoryStore('indexedDB');
const persistedFallback = await persistRepairIntakeDraftsWithStores(upserted, [failingPrimary, fallback]);
assert.equal(persistedFallback.backend, 'indexedDB', 'durable save must fall back when localStorage is unavailable/full');
assert.equal((await loadRepairIntakeDraftsFromStores([fallback])).drafts[0].id, 'draft-new');

const corruptPrimary = {
  name: 'localStorage',
  async getItem() { return 'corrupted-after-write'; },
  async setItem() {},
};
const verifiedFallback = createMemoryStore('indexedDB');
const persistedAfterVerificationFailure = await persistRepairIntakeDraftsWithStores(upserted, [corruptPrimary, verifiedFallback]);
assert.equal(persistedAfterVerificationFailure.backend, 'indexedDB', 'read-after-write verification failure must use the fallback store');

await assert.rejects(
  () => persistRepairIntakeDraftsWithStores(upserted, []),
  /هیچ حافظه مرورگری/,
  'no available browser store must produce a controlled error instead of a crash',
);

const saveHandlerSource = pageSource.match(/const handleSaveDraft = async \(\) => \{[\s\S]*?\n  \};/)?.[0] || '';
assert.match(saveHandlerSource, /await persistRepairIntakeDraftsDurably\(nextDrafts\)/,
  'temporary save must go through the durable browser-storage contract.');
assert.match(saveHandlerSource, /setDraftStorageFeedback\(/,
  'temporary save failures/successes must remain local to the repair draft panel.');
assert.doesNotMatch(saveHandlerSource, /setNotification\(/,
  'temporary save must not depend on the global Notification portal to report storage failures.');
assert.doesNotMatch(saveHandlerSource, /window\.localStorage|localStorage\.setItem/,
  'temporary save handler must not call localStorage directly.');
assert.match(pageSource, /RepairDraftRenderBoundary/,
  'the draft list must be isolated so a rendering regression cannot crash the whole repair intake page.');
assert.match(pageSource, /data-skip-global-buttons="true"/,
  'draft-list composite buttons must opt out of global native-button DOM enhancement.');
assert.match(pageSource, /loading=\{isDraftSaving\}/,
  'the save command must expose a guarded busy state and reject double-click persistence races.');

const program = ts.createProgram(['pages/AddRepair.tsx', 'utils/repairIntakeDrafts.ts', 'utils/repairIntakeDraftStorage.ts'], {
  noEmit: true,
  noResolve: true,
  skipLibCheck: true,
  jsx: ts.JsxEmit.ReactJSX,
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  allowSyntheticDefaultImports: true,
  lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'],
});
const freeIdentifierCodes = new Set([2304, 2551, 2552]);
const unresolved = ts.getPreEmitDiagnostics(program)
  .filter((diagnostic) => freeIdentifierCodes.has(diagnostic.code))
  .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, ' '));
assert.deepEqual(unresolved, [], `repair intake runtime identifiers must resolve: ${unresolved.join(' | ')}`);

console.log(JSON.stringify({
  status: 'PASS',
  scope: ['pages/AddRepair.tsx', 'utils/repairIntakeDrafts.ts', 'utils/repairIntakeDraftStorage.ts'],
  checks: {
    partialLegacyDraftSafe: true,
    malformedStoredDraftsNormalized: true,
    localStorageReadAfterWriteVerified: true,
    indexedDbFallbackContract: true,
    fallbackMirrorContract: true,
    storageFailureStaysInsideDraftPanel: true,
    draftListRenderIsolation: true,
    globalNativeButtonEnhancerBypassedForDraftList: true,
    doubleClickGuard: true,
    unresolvedLocalIdentifiers: 0,
  },
}, null, 2));
