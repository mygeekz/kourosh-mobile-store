import type { Express, NextFunction, Request, RequestHandler, Response } from "express";
import path from "path";
import fs from "fs";
import {
  getAllSettingsAsObject,
  updateMultipleSettings,
  updateSetting,
} from "../database";
import {
  createStagedUpload,
  finalizeStagedUpload,
  removeStagedUpload,
  SafeUploadError,
  type FinalizedUpload,
} from "../upload";

type AuthorizeRole = (roles: string[]) => RequestHandler;

const FRESH_LOCAL_DOMAIN_SUFFIX = "home.arpa";


const asUnknownRecord = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null ? value as Record<string, unknown> : {};

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error ?? "");

type LocalCertificateResult = {
  certPath?: string;
  keyPath?: string;
  pfxPath?: string;
  cerPath?: string;
  caCerPath?: string;
  caCrtPath?: string;
  caPemPath?: string;
  caFingerprintSha256?: string;
  caCommonName?: string;
  rootCaRotated?: boolean;
  caProfileVersion?: number;
  ipAddresses?: string[];
  mode?: string;
  trusted?: boolean;
  restartRequired?: boolean;
};

export type LocalSettingsRoutesDeps = {
  authorizeRole: AuthorizeRole;
  uploadsDir: string;
  localCertDir: string;
  localHostsScriptPath: string;
  localMacHostsScriptPath: string;
  normalizeLocalHostname: (value: unknown) => string;
  normalizeLocalSuffix: (value: unknown) => string;
  buildLocalDomain: (hostname: unknown, suffix: unknown) => string;
  getLocalDomainHostIp: (suffix: unknown) => string;
  buildWindowsHostsSetupBatch: (domain: string, ip: string, aliases?: string[]) => string;
  buildMacHostsSetupCommand: (domain: string, ip: string, aliases?: string[]) => string;
  generateLocalCertificate: (
    domain: string,
    serverIp: string,
    aliases?: string[],
  ) => Promise<LocalCertificateResult>;
};

