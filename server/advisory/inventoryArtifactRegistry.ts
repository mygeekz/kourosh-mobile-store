import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { verifyLogisticArtifact, type PortableLogisticArtifact } from "./portableModel";

type Pointer = { activeArtifactId: string | null; previousArtifactId: string | null; updatedAt: string; updatedBy: string };
const safeId = (value: string) => {
  if (!/^[a-zA-Z0-9._-]{3,160}$/.test(value)) throw new Error("Unsafe artifact id");
  return value;
};

export class InventoryArtifactRegistry {
  constructor(private readonly directory: string) {}
  private artifactPath(id: string) { return join(this.directory, `${safeId(id)}.json`); }
  private pointerPath() { return join(this.directory, "inventory-stockout-risk.active.json"); }

  async put(artifact: PortableLogisticArtifact, replace = false): Promise<void> {
    if (!verifyLogisticArtifact(artifact)) throw new Error("Artifact checksum validation failed");
    await mkdir(this.directory, { recursive: true });
    const destination = this.artifactPath(artifact.artifactId);
    const temporary = `${destination}.${process.pid}.inventory.tmp`;
    await writeFile(temporary, `${JSON.stringify(artifact, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    if (!replace) {
      try { await readFile(destination); throw new Error("Artifact already exists"); }
      catch (error: any) { if (error?.message === "Artifact already exists") throw error; }
    }
    await rename(temporary, destination);
  }

  async get(id: string): Promise<PortableLogisticArtifact> {
    const artifact = JSON.parse(await readFile(this.artifactPath(id), "utf8")) as PortableLogisticArtifact;
    if (!verifyLogisticArtifact(artifact)) throw new Error("Artifact checksum validation failed");
    return artifact;
  }

  async pointer(): Promise<Pointer> {
    try { return JSON.parse(await readFile(this.pointerPath(), "utf8")) as Pointer; }
    catch { return { activeArtifactId: null, previousArtifactId: null, updatedAt: "", updatedBy: "" }; }
  }

  async activate(id: string, actor: string, now = new Date()): Promise<Pointer> {
    const artifact = await this.get(id);
    if (artifact.approval.status !== "approved" || artifact.approval.syntheticTrainingData) throw new Error("Only approved non-synthetic artifacts can be activated");
    const current = await this.pointer();
    const next = { activeArtifactId: id, previousArtifactId: current.activeArtifactId, updatedAt: now.toISOString(), updatedBy: actor };
    await writeFile(this.pointerPath(), `${JSON.stringify(next, null, 2)}\n`, "utf8");
    return next;
  }

  async active(): Promise<PortableLogisticArtifact | null> {
    const pointer = await this.pointer();
    if (!pointer.activeArtifactId) return null;
    const artifact = await this.get(pointer.activeArtifactId);
    if (artifact.approval.status !== "approved" || artifact.approval.syntheticTrainingData) throw new Error("Active inventory artifact is not eligible");
    return artifact;
  }

  async rollback(actor: string, now = new Date()): Promise<Pointer> {
    const current = await this.pointer();
    if (!current.previousArtifactId) throw new Error("No rollback artifact is available");
    const previous = await this.get(current.previousArtifactId);
    if (previous.approval.status !== "approved" || previous.approval.syntheticTrainingData) throw new Error("Rollback target is not eligible");
    const next = { activeArtifactId: current.previousArtifactId, previousArtifactId: current.activeArtifactId, updatedAt: now.toISOString(), updatedBy: actor };
    await writeFile(this.pointerPath(), `${JSON.stringify(next, null, 2)}\n`, "utf8");
    return next;
  }
}
