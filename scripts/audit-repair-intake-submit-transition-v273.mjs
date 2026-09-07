#!/usr/bin/env node
import fs from 'node:fs';

const source = fs.readFileSync('pages/AddRepair.tsx', 'utf8');
const start = source.indexOf('  const handleSubmit = async (e: FormEvent) => {');
const end = source.indexOf('\n\n  useEffect(() => {', start);

if (start < 0 || end < 0) {
  console.error(JSON.stringify({ status: 'FAIL', reason: 'AddRepair handleSubmit block not found.' }, null, 2));
  process.exit(1);
}

const block = source.slice(start, end);
const failures = [];
const requireText = (needle, reason) => { if (!block.includes(needle)) failures.push(reason); };
const forbidText = (needle, reason) => { if (block.includes(needle)) failures.push(reason); };

requireText('silentSuccess: true', 'Final repair submission must not emit a transient success toast before receipt navigation.');
requireText('navigate(`/repairs/${repairId}/receipt?autoPrint=1`, { replace: true })', 'Receipt navigation must replace the committed intake route so the submitted form cannot reappear from browser history.');
requireText('let navigationCommitted = false', 'Post-commit state guard is missing.');
requireText('if (!navigationCommitted && mountedRef.current)', 'Loading state must not be written after successful navigation/unmount.');
requireText("console.info('[repair-submit] repair committed; receipt navigation started'", 'Repair submit stage log is missing.');
requireText("console.warn('[repair-submit] repair saved; temporary draft cleanup failed'", 'Best-effort cleanup failure log is missing.');
forbidText("setNotification({ type: 'success'", 'Do not render a local success notification after the server commit; the receipt route is the success screen.');
forbidText('setDrafts(persisted.drafts)', 'Do not mutate draft React state after the repair has been committed.');
forbidText('setActiveDraftId(null)', 'Do not mutate active draft React state after the repair has been committed.');

const navigateIndex = block.indexOf('navigate(`/repairs/${repairId}/receipt?autoPrint=1`, { replace: true })');
const cleanupIndex = block.indexOf('removeRepairDraftKeyDurably(REPAIR_INTAKE_LEGACY_DRAFT_KEY)');
if (navigateIndex < 0 || cleanupIndex < 0 || navigateIndex > cleanupIndex) {
  failures.push('Receipt navigation must happen before best-effort temporary-draft cleanup.');
}

if (failures.length) {
  console.error(JSON.stringify({ status: 'FAIL', scope: 'pages/AddRepair.tsx::handleSubmit', failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  status: 'PASS',
  scope: 'pages/AddRepair.tsx::handleSubmit',
  guarantees: [
    'no transient success notification render after server commit',
    'global success toast suppressed for the route-transition flow',
    'receipt navigation replaces the committed intake route before draft cleanup',
    'post-commit draft cleanup does not write React state',
    'post-navigation loading state is not written to an unmounting page',
  ],
}, null, 2));
