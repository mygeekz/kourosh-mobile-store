#!/usr/bin/env node
import fs from 'node:fs';
import assert from 'node:assert/strict';

const repairs = fs.readFileSync('pages/Repairs.tsx', 'utf8');
const receipt = fs.readFileSync('pages/RepairReceipt.tsx', 'utf8');
const submit = fs.readFileSync('pages/AddRepair.tsx', 'utf8');

assert.match(repairs, /class RepairBoardRenderBoundary extends React\.Component/, 'Kanban must have a local render boundary so a board-only failure cannot blank the whole app.');
assert.match(repairs, /\[repair-board\] kanban render failed/, 'Kanban boundary must emit a scoped diagnostic.');
assert.match(repairs, /pendingStatusIds/, 'Status transitions must be guarded against duplicate concurrent updates.');
assert.match(repairs, /setDragImage\(transparentDragImage, 0, 0\)/, 'Native full-card drag ghost must be suppressed for Chromium/PWA.');
assert.match(repairs, /onDragEnd=\{\(\) => \{[\s\S]*setDraggedRepairId\(null\)[\s\S]*setDragOverStatus\(null\)/, 'Drag state must always be cleared at drag end.');
assert.match(repairs, /window\.setTimeout\(\(\) => \{\s*void updateRepairStatus\(repairId, status\);\s*\}, 0\)/, 'Status mutation must be deferred until the native drop lifecycle ends.');
assert.doesNotMatch(repairs, /\{\s*\.\.\.r,\s*\.\.\.updated\s*\}/, 'Repair list rows must not blindly spread the status endpoint transport payload.');
assert.match(repairs, /const next: Repair = \{ \.\.\.repair, status: serverStatus \}/, 'Status mutation must preserve the current list row and patch only validated fields.');
assert.doesNotMatch(repairs, /runWithFeedback\(/, 'Kanban status transitions should not create a second global feedback transition during native drag/drop.');

assert.doesNotMatch(receipt, /window\.open\(/, 'Repair receipt printing must not open a full blank popup window.');
assert.match(receipt, /document\.createElement\('iframe'\)/, 'Repair receipt printing must use an isolated hidden iframe.');
assert.match(receipt, /autoPrintStartedRef/, 'Automatic receipt printing must be guarded to run once per receipt mount.');
assert.match(receipt, /printStarted/, 'Iframe printing must guard against duplicate print triggers.');
assert.match(receipt, /\[repair-receipt\] iframe print failed/, 'Receipt print failures must have a scoped diagnostic.');

assert.match(submit, /navigate\(`\/repairs\/\$\{repairId\}\/receipt\?autoPrint=1`, \{ replace: true \}\)/, 'Successful repair submission must replace the committed intake route with the printable receipt.');
assert.match(submit, /\[repair-submit\] repair committed; receipt navigation started/, 'Successful repair commit transition diagnostic must remain present.');

console.log(JSON.stringify({
  status: 'PASS',
  scope: ['pages/AddRepair.tsx', 'pages/RepairReceipt.tsx', 'pages/Repairs.tsx'],
  contracts: {
    receiptPrintSurface: 'hidden-iframe-single-trigger',
    kanbanDragSurface: 'transparent-native-drag-image-with-deferred-mutation',
    statusPayloadMerge: 'validated-field-patch-only',
    boardFailureContainment: true,
  },
}, null, 2));
