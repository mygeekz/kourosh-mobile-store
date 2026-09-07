import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const failures = [];
const pass = (label) => console.log(`PASS: ${label}`);
const fail = (label) => failures.push(label);
const expect = (condition, label) => (condition ? pass(label) : fail(label));

const notification = read('components/Notification.tsx');
const appToaster = read('app/feedback/AppToaster.tsx');
const guard = read('styles/system/ui-contracts/spa-nonblocking-feedback-guard-phase83.css');
const overlayContract = read('styles/system/overlay-layer-contract.css');
const repairs = read('pages/Repairs.tsx');
const repairDetail = read('pages/RepairDetail.tsx');

expect(!notification.includes('backdrop-blur'), 'Notification toast has no Tailwind backdrop blur');
expect(!appToaster.includes('backdrop-blur'), 'Global AppToaster has no Tailwind backdrop blur');
expect(notification.includes('data-ui-feedback-surface="toast"'), 'Notification exposes canonical toast feedback surface marker');
expect(notification.includes('app-toast-surface'), 'Notification uses compositor-safe toast surface class');
expect(appToaster.includes('app-toast-surface'), 'AppToaster uses compositor-safe toast surface class');
expect(!notification.includes("translate-y-0 opacity-100") && !notification.includes("translate-y-4 opacity-0"), 'Notification avoids transformed toast animation');
expect(!appToaster.includes("translate-y-0 opacity-100") && !appToaster.includes("translate-y-4 opacity-0"), 'AppToaster avoids transformed toast animation');
expect(guard.includes('.app-toast-surface'), 'SPA feedback guard covers canonical toast surface');
expect(/\.app-toast-surface[\s\S]*?-webkit-backdrop-filter:\s*none\s*!important;[\s\S]*?backdrop-filter:\s*none\s*!important;/.test(guard), 'Toast surface explicitly disables backdrop filtering');
expect(/\.app-toast-surface[\s\S]*?transform:\s*none\s*!important;/.test(guard), 'Toast surface explicitly disables compositor transforms');
expect(!guard.includes('html:has(.app-notification-toast) #root') && !guard.includes('html:has([data-ui-feedback-surface="toast"]) #root'), 'Toast guard never mutates #root compositor state');
expect(/\.app-portal-layer--toast,[\s\S]*?inset:\s*auto;[\s\S]*?inline-size:\s*max-content;/.test(overlayContract), 'Toast portal is content-bounded instead of full viewport');
expect(overlayContract.includes('.app-toast-layer--bottom-right { inset-block-end: 0; right: 0; }'), 'Default bottom-right toast placement remains explicit');
expect(repairs.includes("setNotification({ type: 'success'"), 'Repairs status success still follows existing feedback path');
expect(repairDetail.includes("setNotification({ type: 'success', text: 'تغییرات با موفقیت ذخیره شد.'"), 'Repair detail status success still follows existing feedback path');
expect(repairs.includes("method: 'PUT'") && repairDetail.includes("method: 'PUT'"), 'Repair status API mutation contract remains PUT-based');

if (failures.length) {
  console.error('\nToast compositor safety audit FAILED:');
  for (const item of failures) console.error(`- ${item}`);
  process.exit(1);
}

console.log('\nToast compositor safety audit passed.');
