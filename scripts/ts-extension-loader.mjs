import { access } from 'node:fs/promises';

const TS_EXTENSIONS = ['.ts', '.tsx'];

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    if (
      error?.code !== 'ERR_MODULE_NOT_FOUND' ||
      !context.parentURL ||
      !(specifier.startsWith('./') || specifier.startsWith('../')) ||
      /\.[A-Za-z0-9]+$/.test(specifier)
    ) {
      throw error;
    }

    for (const extension of TS_EXTENSIONS) {
      const candidate = new URL(`${specifier}${extension}`, context.parentURL);
      try {
        await access(candidate);
        return { url: candidate.href, shortCircuit: true };
      } catch {
        // Try the next supported TypeScript extension.
      }
    }

    throw error;
  }
}
