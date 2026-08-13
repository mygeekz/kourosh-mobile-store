import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const failures = [];
let checks = 0;
const expect = (label, condition) => {
  checks += 1;
  if (!condition) failures.push(label);
};

const resolver = read('utils/navigationEntityLabelResolver.ts');
const actions = read('utils/navigationQuickPreviewActions.ts');
const preview = read('components/main-layout/NavigationBreadcrumbQuickPreview.tsx');
const bar = read('components/main-layout/NavigationReturnBar.tsx');

expect('Quick actions helper exists', fs.existsSync('utils/navigationQuickPreviewActions.ts'));
expect('Quick actions remain snapshot-only with no fetch', !actions.includes('fetch(') && !preview.includes('fetch('));
expect('Preview item supports serializable copy metadata', resolver.includes('copyValue?: string') && resolver.includes('copyLabel?: string'));
expect('Copy metadata is sanitized before navigation session persistence', resolver.includes('copyValue: cleanText(item?.copyValue)') && resolver.includes('copyLabel: cleanText(item?.copyLabel)'));
expect('IMEI semantic preview preserves full raw copy value', resolver.includes("copyValue: identifier || parseImei(sourceLabel)") && resolver.includes("copyLabel: 'کپی IMEI'"));
expect('SKU semantic preview preserves full raw copy value', resolver.includes("copyValue: identifier, copyLabel: 'کپی SKU'"));
expect('Check quick action preserves raw check number', resolver.includes("copyValue: checkNumber, copyLabel: 'کپی شماره چک'"));
expect('Payment quick action preserves raw payment id', resolver.includes("copyValue: String(paymentId), copyLabel: 'کپی شناسه پرداخت'"));
expect('Settlement quick action preserves settlement document id', resolver.includes("copyValue: batchId, copyLabel: 'کپی شناسه سند'"));
expect('Quick action derivation recognizes financial values', actions.includes('/مبلغ|بدهی|بستانکار|وصول|سرمایه/') && actions.includes("label: 'کپی مانده'"));
expect('Quick action derivation recognizes IMEI/SKU/check identifiers', actions.includes("label: 'کپی IMEI'") && actions.includes("label: 'کپی SKU'") && actions.includes("label: 'کپی شماره چک'"));
expect('Quick action list is deliberately capped to avoid UI clutter', actions.includes('.slice(0, 3)'));
expect('Stage document id can be copied even when not present in preview items', actions.includes('stageIdentifierAction') && actions.includes("label: 'کپی شناسه سند'"));
expect('Stage identifier fallback does not inspect detail text and risk copying a parent document id', actions.includes('cleanText(stage.label).match') && !actions.includes('`${cleanText(stage.label)} ${cleanText(stage.detail)}`'));
expect('Stage identifier fallback uses semantic entity labels', actions.includes("'کپی شناسه چک'") && actions.includes("'کپی شناسه گوشی'") && actions.includes("'کپی شناسه کالا'"));
expect('Quick preview exposes compact actions panel', preview.includes('data-ui-breadcrumb-quick-actions-panel="true"') && preview.includes('اقدامات سریع'));
expect('Quick preview offers open-stage action only through parent navigation handler', preview.includes('canOpenStage') && preview.includes('onOpenStage') && preview.includes('data-ui-breadcrumb-action="open-stage"'));
expect('Return bar reuses the same openStage behavior for breadcrumb and preview', bar.includes('const openStage = (stage: OperationalBreadcrumbStage)') && bar.includes('onClick={() => openStage(stage)}') && bar.includes('onOpenStage={() => openStage(previewStage)}'));
expect('Origin-stage open still restores exact prior UI state through returnToRecord', bar.includes('returnToRecord(stage.record as NavigationReturnRecord)'));
expect('Path-stage open preserves active navigation state', bar.includes("navigate(stage.path, { replace: true, state: location.state })"));
expect('Copy action uses Clipboard API when available', preview.includes('navigator.clipboard?.writeText'));
expect('Copy action has non-secure-context fallback', preview.includes("document.execCommand('copy')"));
expect('Copy action has success and error feedback', preview.includes("state: 'success' | 'error'") && preview.includes("'کپی شد'") && preview.includes("'کپی نشد'"));
expect('Copy feedback auto-clears', preview.includes('}, 1400);'));
expect('Quick actions remain keyboard focusable', preview.includes('focus-visible:ring-2'));
expect('Quick actions use existing utility classes and add no dedicated CSS file', !fs.existsSync('styles/components/navigation-breadcrumb-quick-actions.css'));
expect('No server route was added for quick actions', !fs.existsSync('server/routes/navigationBreadcrumbQuickActions.routes.ts'));

if (failures.length) {
  console.error(`Navigation quick actions v134 audit failed: ${failures.length}/${checks} checks failed.`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Navigation quick actions v134 audit passed: ${checks}/${checks} checks.`);
