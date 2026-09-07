#!/usr/bin/env node
import assert from 'node:assert/strict';
import { resolveFloatingOverlayPosition } from '../utils/floatingOverlayPosition.ts';

const rtlStart = resolveFloatingOverlayPosition({
  anchor: { top: 100, right: 300, bottom: 140, left: 200 },
  viewport: { width: 400, height: 800 },
  preferredWidth: 224,
  panelHeight: 200,
});
assert.deepEqual(
  { left: rtlStart.left, width: rtlStart.width, placement: rtlStart.placement },
  { left: 76, width: 224, placement: 'bottom' },
  'RTL start alignment must anchor the surface right edge while preserving bottom placement when space exists.',
);

const flipsTop = resolveFloatingOverlayPosition({
  anchor: { top: 650, right: 360, bottom: 690, left: 280 },
  viewport: { width: 400, height: 720 },
  preferredWidth: 240,
  panelHeight: 260,
  margin: 8,
  gap: 8,
});
assert.equal(flipsTop.placement, 'top', 'Auto placement must flip above when below cannot fit but above can.');
assert.ok(flipsTop.top >= 8, 'Top placement must respect viewport margin.');

const clampsWidth = resolveFloatingOverlayPosition({
  anchor: { top: 40, right: 310, bottom: 80, left: 10 },
  viewport: { width: 320, height: 568 },
  preferredWidth: 500,
  panelHeight: 300,
  margin: 8,
});
assert.equal(clampsWidth.width, 304, 'Overlay width must clamp to viewport width minus both margins.');
assert.equal(clampsWidth.left, 8, 'Clamped full-width surface must remain inside the viewport margin.');

const constrainedHeight = resolveFloatingOverlayPosition({
  anchor: { top: 250, right: 250, bottom: 290, left: 150 },
  viewport: { width: 360, height: 400 },
  preferredWidth: 260,
  panelHeight: 500,
  margin: 8,
  gap: 8,
});
assert.ok(constrainedHeight.availableHeight >= 0, 'Available height must never become negative.');
assert.ok(constrainedHeight.top >= 8, 'Constrained overlay must stay within the top viewport margin.');

const ltrStart = resolveFloatingOverlayPosition({
  anchor: { top: 50, right: 260, bottom: 90, left: 180 },
  viewport: { width: 500, height: 700 },
  preferredWidth: 200,
  panelHeight: 100,
  direction: 'ltr',
  align: 'start',
});
assert.equal(ltrStart.left, 180, 'LTR start alignment must follow the anchor left edge.');

console.log(JSON.stringify({
  status: 'PASS',
  suite: 'floating-overlay-position-v270',
  cases: 5,
  covered: ['rtl-start', 'top-flip', 'viewport-width-clamp', 'height-constraint', 'ltr-start'],
}, null, 2));
