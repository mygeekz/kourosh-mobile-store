import { randomUUID } from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import multer from "multer";

import { privateUploadsDir } from "./utils/localSettingsHelpers";

export type SafeUploadKind = "jpeg" | "png" | "webp" | "pdf";

type DetectedUpload = {
  kind: SafeUploadKind;
  extension: ".jpg" | ".png" | ".webp" | ".pdf";
  mimeType: "image/jpeg" | "image/png" | "image/webp" | "application/pdf";
};

export type FinalizedUpload = DetectedUpload & {
  filename: string;
  absolutePath: string;
  size: number;
  originalName: string;
};

export class SafeUploadError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode = 415) {
    super(message);
    this.name = "SafeUploadError";
    this.statusCode = statusCode;
  }
}

const stagingDir = path.join(os.tmpdir(), "kourosh-upload-staging");
fs.mkdirSync(stagingDir, { recursive: true, mode: 0o700 });

const stagingStorage = multer.diskStorage({
  destination: (_request, _file, callback) => callback(null, stagingDir),
  filename: (_request, _file, callback) => callback(null, `${randomUUID()}.pending`),
});

export const createStagedUpload = (maxFileSize = 10 * 1024 * 1024) =>
  multer({
    storage: stagingStorage,
    limits: { fileSize: maxFileSize, files: 1, fields: 12 },
  });

const upload = createStagedUpload();

const startsWith = (buffer: Buffer, signature: number[]) =>
  signature.every((value, index) => buffer[index] === value);

const endsWithNearTail = (buffer: Buffer, signature: number[], searchWindow = 32) => {
  const firstIndex = Math.max(0, buffer.length - searchWindow);
  for (let index = buffer.length - signature.length; index >= firstIndex; index -= 1) {
    if (signature.every((value, offset) => buffer[index + offset] === value)) return true;
  }
  return false;
};

export const detectSafeUpload = (buffer: Buffer): DetectedUpload | null => {
  if (
    buffer.length >= 24 &&
    startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) &&
    buffer.subarray(12, 16).toString("ascii") === "IHDR" &&
    endsWithNearTail(buffer, [0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82], 64)
  ) {
    return { kind: "png", extension: ".png", mimeType: "image/png" };
  }

  if (
    buffer.length >= 4 &&
    startsWith(buffer, [0xff, 0xd8, 0xff]) &&
    endsWithNearTail(buffer, [0xff, 0xd9], 32)
  ) {
    return { kind: "jpeg", extension: ".jpg", mimeType: "image/jpeg" };
  }

  if (
    buffer.length >= 16 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    const declaredSize = buffer.readUInt32LE(4) + 8;
    if (declaredSize <= buffer.length && declaredSize >= 16) {
      return { kind: "webp", extension: ".webp", mimeType: "image/webp" };
    }
  }

  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 5).toString("ascii") === "%PDF-" &&
    buffer.subarray(Math.max(0, buffer.length - 2048)).includes(Buffer.from("%%EOF"))
  ) {
    return { kind: "pdf", extension: ".pdf", mimeType: "application/pdf" };
  }

  return null;
};

export const removeStagedUpload = async (filePath: string | null | undefined) => {
  if (!filePath) return;
  try {
    await fs.promises.unlink(filePath);
  } catch (error: any) {
    if (error?.code !== "ENOENT") throw error;
  }
};

const moveUpload = async (source: string, destination: string) => {
  try {
    await fs.promises.rename(source, destination);
  } catch (error: any) {
    if (error?.code !== "EXDEV") throw error;
    await fs.promises.copyFile(source, destination, fs.constants.COPYFILE_EXCL);
    await fs.promises.unlink(source);
  }
};

export const finalizeStagedUpload = async (
  file: Express.Multer.File,
  options: {
    destinationDir: string;
    prefix: string;
    allowedKinds: readonly SafeUploadKind[];
    publicAsset?: boolean;
  },
): Promise<FinalizedUpload> => {
  try {
    const buffer = await fs.promises.readFile(file.path);
    const detected = detectSafeUpload(buffer);
    if (!detected || !options.allowedKinds.includes(detected.kind)) {
      throw new SafeUploadError("محتوای واقعی فایل با فرمت‌های مجاز مطابقت ندارد.");
    }

    await fs.promises.mkdir(options.destinationDir, {
      recursive: true,
      mode: options.publicAsset ? 0o755 : 0o700,
    });
    const filename = `${options.prefix}-${randomUUID()}${detected.extension}`;
    const absolutePath = path.join(options.destinationDir, filename);
    await moveUpload(file.path, absolutePath);
    await fs.promises.chmod(absolutePath, options.publicAsset ? 0o644 : 0o600);

    return {
      ...detected,
      filename,
      absolutePath,
      size: buffer.length,
      originalName: path.basename(String(file.originalname || "file")),
    };
  } catch (error) {
    await removeStagedUpload(file.path);
    throw error;
  }
};

export const finalizePrivateUpload = (file: Express.Multer.File) =>
  finalizeStagedUpload(file, {
    destinationDir: privateUploadsDir,
    prefix: "attachment",
    allowedKinds: ["jpeg", "png", "webp", "pdf"],
  });

const PRIVATE_FILE_PATTERN = /^attachment-[0-9a-f-]{36}\.(?:jpg|png|webp|pdf)$/i;

export const resolvePrivateUploadReference = async (reference: unknown): Promise<string | null> => {
  if (typeof reference !== "string") return null;
  const normalized = reference.trim().replace(/^\/api\/uploads\//, "");
  if (!PRIVATE_FILE_PATTERN.test(normalized) || path.basename(normalized) !== normalized) return null;

  const candidate = path.resolve(privateUploadsDir, normalized);
  if (path.dirname(candidate) !== path.resolve(privateUploadsDir)) return null;
  try {
    const stat = await fs.promises.lstat(candidate);
    if (!stat.isFile() || stat.isSymbolicLink()) return null;
    return candidate;
  } catch {
    return null;
  }
};

export default upload;
