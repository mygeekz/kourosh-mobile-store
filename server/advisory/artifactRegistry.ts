import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { verifyArtifact, type PortableRegressionArtifact } from "./portableModel";

type RegistryPointer = { activeArtifactId: string | null; previousArtifactId: string | null; updatedAt: string; updatedBy: string };

const safeId = (value: string): string => {
  if (!/^[a-zA-Z0-9._-]{3,160}$/.test(value)) throw new Error("Unsafe artifact id");
  return value;
};

export class AdvisoryArtifactRegistry {
  constructor(private readonly directory: string) {}

  private artifactPath(id: string): string { return join(this.directory, `${safeId(id)}.json`); }
  private pointerPath(task: PortableRegressionArtifact["task"]): string { return join(this.directory, `${safeId(task)}.active.json`); }

  async put(artifact: PortableRegressionArtifact): Promise<void> {
    if (!verifyArtifact(artifact)) throw new Error("Artifact checksum validation failed");
    await mkdir(this.directory, { recursive: true });
    const destination = this.artifactPath(artifact.artifactId);
    const temporary = `${destination}.${process.pid}.tmp`;
    await writeFile(temporary, `${JSON.stringify(artifact, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    await rename(temporary, destination);
  }

  /** Replaces the same immutable candidate id after explicit human approval. */
  async replace(artifact: PortableRegressionArtifact): Promise<void> {
    if (!verifyArtifact(artifact)) throw new Error("Artifact checksum validation failed");
    await mkdir(this.directory, { recursive: true });
    const destination = this.artifactPath(artifact.artifactId);
    const temporary = `${destination}.${process.pid}.replace.tmp`;
    await writeFile(temporary, `${JSON.stringify(artifact, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    await rename(temporary, destination);
  }

  async get(id: string): Promise<PortableRegressionArtifact> {
    const parsed = JSON.parse(await readFile(this.artifactPath(id), "utf8")) as PortableRegressionArtifact;
    if (!verifyArtifact(parsed)) throw new Error("Artifact checksum validation failed");
    return parsed;
  }

  async list(): Promise<PortableRegressionArtifact[]> {
    await mkdir(this.directory, { recursive: true });
    const files = (await readdir(this.directory)).filter((name) => name.endsWith(".json") && !name.endsWith(".active.json"));
    const artifacts: PortableRegressionArtifact[] = [];
    for (const file of files.sort()) {
      const preview = JSON.parse(await readFile(join(this.directory, file), "utf8")) as { task?: string };
      if (preview.task === "inventory-stockout-risk") continue;
      artifacts.push(await this.get(file.slice(0, -5)));
    }
    return artifacts.sort((left, right) => right.trainedAt.localeCompare(left.trainedAt) || left.artifactId.localeCompare(right.artifactId));
  }

  async active(task: PortableRegressionArtifact["task"]): Promise<PortableRegressionArtifact | null> {
    const pointer = await this.pointer(task);
    if (!pointer.activeArtifactId) return null;
    const artifact = await this.get(pointer.activeArtifactId);
    if (artifact.task !== task || artifact.approval.status !== "approved" || artifact.approval.syntheticTrainingData) {
      throw new Error("Active artifact is not eligible for advisory execution");
    }
    return artifact;
  }

  async activate(task: PortableRegressionArtifact["task"], id: string, actor: string, now = new Date()): Promise<RegistryPointer> {
    const artifact = await this.get(id);
    if (artifact.task !== task) throw new Error("Artifact task mismatch");
    if (artifact.approval.status !== "approved") throw new Error("Only approved artifacts can be activated");
    if (artifact.approval.syntheticTrainingData) throw new Error("Synthetic artifacts cannot be activated");
    const current = await this.pointer(task);
    const next = { activeArtifactId: id, previousArtifactId: current.activeArtifactId, updatedAt: now.toISOString(), updatedBy: actor };
    await writeFile(this.pointerPath(task), `${JSON.stringify(next, null, 2)}\n`, "utf8");
    return next;
  }

  async pointer(task: PortableRegressionArtifact["task"]): Promise<RegistryPointer> {
    try { return JSON.parse(await readFile(this.pointerPath(task), "utf8")) as RegistryPointer; }
    catch { return { activeArtifactId: null, previousArtifactId: null, updatedAt: "", updatedBy: "" }; }
  }

  async rollback(task: PortableRegressionArtifact["task"], actor: string, now = new Date()): Promise<RegistryPointer> {
    const current = await this.pointer(task);
    if (!current.previousArtifactId) throw new Error("No rollback artifact is available");
    const previous = await this.get(current.previousArtifactId);
    if (previous.approval.status !== "approved" || previous.approval.syntheticTrainingData) throw new Error("Rollback target is not eligible");
    const next = { activeArtifactId: current.previousArtifactId, previousArtifactId: current.activeArtifactId, updatedAt: now.toISOString(), updatedBy: actor };
    await writeFile(this.pointerPath(task), `${JSON.stringify(next, null, 2)}\n`, "utf8");
    return next;
  }
}
