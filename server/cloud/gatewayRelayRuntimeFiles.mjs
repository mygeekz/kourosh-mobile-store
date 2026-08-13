import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { validateAssignedMiniAppUrl } from "../../cloud/shared/cloudHostname.mjs";

const runtimeDir = (env = process.env) => path.resolve(String(env.KOUROSH_CLOUD_RUNTIME_DIR || path.join(os.homedir(), ".kourosh", "runtime", "cloud-connector")));
export const resolveGatewayRelaySecretPath = (env = process.env) => path.resolve(String(env.KOUROSH_MINIAPP_RELAY_SECRET_PATH || path.join(runtimeDir(env), "miniapp-relay-secret")));
export const resolveGatewayRelayAssignmentPath = (env = process.env) => path.resolve(String(env.KOUROSH_MINIAPP_RELAY_ASSIGNMENT_PATH || path.join(runtimeDir(env), "miniapp-relay-assignment.json")));
const ensureDir = (file) => fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
const chmodPrivate = (file) => { try { fs.chmodSync(file, 0o600); } catch {} };

export const ensureGatewayRelaySecret = (options = {}) => {
  const file = path.resolve(options.secretPath || resolveGatewayRelaySecretPath(options.env));
  if (fs.existsSync(file)) { const secret = fs.readFileSync(file, "utf8").trim(); if (/^[A-Za-z0-9_-]{40,}$/.test(secret)) { chmodPrivate(file); return secret; } throw new Error("Invalid local Mini App relay secret file."); }
  if (options.createIfMissing === false) return null;
  ensureDir(file); const secret = crypto.randomBytes(32).toString("base64url");
  fs.writeFileSync(file, secret, { encoding: "utf8", mode: 0o600, flag: "wx" }); chmodPrivate(file); return secret;
};

export const writeGatewayRelayAssignment = (assignedPublicUrl, options = {}) => {
  const checked = validateAssignedMiniAppUrl(assignedPublicUrl); if (!checked.ok || !checked.url || !checked.host) throw new Error("Assigned Mini App public URL is invalid.");
  const url = new URL(checked.url);
  const file = path.resolve(options.assignmentPath || resolveGatewayRelayAssignmentPath(options.env)); ensureDir(file);
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
  const assignmentVersion = Math.max(1, Number(options.assignmentVersion || 1));
  const body = JSON.stringify({ assignedHost: url.host.toLowerCase(), assignedPublicUrl: url.toString(), assignmentVersion, updatedAt: new Date().toISOString() });
  fs.writeFileSync(temp, body, { encoding: "utf8", mode: 0o600 }); fs.renameSync(temp, file); chmodPrivate(file); return { file, assignedHost: url.host.toLowerCase() };
};

export const readGatewayRelayAssignment = (options = {}) => {
  const file = path.resolve(options.assignmentPath || resolveGatewayRelayAssignmentPath(options.env));
  try { const value = JSON.parse(fs.readFileSync(file, "utf8")); const checked = validateAssignedMiniAppUrl(value.assignedPublicUrl); const host = String(value.assignedHost || "").trim().toLowerCase(); const assignmentVersion = Number(value.assignmentVersion || 1); if(!checked.ok || !checked.host || checked.host!==host || !Number.isInteger(assignmentVersion) || assignmentVersion<1) return null; return { ...value, assignedHost: host, assignedPublicUrl: checked.url, assignmentVersion }; } catch { return null; }
};
