const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value));

export const asMlWorkbenchImportRecord = (payload: unknown): Record<string, unknown> => (isRecord(payload) ? payload : {});

export const readCandidatePackagePayload = (payload: Record<string, unknown>): Record<string, unknown> => {
  const candidatePackage = payload.candidatePackage;
  const legacyPackage = payload.package;
  if (isRecord(candidatePackage)) return candidatePackage;
  if (isRecord(legacyPackage)) return legacyPackage;
  return payload;
};

export const readMetadataRecord = (
  packagePayload: Record<string, unknown>,
  ...keys: string[]
): Record<string, unknown> => {
  for (const key of keys) {
    const value = packagePayload[key];
    if (isRecord(value)) return value;
  }
  return {};
};

export const readString = (value: unknown): string | undefined => {
  const text = String(value ?? '').trim();
  return text || undefined;
};

export const recursiveKeyFindings = (
  value: unknown,
  keys: readonly string[],
  path = '$',
): string[] => {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => recursiveKeyFindings(item, keys, `${path}[${index}]`));
  }
  if (!isRecord(value)) return [];
  return Object.entries(value).flatMap(([key, item]) => {
    const nextPath = `${path}.${key}`;
    const own = keys.includes(key) ? [nextPath] : [];
    return [...own, ...recursiveKeyFindings(item, keys, nextPath)];
  });
};