export const registerLocalSettingsRoutes = (
  app: Express,
  {
    authorizeRole,
    uploadsDir,
    localCertDir,
    localHostsScriptPath,
    localMacHostsScriptPath,
    normalizeLocalHostname,
    normalizeLocalSuffix,
    buildLocalDomain,
    getLocalDomainHostIp,
    buildWindowsHostsSetupBatch,
    buildMacHostsSetupCommand,
    generateLocalCertificate,
  }: LocalSettingsRoutesDeps,
): void => {
  const resolveStoredLegacyShortcut = async (hostname: string, settings: Record<string, unknown>) => {
    const expected = hostname ? `${hostname}.local` : "";
    if (!expected) return "";
    const hostsTokens = String(settings.local_hosts_line || "").trim().split(/\s+/);
    if (hostsTokens.includes(expected)) return expected;
    try {
      const runtime = JSON.parse(await fs.promises.readFile(path.join(localCertDir, "local-domain-runtime.json"), "utf8"));
      return String(runtime?.shortcutDomain || "").trim().toLowerCase() === expected ? expected : "";
    } catch {
      return "";
    }
  };

  const sendLocalRootCertificate = async (
    _req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const crtPath = path.join(localCertDir, "current-ca.crt");
      const stat = await fs.promises.stat(crtPath).catch(() => null);
      if (!stat?.isFile() || stat.size <= 0) {
        return res.status(404).json({
          success: false,
          code: "LOCAL_CERT_NOT_FOUND",
          message: "فایل گواهی ریشه هنوز آماده نشده است. پنجره start_https.bat را ببندید و دوباره اجرا کنید.",
        });
      }

      let hostname = "kourosh";
      try {
        const settings = await getAllSettingsAsObject();
        hostname = normalizeLocalHostname(settings.local_hostname ?? "kourosh") || "kourosh";
      } catch {
        // The public certificate is also needed during first-run setup, before
        // optional store settings have been written.
      }

      const profilePath = path.join(localCertDir, "current-ca-profile.json");
      let fingerprint = "";
      let profileVersion = 3;
      try {
        const profile = JSON.parse(await fs.promises.readFile(profilePath, "utf8"));
        fingerprint = String(profile?.fingerprintSha256 || "").replace(/[^a-f0-9]/gi, "").toLowerCase();
        profileVersion = Number(profile?.version || 3);
      } catch {}
      const fingerprintSuffix = fingerprint ? `-${fingerprint.slice(0, 12)}` : "";

      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      res.setHeader("Content-Type", "application/x-pem-file");
      res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("X-Kourosh-CA-Fingerprint-SHA256", fingerprint);
      res.setHeader("X-Kourosh-CA-Profile", String(profileVersion));
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${hostname}-local-root-ca-v${profileVersion}${fingerprintSuffix}.crt"`,
      );
      return res.sendFile(crtPath);
    } catch (error) {
      return next(error);
    }
  };

  // A Root CA certificate is public material; only its private key is secret.
  // Keeping this read-only endpoint unauthenticated lets a new phone establish
  // trust before it can sign in through the local HTTPS origin.
  app.get("/api/local-runtime/root-ca.crt", sendLocalRootCertificate);

  app.post(
    "/api/settings/local-domain/generate-cert",
    authorizeRole(["Admin"]),
    async (req, res, next) => {
      try {
        const settings = await getAllSettingsAsObject();
        const hostname = normalizeLocalHostname(
          asUnknownRecord(req.body).hostname ?? settings.local_hostname ?? "kourosh",
        );
        const suffix = normalizeLocalSuffix(
          asUnknownRecord(req.body).suffix ??
            settings.local_domain_suffix ??
            FRESH_LOCAL_DOMAIN_SUFFIX,
        );
        const domain = buildLocalDomain(hostname, suffix);
        if (!hostname)
          return res.status(400).json({
            success: false,
            message: "نام میزبان محلی معتبر نیست.",
          });
        if (!suffix)
          return res.status(400).json({ success: false, code: "INVALID_LOCAL_SUFFIX", message: "Suffix محلی معتبر نیست." });
        if (!domain)
          return res
            .status(400)
            .json({ success: false, message: "دامنه محلی معتبر نیست." });

        const serverIp = getLocalDomainHostIp(suffix);
        if (!serverIp)
          return res.status(409).json({ success: false, code: "LOCAL_LAN_ADDRESS_UNAVAILABLE", message: "برای این دامنه محلی یک LAN IPv4 معتبر لازم است." });
        const shortcutDomain = await resolveStoredLegacyShortcut(hostname, settings);
        const aliases = shortcutDomain && shortcutDomain !== domain ? [shortcutDomain] : [];
        const result = await generateLocalCertificate(domain, serverIp, aliases);
        const hostsLine = `${serverIp} ${[domain, ...aliases].join(" ")}`;
        const hostsScript = buildWindowsHostsSetupBatch(domain, serverIp, aliases);
        const macHostsScript = buildMacHostsSetupCommand(domain, serverIp, aliases);
        await fs.promises.writeFile(localHostsScriptPath, hostsScript, "utf8");
        await fs.promises.writeFile(
          localMacHostsScriptPath,
          macHostsScript,
          "utf8",
        );
        try {
          await fs.promises.chmod(localMacHostsScriptPath, 0o755);
        } catch {}

        const httpsUrl = `https://${domain}:5173/#/`;
        const redirectConfigPath = path.join(localCertDir, "local-domain-runtime.json");
        const redirectConfigTempPath = `${redirectConfigPath}.tmp`;
        await fs.promises.writeFile(
          redirectConfigTempPath,
          JSON.stringify({
            version: 1,
            targetDomain: domain,
            targetUrl: httpsUrl,
            shortcutDomain,
            shortcutUrl: shortcutDomain ? `http://${shortcutDomain}` : "",
            targetPort: 5173,
            httpRedirectPort: 80,
            httpsRedirectPort: 443,
            certificateDnsNames: [domain, ...aliases],
            updatedAt: new Date().toISOString(),
          }, null, 2),
          "utf8",
        );
        await fs.promises.rm(redirectConfigPath, { force: true });
        await fs.promises.rename(redirectConfigTempPath, redirectConfigPath);

        await updateMultipleSettings([
          { key: "local_hostname", value: hostname },
          { key: "local_domain_suffix", value: suffix },
          { key: "local_base_url", value: httpsUrl },
          { key: "local_hosts_ip", value: serverIp },
          { key: "local_hosts_line", value: hostsLine },
        ]);

        res.json({
          success: true,
          message: "گواهی محلی ساخته شد.",
          data: {
            hostname,
            suffix,
            domain,
            httpsUrl,
            shortcutDomain,
            shortcutUrl: shortcutDomain ? `http://${shortcutDomain}` : "",
            certPath: result.certPath,
            keyPath: result.keyPath,
            pfxPath: result.pfxPath,
            cerPath: result.cerPath,
            caCerPath: result.caCerPath,
            caCrtPath: result.caCrtPath,
            caPemPath: result.caPemPath,
            caFingerprintSha256: result.caFingerprintSha256 || "",
            caCommonName: result.caCommonName || "Kourosh Local Root CA v3",
            certificateIpAddresses: result.ipAddresses || [],
            mode: result.mode,
            trusted: result.trusted === true,
            rootCaRotated: result.rootCaRotated === true,
            caProfileVersion: result.caProfileVersion || 0,
            restartRequired: result.restartRequired !== false,
            httpsPort: 5173,
            serverIp,
            hostsLine,
            hostsScriptPath: localHostsScriptPath,
            hostsScriptFileName: `setup-${domain}.bat`,
            macHostsScriptPath: localMacHostsScriptPath,
            macHostsScriptFileName: `setup-${domain}.command`,
          },
        });
      } catch (e) {
        const msg = getErrorMessage(e);
        if (
          /گواهی محلی|openssl|New-SelfSignedCertificate|PowerShell|PFX|PKI/i.test(msg)
        ) {
          console.error(`[local-cert] Request failed: ${msg}`);
          return res.status(500).json({
            success: false,
            code: "LOCAL_CERT_GENERATION_FAILED",
            message:
              msg ||
              "ساخت گواهی محلی انجام نشد. جزئیات فنی در ترمینال سرور ثبت شد.",
          });
        }
        next(e);
      }
    },
  );

  app.get(
    "/api/settings/local-domain/setup-hosts.bat",
    authorizeRole(["Admin"]),
    async (req, res, next) => {
      try {
        const settings = await getAllSettingsAsObject();
        const hostname = normalizeLocalHostname(
          req.query.hostname ?? settings.local_hostname ?? "kourosh",
        );
        const suffix = normalizeLocalSuffix(
          req.query.suffix ??
            settings.local_domain_suffix ??
            FRESH_LOCAL_DOMAIN_SUFFIX,
        );
        const domain = buildLocalDomain(hostname, suffix);
        if (!suffix)
          return res.status(400).json({ success: false, code: "INVALID_LOCAL_SUFFIX", message: "Suffix محلی معتبر نیست." });
        if (!domain)
          return res
            .status(400)
            .json({ success: false, message: "دامنه محلی معتبر نیست." });

        const serverIp = getLocalDomainHostIp(suffix);
        if (!serverIp)
          return res.status(409).json({ success: false, code: "LOCAL_LAN_ADDRESS_UNAVAILABLE", message: "برای این دامنه محلی یک LAN IPv4 معتبر لازم است." });
        const shortcutDomain = await resolveStoredLegacyShortcut(hostname, settings);
        const aliases = shortcutDomain && shortcutDomain !== domain ? [shortcutDomain] : [];
        const hostsScript = buildWindowsHostsSetupBatch(domain, serverIp, aliases);
        await fs.promises.mkdir(localCertDir, { recursive: true });
        await fs.promises.writeFile(localHostsScriptPath, hostsScript, "utf8");

        res.json({
          success: true,
          data: {
            content: hostsScript,
            fileName: `setup-${domain}.bat`,
            domain,
            shortcutDomain,
            serverIp,
          },
        });
      } catch (e) {
        next(e);
      }
    },
  );

  app.get(
    "/api/settings/local-domain/setup-hosts.command",
    authorizeRole(["Admin"]),
    async (req, res, next) => {
      try {
        const settings = await getAllSettingsAsObject();
        const hostname = normalizeLocalHostname(
          req.query.hostname ?? settings.local_hostname ?? "kourosh",
        );
        const suffix = normalizeLocalSuffix(
          req.query.suffix ??
            settings.local_domain_suffix ??
            FRESH_LOCAL_DOMAIN_SUFFIX,
        );
        const domain = buildLocalDomain(hostname, suffix);
        if (!suffix)
          return res.status(400).json({ success: false, code: "INVALID_LOCAL_SUFFIX", message: "Suffix محلی معتبر نیست." });
        if (!domain)
          return res
            .status(400)
            .json({ success: false, message: "دامنه محلی معتبر نیست." });

        const serverIp = getLocalDomainHostIp(suffix);
        if (!serverIp)
          return res.status(409).json({ success: false, code: "LOCAL_LAN_ADDRESS_UNAVAILABLE", message: "برای این دامنه محلی یک LAN IPv4 معتبر لازم است." });
        const shortcutDomain = await resolveStoredLegacyShortcut(hostname, settings);
        const aliases = shortcutDomain && shortcutDomain !== domain ? [shortcutDomain] : [];
        const hostsScript = buildMacHostsSetupCommand(domain, serverIp, aliases);
        await fs.promises.mkdir(localCertDir, { recursive: true });
        await fs.promises.writeFile(
          localMacHostsScriptPath,
          hostsScript,
          "utf8",
        );
        try {
          await fs.promises.chmod(localMacHostsScriptPath, 0o755);
        } catch {}

        res.json({
          success: true,
          data: {
            content: hostsScript,
            fileName: `setup-${domain}.command`,
            domain,
            shortcutDomain,
            serverIp,
          },
        });
      } catch (e) {
        next(e);
      }
    },
  );


  app.get(
    "/api/settings/local-domain/certificate.cer",
    authorizeRole(["Admin"]),
    sendLocalRootCertificate,
  );

  const logoUpload = createStagedUpload(2 * 1024 * 1024);

  app.post(
    "/api/settings/upload-logo",
    authorizeRole(["Admin"]),
    logoUpload.single("logo"),
    async (req, res, next) => {
      let finalized: FinalizedUpload | null = null;
      try {
        if (!req.file)
          return res.status(400).json({
            success: false,
            message: "هیچ فایلی برای آپلود انتخاب نشده است.",
          });

        finalized = await finalizeStagedUpload(req.file, {
          destinationDir: uploadsDir,
          prefix: "store-logo",
          allowedKinds: ["jpeg", "png", "webp"],
          publicAsset: true,
        });
        const previousSettings = await getAllSettingsAsObject();
        const previousLogo = path.basename(String(previousSettings.store_logo_path || ""));
        await updateSetting("store_logo_path", finalized.filename);

        const canDeletePreviousLogo =
          previousLogo &&
          previousLogo !== finalized.filename &&
          /^(?:logo|store-logo-[a-z0-9-]+)\.(?:jpe?g|png|gif|svg|webp)$/i.test(previousLogo);

        if (canDeletePreviousLogo) {
          try {
            await fs.promises.unlink(path.join(uploadsDir, previousLogo));
          } catch (cleanupError: unknown) {
            const code = cleanupError instanceof Error && "code" in cleanupError
              ? String((cleanupError as NodeJS.ErrnoException).code || "")
              : "";
            if (code !== "ENOENT") {
              console.warn("Failed to remove previous store logo:", cleanupError);
            }
          }
        }

        const revision = Date.now();
        res.setHeader("Cache-Control", "no-store");
        res.json({
          success: true,
          message: "لوگو با موفقیت آپلود شد.",
          data: { filePath: finalized.filename, revision },
        });
      } catch (e) {
        await removeStagedUpload(finalized?.absolutePath || req.file?.path);
        if (e instanceof SafeUploadError) {
          return res.status(e.statusCode).json({
            success: false,
            message: "محتوای فایل لوگو معتبر نیست. فقط JPEG، PNG و WebP مجاز است.",
          });
        }
        next(e);
      }
    },
  );

  app.delete(
    "/api/settings/logo",
    authorizeRole(["Admin"]),
    async (_req, res, next) => {
      try {
        const previousSettings = await getAllSettingsAsObject();
        const previousLogo = path.basename(String(previousSettings.store_logo_path || ""));
        await updateSetting("store_logo_path", "");

        const isManagedLogo =
          previousLogo &&
          /^(?:logo|store-logo-[a-z0-9-]+)\.(?:jpe?g|png|gif|svg|webp)$/i.test(previousLogo);
        if (isManagedLogo) {
          try {
            await fs.promises.unlink(path.join(uploadsDir, previousLogo));
          } catch (cleanupError: unknown) {
            const code = cleanupError instanceof Error && "code" in cleanupError
              ? String((cleanupError as NodeJS.ErrnoException).code || "")
              : "";
            if (code !== "ENOENT") throw cleanupError;
          }
        }

        const revision = Date.now();
        res.setHeader("Cache-Control", "no-store");
        res.json({
          success: true,
          message: "لوگوی طلایی پیش‌فرض فعال شد.",
          data: { filePath: null, revision },
        });
      } catch (e) {
        next(e);
      }
    },
  );
};

// Backward-compatible type aliases for older imports.
export type RegisterLocalSettingsRoutesDeps = LocalSettingsRoutesDeps;
