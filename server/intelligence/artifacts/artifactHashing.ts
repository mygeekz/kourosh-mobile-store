import { createHash } from "crypto";

const canonicalize = (value: unknown, seen = new WeakSet<object>()): string => {
  if (value === null) return "null";
  if (typeof value === "number") return Number.isFinite(value) ? JSON.stringify(value) : "null";
  if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "undefined" || typeof value === "function" || typeof value === "symbol") return "null";
  if (Array.isArray(value)) return `[${value.map((item) => canonicalize(item, seen)).join(",")}]`;
  if (typeof value === "object") {
    if (seen.has(value)) throw new Error("Cannot canonicalize circular artifact envelope.");
    seen.add(value);
    const record = value as Record<string, unknown>;
    const body = Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalize(record[key], seen)}`)
      .join(",");
    seen.delete(value);
    return `{${body}}`;
  }
  return JSON.stringify(String(value));
};

export function canonicalizeArtifactEnvelope(input: unknown): string {
  return canonicalize(input);
}

export function computeArtifactEnvelopeSha256(input: unknown): string {
  return createHash("sha256").update(canonicalizeArtifactEnvelope(input), "utf8").digest("hex");
}

export function measureCanonicalArtifactEnvelopeBytes(input: unknown): number {
  return Buffer.byteLength(canonicalizeArtifactEnvelope(input), "utf8");
}
