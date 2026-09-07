#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const sidebarHook = read('components/main-layout/useMainLayoutSidebar.ts');
const layoutShell = read('components/main-layout/MainLayoutShell.tsx');
const mainFrame = read('components/main-layout/MainContentFrame.tsx');
const mobileBottomNav = read('components/mobile-bottom-nav/MobileBottomNavShell.tsx');
const sidebarCss = read('styles/components/sidebar.css');
const navFoundation = read('styles/system/header-sidebar-navigation-foundation.css');
const buttonFoundation = read('styles/system/shared-action-buttons-foundation.css');
const tableSystem = read('components/ui/TableSystem.tsx');
const tablePagination = read('components/ui/TablePagination.tsx');
const dialogCss = read('styles/components/modal-system.css');
const expenses = read('pages/Expenses.tsx');

assert.match(sidebarHook, /APP_DESKTOP_NAV_BREAKPOINT_PX\s*=\s*1024/, 'desktop navigation breakpoint must be 1024px');
assert.match(sidebarHook, /window\.innerWidth\s*>=\s*APP_DESKTOP_NAV_BREAKPOINT_PX/, 'sidebar runtime must use the shared desktop breakpoint');
assert.match(sidebarCss, /@media \(min-width: 1024px\)[\s\S]*?\.app-sidebar-shell/, 'desktop sidebar CSS must start at 1024px');
assert.match(sidebarCss, /@media \(max-width: 1023px\)[\s\S]*?\.app-sidebar-shell/, 'overlay sidebar CSS must cover tablet widths');
assert.match(mobileBottomNav, /\blg:hidden\b/, 'bottom navigation must remain visible below 1024px');
assert.doesNotMatch(mobileBottomNav, /\bmd:hidden\b/, 'bottom navigation must not disappear at 768px');
assert.match(layoutShell, /app-sidebar-backdrop lg:hidden/, 'sidebar backdrop must remain enabled below 1024px');
assert.match(layoutShell, /lg:pb-0/, 'content bottom-nav padding must remain until lg');
assert.match(layoutShell, /data-ui-responsive-boundary="content"/, 'content shell must publish responsive boundary marker');
assert.match(mainFrame, /min-w-0 max-w-full/, 'main scroll boundary must allow children to shrink');
assert.match(mainFrame, /data-ui-responsive-boundary="main-scroll"/, 'main scroll must publish responsive boundary marker');
assert.match(navFoundation, /@media \(max-width: 1023px\)[\s\S]*?padding-bottom:\s*calc\(5rem \+ env\(safe-area-inset-bottom\)\)/, 'tablet main content must reserve bottom-navigation space');
assert.match(buttonFoundation, /\.ux-btn,[\s\S]*?min-inline-size:\s*0 !important;[\s\S]*?max-inline-size:\s*100% !important;/, 'canonical buttons must not exceed their responsive cell');
assert.match(tableSystem, /overflow-x-auto overscroll-x-contain/, 'table viewport must own horizontal scrolling');
assert.match(tableSystem, /data-ui-table-responsive="scroll"/, 'table viewport must expose responsive scroll contract');
assert.match(tablePagination, /grid gap-2[\s\S]*?md:grid-cols-\[minmax\(0,1fr\)_auto_minmax\(0,1fr\)\]/, 'table pagination must stack before md and use the shared three-zone layout after md');
assert.match(dialogCss, /max-inline-size:\s*calc\(100vw - 24px\)/, 'dialog panel must be viewport bounded');
assert.match(dialogCss, /max-block-size:\s*calc\(100dvh - 24px\)/, 'dialog panel must be dynamic-viewport bounded');
assert.doesNotMatch(expenses, /md:grid-cols-\[minmax\(360px,1\.6fr\)_180px_180px\]/, 'expenses filter row must not force a 736px fixed grid at the 768px breakpoint');
assert.match(expenses, /md:grid-cols-\[minmax\(0,2fr\)_minmax\(0,1fr\)_minmax\(0,1fr\)\]/, 'expenses filters must use shrinkable tablet columns');

const runtimeRoots = ['pages', 'components', 'app'];
const sourceFiles = runtimeRoots.flatMap((dir) => {
  const base = path.join(root, dir);
  const out = [];
  const visit = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (/\.(?:tsx?|jsx?)$/.test(entry.name)) out.push(full);
    }
  };
  visit(base);
  return out;
});

const riskyTabletGrid = [];
const riskyLargeMinWidth = [];
const fixedWidthInventory = [];
for (const file of sourceFiles) {
  const rel = path.relative(root, file).replaceAll('\\', '/');
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((line, index) => {
    const mdGrid = line.match(/md:grid-cols-\[([^\]]+)\]/);
    if (mdGrid) {
      const fixed = [...mdGrid[1].matchAll(/(?<![\d.])(\d{2,4})px/g)].map((m) => Number(m[1]));
      if (fixed.reduce((sum, value) => sum + value, 0) > 600) {
        riskyTabletGrid.push(`${rel}:${index + 1}`);
      }
    }
    const lgMin = line.match(/lg:min-w-\[(\d{3,4})px\]/);
    if (lgMin && Number(lgMin[1]) >= 760) riskyLargeMinWidth.push(`${rel}:${index + 1}`);
    for (const match of line.matchAll(/(?:^|\s)(?:w|min-w)-\[(\d{3,4})px\]/g)) {
      if (Number(match[1]) >= 560) fixedWidthInventory.push(`${rel}:${index + 1}:${match[1]}`);
    }
  });
}

assert.equal(riskyTabletGrid.length, 0, `tablet fixed-grid overflow risks remain:\n${riskyTabletGrid.join('\n')}`);
assert.equal(riskyLargeMinWidth.length, 0, `lg fixed min-width overflow risks remain:\n${riskyLargeMinWidth.join('\n')}`);

console.log('Responsive contract v287 audit passed.');
console.log(JSON.stringify({
  desktopNavigationBreakpoint: 1024,
  auditedSourceFiles: sourceFiles.length,
  riskyTabletGridCount: riskyTabletGrid.length,
  riskyLargeMinWidthCount: riskyLargeMinWidth.length,
  fixedWidthInventoryCount: fixedWidthInventory.length,
  viewportMatrix: [1366, 1024, 768, 430, 390],
}, null, 2));
