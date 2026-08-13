import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import moment from "jalali-moment";
import { createMiniAppStaffService } from "../server/services/miniAppStaff.service";

const fixedNow = moment("2026-08-11", "YYYY-MM-DD");

const makeRows = (count: number) => Array.from({ length: count }, (_, index) => {
  const delta = (index % 16) - 3;
  return {
    id: index + 1,
    saleId: Math.floor(index / 10) + 1,
    customerId: (index % 400) + 1,
    customerFullName: `مشتری ${index % 400}`,
    customerPhoneNumber: "09*********",
    dueDate: fixedNow.clone().add(delta, "days").locale("en").format("jYYYY/jMM/jDD"),
    effectiveRemaining: (index % 9 + 1) * 100_000,
  };
});

const run = async (count: number) => {
  const rows = makeRows(count);
  const service = createMiniAppStaffService({
    repo: {} as never,
    readModels: { listUnpaidInstallments: async () => rows } as never,
    now: () => fixedNow.clone(),
  });
  const heapBefore = process.memoryUsage().heapUsed;
  const startedAt = performance.now();
  const [overdue, today, next7] = await Promise.all([
    service.listDueInstallments({ scope: "overdue", page: 1, pageSize: 20 }),
    service.listDueInstallments({ scope: "today", page: 1, pageSize: 20 }),
    service.listDueInstallments({ scope: "next7", page: 1, pageSize: 20 }),
  ]);
  const durationMs = performance.now() - startedAt;
  const heapDeltaBytes = Math.max(0, process.memoryUsage().heapUsed - heapBefore);
  assert.equal(overdue.total + today.total + next7.total, rows.filter((_, index) => {
    const delta = (index % 16) - 3;
    return delta <= 7;
  }).length);
  assert.ok(overdue.items.length <= 20 && today.items.length <= 20 && next7.items.length <= 20);
  return {
    rows: count,
    durationMs: Number(durationMs.toFixed(2)),
    heapDeltaBytes,
    totals: { overdue: overdue.total, today: today.total, next7: next7.total },
  };
};

const results = [];
for (const count of [1_000, 5_000, 10_000]) results.push(await run(count));
assert.ok(results.at(-1)!.durationMs < 2_500, "10,000-row due mapping/filtering/pagination exceeded the conservative 2.5s budget");
console.log(JSON.stringify({ benchmark: "miniapp-due-v150", allocationSemantics: "existing-read-model-preserved", results }, null, 2));
