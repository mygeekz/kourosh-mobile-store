import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "deployment", "cloudflare-pages", "_worker.js");
const outDir = path.join(root, "dist-miniapp");
const entry = path.join(outDir, "miniapp.html");
const target = path.join(outDir, "_worker.js");

if (!fs.existsSync(source)) throw new Error("Cloudflare Pages edge worker source is missing.");
if (!fs.existsSync(entry)) throw new Error("dist-miniapp is missing or invalid. Build the Mini App explicitly before preparing Cloudflare Pages output.");
const stat = fs.statSync(entry);
if (!stat.isFile() || stat.size < 256) throw new Error("dist-miniapp/miniapp.html is invalid.");
fs.copyFileSync(source, target);
console.log(JSON.stringify({ prepared: true, output: path.relative(root, target), buildTriggered: false }, null, 2));
