import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
export const KOUROSH_ROOT_DIR = path.resolve(moduleDir, "..", "..");
export const KOUROSH_SOURCE_VERSION_FILE = path.join(KOUROSH_ROOT_DIR, "KOUROSH_SOURCE_VERSION");

export const readKouroshRelease = () => {
  const release = fs.readFileSync(KOUROSH_SOURCE_VERSION_FILE, "utf8").trim();
  if (!/^v[1-9][0-9]*$/.test(release)) {
    throw new Error(`KOUROSH_SOURCE_VERSION is invalid: ${release || "(empty)"}`);
  }
  return release;
};

export const KOUROSH_RELEASE = readKouroshRelease();
