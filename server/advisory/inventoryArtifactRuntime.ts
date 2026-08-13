import { advisoryArtifactDirectory } from "./phoneArtifactRuntime";
import { InventoryArtifactRegistry } from "./inventoryArtifactRegistry";
import { runInventoryStockoutArtifact, type InventoryCurrentRow, type InventoryMlAdvisory } from "./inventoryStockoutModel";

export const inventoryArtifactRegistry = () => new InventoryArtifactRegistry(advisoryArtifactDirectory());

export const runApprovedInventoryArtifact = async (
  currentRows: InventoryCurrentRow[],
  registry = inventoryArtifactRegistry(),
): Promise<InventoryMlAdvisory> => {
  const artifact = await registry.active();
  if (!artifact) return { status: "abstained", mode: "approved-artifact-unavailable", reason: "مدل تأییدشده موجودی فعال نیست؛ نبض کوروش فقط سیگنال‌های خواندنی پایه را نمایش می‌دهد.", metrics: null, items: [], safety: { advisoryOnly: true, humanReviewRequired: true, automaticOrderingEnabled: false, inventoryMutationEnabled: false } };
  return runInventoryStockoutArtifact(artifact, currentRows);
};
