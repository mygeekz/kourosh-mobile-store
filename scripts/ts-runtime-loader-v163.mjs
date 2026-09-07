import { access } from "node:fs/promises";

const CANDIDATE_EXTENSIONS = [".ts", ".tsx", ".mjs", ".js"];
const HAS_RUNTIME_EXTENSION = /\.(?:[cm]?[jt]sx?|json|node)$/i;

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    if (
      error?.code !== "ERR_MODULE_NOT_FOUND" ||
      !context.parentURL ||
      !(specifier.startsWith("./") || specifier.startsWith("../")) ||
      HAS_RUNTIME_EXTENSION.test(specifier)
    ) {
      throw error;
    }

    for (const extension of CANDIDATE_EXTENSIONS) {
      const candidate = new URL(`${specifier}${extension}`, context.parentURL);
      try {
        await access(candidate);
        return { url: candidate.href, shortCircuit: true };
      } catch {
        // Continue to the next project runtime extension.
      }
    }
    throw error;
  }
}
