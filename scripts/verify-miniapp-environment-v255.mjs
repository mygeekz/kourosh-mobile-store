import fs from "node:fs";
import path from "node:path";

const [major, minor] = process.versions.node.split(".").map(Number);
const nodeSupported = major >= 24 || (major === 22 && minor >= 17);
const requiredPackages = ["typescript", "vite", "tsx", "react", "react-dom", "puppeteer-core", "jalali-moment"];
const missing = requiredPackages.filter((name) => !fs.existsSync(path.join(process.cwd(), "node_modules", name, "package.json")));
const result = {
  status: nodeSupported && missing.length === 0 ? "PASS" : "FAIL",
  node: process.versions.node,
  requiredNode: "^22.17.0 || >=24",
  nodeSupported,
  dependenciesInstalled: missing.length === 0,
  missingPackages: missing,
};
console.log(JSON.stringify(result, null, 2));
if (result.status !== "PASS") {
  console.error("MiniApp full release verification requires the project-supported Node version and locally installed dependencies.");
  process.exitCode = 1;
}
