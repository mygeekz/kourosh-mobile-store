export const safeJson = (value: unknown): string => {
  try {
    return JSON.stringify(value ?? null);
  } catch (_err) {
    return JSON.stringify({ serializationError: true });
  }
};

export const clampLimit = (value: unknown, fallback = 1000, max = 10000): number => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return fallback;
  return Math.max(1, Math.min(max, Math.round(numeric)));
};
