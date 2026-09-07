import fs from 'node:fs'; import assert from 'node:assert/strict';
const ctx=fs.readFileSync('contexts/ConfirmContext.tsx','utf8'); const css=fs.readFileSync('styles/components/modal-system.css','utf8');
assert.ok(ctx.includes("size={isSettlementConfirm ? 'lg'"));
assert.ok(ctx.includes('data-ui-partner-settlement-confirm="v330"'));
assert.ok(ctx.includes('settlement-confirm-card__metrics'));
assert.ok(ctx.includes('confirm-dialog-actions--settlement'));
assert.ok(css.includes('v330 — compact canonical partner settlement confirmation'));
assert.ok(css.includes('grid-template-columns:repeat(3,minmax(0,1fr))'));
console.log('v330 partner settlement confirmation modal audit passed.');
