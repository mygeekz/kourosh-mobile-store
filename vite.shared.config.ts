import path from "node:path";

export const kouroshAliases = (rootDir: string) => ({
  "lucide-react": path.resolve(rootDir, "components/lucide-react"),
  "@": path.resolve(rootDir),
  "@components": path.resolve(rootDir, "components"),
  "@pages": path.resolve(rootDir, "pages"),
  "@contexts": path.resolve(rootDir, "contexts"),
  "@utils": path.resolve(rootDir, "utils"),
  "@types": path.resolve(rootDir, "types"),
  "@assets": path.resolve(rootDir, "assets"),
  "@styles": path.resolve(rootDir, "styles"),
  "@hooks": path.resolve(rootDir, "hooks"),
});

export const kouroshManualChunk = (id: string): string | undefined => {
  const lower = id.replace(/\\/g, "/").toLowerCase();
  if (!lower.includes("node_modules")) return undefined;
  if (lower.includes("recharts")) return "vendor-charts";
  if (lower.includes("framer-motion")) return "vendor-motion";
  if (lower.includes("@tanstack")) return "vendor-tables";
  if (lower.includes("exceljs")) return "vendor-excel";
  if (lower.includes("jspdf-autotable")) return "vendor-pdf-table";
  if (lower.includes("jspdf")) return "vendor-pdf";
  if (lower.includes("html2canvas") || lower.includes("canvg") || lower.includes("dompurify")) return "vendor-capture";
  if (/\/node_modules\/(?:react|react-dom|react-router|react-router-dom|scheduler)\//.test(lower)) return "vendor-react-core";
  return "vendor";
};
