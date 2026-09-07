import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { KOUROSH_RELEASE } from "./lib/kourosh-release.mjs";

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const prepareMiniAppCloudflarePages = (options = {}) => {
  const root = path.resolve(options.root || defaultRoot);
  const release = String(options.release || KOUROSH_RELEASE).trim();
  const source = path.join(root, "deployment", "cloudflare-pages", "_worker.js");
  const outDir = path.join(root, "dist-miniapp");
  const entry = path.join(outDir, "miniapp.html");
  const target = path.join(outDir, "_worker.js");

  if (!/^v[1-9][0-9]*$/.test(release)) throw new Error(`Cloudflare Pages release is invalid: ${release || "(empty)"}`);
  if (!fs.existsSync(source)) throw new Error("Cloudflare Pages edge worker source is missing.");
  if (!fs.existsSync(entry)) throw new Error("dist-miniapp is missing or invalid. Build the Mini App explicitly before preparing Cloudflare Pages output.");
  const stat = fs.statSync(entry);
  if (!stat.isFile() || stat.size < 256) throw new Error("dist-miniapp/miniapp.html is invalid.");

  const builtHtml = fs.readFileSync(entry, "utf8");
  const builtRelease = builtHtml.match(/<meta\s+name="kourosh-release"\s+content="([^"]+)"\s*\/>/)?.[1] || null;
  if (builtRelease !== release) {
    throw new Error(`dist-miniapp release mismatch: built=${builtRelease || "missing"}, source=${release}. Run npm run build:miniapp before Cloudflare prepare.`);
  }

  const workerSource = fs.readFileSync(source, "utf8");
  const marker = /const EDGE_VERSION = "[^"]+";/;
  if (!marker.test(workerSource)) throw new Error("Cloudflare Pages edge worker release marker is missing.");
  const preparedWorker = workerSource.replace(marker, `const EDGE_VERSION = "${release}";`);
  fs.writeFileSync(target, preparedWorker, "utf8");

  return {
    prepared: true,
    release,
    output: path.relative(root, target),
    buildTriggered: false,
    buildReleaseVerified: true,
  };
};

const isEntrypoint = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isEntrypoint) console.log(JSON.stringify(prepareMiniAppCloudflarePages(), null, 2));
