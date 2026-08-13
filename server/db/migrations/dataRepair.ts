// Data repair orchestration extracted from core/initRuntime.ts seed phase.
import {
  backfillLegacyHistoryAndLedgers,
  normalizePhonePurchaseLedgers,
} from "../core/maintenance";
import { runLegacyAccountingReconciliation } from "./legacyAccountingReconciliation";

export const runPostSeedDataRepairs = async (): Promise<void> => {
  await backfillLegacyHistoryAndLedgers().catch((e) => {
    console.error("Legacy history/ledger backfill failed:", e?.message || e);
  });
  await normalizePhonePurchaseLedgers().catch((e) => {
    console.error(
      "Phone purchase ledger normalization failed:",
      e?.message || e,
    );
  });
  await runLegacyAccountingReconciliation().catch((e) => {
    console.error(
      "Legacy accounting reconciliation failed:",
      e?.message || e,
    );
  });
};
