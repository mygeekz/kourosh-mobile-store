// Search initialization hooks extracted from core/initRuntime.ts.
import { ensureFts5UnifiedSearch, initSearchIndexIfNeeded } from "../core/searchIndex";

export const initializeSearchRuntime = async (): Promise<void> => {
  await ensureFts5UnifiedSearch();
  await initSearchIndexIfNeeded();
};
