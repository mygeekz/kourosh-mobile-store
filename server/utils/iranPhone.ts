export const normalizeIranPhone = (input: string): string => {
  const raw = String(input || "").trim();
  if (!raw) return "";
  // keep digits only
  let d = raw.replace(/[^0-9۰-۹٠-٩]/g, "");
  // convert Persian/Arabic digits to latin
  d = d
    .replace(/[۰-۹]/g, (c) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(c)))
    .replace(/[٠-٩]/g, (c) => String("٠١٢٣٤٥٦٧٨٩".indexOf(c)));

  // +98..., 98..., 0098...
  if (d.startsWith("0098")) d = d.slice(4);
  if (d.startsWith("98")) d = d.slice(2);
  if (d.startsWith("0")) return d;
  // if user sent 9xxxxxxxxx
  if (d.length === 10 && d.startsWith("9")) return "0" + d;
  return d;
};
