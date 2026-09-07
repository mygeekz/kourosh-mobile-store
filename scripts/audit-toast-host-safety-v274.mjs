import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const failures = [];
const expect = (condition, label) => {
  if (condition) console.log(`PASS: ${label}`);
  else failures.push(label);
};

const overlayTs = read('components/ui/overlayContract.ts');
const overlayCss = read('styles/system/overlay-layer-contract.css');
const notification = read('components/Notification.tsx');
const repairs = read('pages/Repairs.tsx');
const repairDetail = read('pages/RepairDetail.tsx');

expect(/if \(layer === 'toast'\)[\s\S]*?return document\.body;/.test(overlayTs), 'Toast portals target document.body directly');
expect(overlayTs.includes("document.getElementById(overlayHostId('toast'))"), 'Legacy toast host is explicitly detected');
expect(overlayTs.includes('staleToastHost.childElementCount === 0') && overlayTs.includes('staleToastHost.remove()'), 'Empty legacy toast host is removed safely');
expect(/\.app-overlay-layer-host--toast,[\s\S]*?\[data-kourosh-layer-host="toast"\][\s\S]*?inline-size:\s*0\s*;[\s\S]*?block-size:\s*0\s*;/.test(overlayCss), 'Any stale toast host is forced to zero viewport area');
expect(/\[data-kourosh-layer-host="toast"\][\s\S]*?background:\s*transparent\s*;/.test(overlayCss), 'Stale toast host cannot paint an opaque surface');
expect(/\.app-portal-layer--toast,[\s\S]*?inline-size:\s*max-content;/.test(overlayCss), 'Actual toast portal remains content bounded');
expect(notification.includes('<PortalLayer layer="toast"'), 'Shared Notification still uses semantic toast layer');
expect(repairs.includes("setNotification({ type: 'success'"), 'Repairs status transition still emits success feedback');
expect(repairDetail.includes("setNotification({ type: 'success', text: 'تغییرات با موفقیت ذخیره شد.'"), 'Repair detail status transition still emits success feedback');
expect(repairs.includes("method: 'PUT'") && repairDetail.includes("method: 'PUT'"), 'Repair status persistence contract remains unchanged');

if (failures.length) {
  console.error('\nToast host safety audit FAILED:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('\nToast host safety audit passed.');
