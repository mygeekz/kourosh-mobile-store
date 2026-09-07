const normalize = (value: unknown): string => String(value ?? "")
  .replace(/[يى]/g, "ی").replace(/ك/g, "ک")
  .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
  .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
  .toLocaleLowerCase("en-US").replace(/[^a-z0-9\u0600-\u06ff]+/g, " ").trim();

export const isFactoryNewPhoneCondition = (condition: unknown): boolean => {
  const key = normalize(condition);
  return /(?:^| )(?:نو|آکبند|پلمپ)(?: |$)/.test(key) && !/در حد نو/.test(key);
};

/** Factory-new phones always have a canonical 100% battery value. */
export const normalizePhoneBatteryHealth = (condition: unknown, batteryHealth: unknown): number | null => {
  if (isFactoryNewPhoneCondition(condition)) return 100;
  if (batteryHealth === null || batteryHealth === undefined || String(batteryHealth).trim() === "") return null;
  const value = Number(batteryHealth);
  return Number.isFinite(value) && value >= 0 && value <= 100 ? Math.round(value) : null;
};
