import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash, createPrivateKey, createPublicKey, generateKeyPairSync, sign } from "node:crypto";

export type ConnectorCredentialIdentity = {
  privateKeyPath: string;
  publicKeyPem: string;
  publicKeyFingerprint: string;
  signChallenge: (value: string) => string;
};

const defaultCredentialDir = () => path.join(os.homedir(), ".kourosh", "runtime", "cloud-connector");

const fingerprintPublicKey = (publicKeyPem: string) =>
  `ed25519_${createHash("sha256").update(publicKeyPem, "utf8").digest("base64url")}`;

const writePrivateFile = (filePath: string, content: string) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true, mode: 0o700 });
  fs.writeFileSync(filePath, content, { encoding: "utf8", mode: 0o600, flag: "wx" });
  try { fs.chmodSync(filePath, 0o600); } catch {}
};

export const resolveConnectorPrivateKeyPath = (env: NodeJS.ProcessEnv = process.env) =>
  path.resolve(String(env.KOUROSH_CLOUD_CONNECTOR_PRIVATE_KEY_PATH || path.join(defaultCredentialDir(), "connector-ed25519.pem")));

export const ensureConnectorCredential = (
  options: { privateKeyPath?: string; createIfMissing?: boolean } = {},
): ConnectorCredentialIdentity | null => {
  const privateKeyPath = path.resolve(options.privateKeyPath || resolveConnectorPrivateKeyPath());
  const createIfMissing = options.createIfMissing !== false;
  let privateKeyPem = "";
  if (fs.existsSync(privateKeyPath)) {
    privateKeyPem = fs.readFileSync(privateKeyPath, "utf8");
  } else {
    if (!createIfMissing) return null;
    const pair = generateKeyPairSync("ed25519", {
      privateKeyEncoding: { format: "pem", type: "pkcs8" },
      publicKeyEncoding: { format: "pem", type: "spki" },
    });
    privateKeyPem = pair.privateKey;
    writePrivateFile(privateKeyPath, privateKeyPem);
  }
  const privateKey = createPrivateKey(privateKeyPem);
  const publicKeyPem = createPublicKey(privateKey).export({ format: "pem", type: "spki" }).toString();
  return {
    privateKeyPath,
    publicKeyPem,
    publicKeyFingerprint: fingerprintPublicKey(publicKeyPem),
    signChallenge: (value: string) => sign(null, Buffer.from(value, "utf8"), privateKey).toString("base64url"),
  };
};

export const buildConnectorChallengeProof = (installationId: string, challengeId: string, nonce: string, expiresAt: string) =>
  `KOUROSH-CLOUD-RELAY-V1\n${installationId}\n${challengeId}\n${nonce}\n${expiresAt}`;

export type ConnectorCredentialMaterial = {
  privateKeyPem: string;
  publicKeyPem: string;
  publicKeyFingerprint: string;
  signChallenge: (value: string) => string;
};

export const generateConnectorCredentialMaterial = (): ConnectorCredentialMaterial => {
  const pair = generateKeyPairSync("ed25519", {
    privateKeyEncoding: { format: "pem", type: "pkcs8" },
    publicKeyEncoding: { format: "pem", type: "spki" },
  });
  const privateKey = createPrivateKey(pair.privateKey);
  const publicKeyPem = pair.publicKey;
  return {
    privateKeyPem: pair.privateKey,
    publicKeyPem,
    publicKeyFingerprint: fingerprintPublicKey(publicKeyPem),
    signChallenge: (value: string) => sign(null, Buffer.from(value, "utf8"), privateKey).toString("base64url"),
  };
};

export const persistConnectorPrivateKey = (
  privateKeyPem: string,
  options: { privateKeyPath?: string } = {},
): string => {
  const target = path.resolve(options.privateKeyPath || resolveConnectorPrivateKeyPath());
  fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
  const temp = `${target}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temp, privateKeyPem, { encoding: "utf8", mode: 0o600 });
  try { fs.chmodSync(temp, 0o600); } catch {}
  fs.renameSync(temp, target);
  try { fs.chmodSync(target, 0o600); } catch {}
  return target;
};
