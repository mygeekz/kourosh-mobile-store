// dev-server.mjs
import http from "node:http";
import https from "node:https";
import fs from "node:fs";
import path from "node:path";
import { createServer as createViteServer } from "vite";

const PORT = 5173;
const HOST = "0.0.0.0"; // مهم: روی همه اینترفیس‌ها

async function main() {
  // اگر گواهی/کلیدت جای دیگری است، این دو مسیر را مطابق پروژه خودت تنظیم کن
  const preferredKeyPath = path.resolve(process.env.HTTPS_KEY_FILE || process.env.VITE_HTTPS_KEY_FILE || 'certs/current-key.pem');
  const preferredCertPath = path.resolve(process.env.HTTPS_CERT_FILE || process.env.VITE_HTTPS_CERT_FILE || 'certs/current-cert.pem');
  const preferredPfxPath = path.resolve(process.env.HTTPS_PFX_FILE || process.env.VITE_HTTPS_PFX_FILE || 'certs/current-cert.pfx');
  const pfxPassphrase = process.env.LOCAL_CERT_PFX_PASSPHRASE || process.env.VITE_LOCAL_CERT_PFX_PASSPHRASE || 'kourosh-local-dev';
  const keyPath = preferredKeyPath;
  const certPath = preferredCertPath;
  const pfxPath = preferredPfxPath;

  const hasCertPair = fs.existsSync(keyPath) && fs.existsSync(certPath);
  const hasPfx = fs.existsSync(pfxPath);
  const vite = await createViteServer({
    server: {
      middlewareMode: true,
      hmr: {
        // برای شبکه محلی بهتره host از آدرس فعلی مرورگر/دامنه تنظیم‌شده گرفته شود
        protocol: (hasPfx || hasCertPair) ? "wss" : "ws",
        port: PORT,
      },
    },
    appType: "custom",
  });

  const requestHandler = (req, res) => {
    vite.middlewares(req, res);
  };

  if (hasPfx || hasCertPair) {
    const httpsOptions = hasPfx
      ? { pfx: fs.readFileSync(pfxPath), passphrase: '' }
      : {
          key: fs.readFileSync(keyPath),
          cert: fs.readFileSync(certPath),
        };

    const server = https.createServer(httpsOptions, requestHandler);
    server.on("error", (e) => {
      console.error("HTTPS server error:", e);
      process.exit(1);
    });

    server.listen(PORT, HOST, () => {
      console.log(`✅ Dev server (HTTPS, HTTP/1.1) listening on:`);
      console.log(`   https://localhost:${PORT}`);
      console.log(`   https://<local-domain>:${PORT}`);
    });
    return;
  }

  const server = http.createServer(requestHandler);
  server.on("error", (e) => {
    console.error("HTTP server error:", e);
    process.exit(1);
  });

  server.listen(PORT, HOST, () => {
    console.log(`⚠️  No HTTPS certificate found, starting in HTTP fallback mode:`);
    console.log(`   http://localhost:${PORT}`);
    console.log(`   http://<local-domain>:${PORT}`);
  });
}

main();