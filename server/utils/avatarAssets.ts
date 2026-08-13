import fs from "fs";
import path from "path";

import { uploadsDir } from "./localSettingsHelpers";

const PUBLIC_AVATAR_FILE_PATTERN = /^avatar-[a-z0-9-]+\.(?:jpe?g|png|gif|webp)$/i;
const AVATARS_DIR = path.resolve(uploadsDir, "avatars");

export const resolvePublicAvatarUrl = (avatarPath: unknown): string | null => {
  if (typeof avatarPath !== "string") return null;

  const filename = avatarPath.trim();
  if (!filename || path.basename(filename) !== filename) return null;
  if (!PUBLIC_AVATAR_FILE_PATTERN.test(filename)) return null;

  const candidate = path.resolve(AVATARS_DIR, filename);
  if (path.dirname(candidate) !== AVATARS_DIR) return null;

  try {
    const stat = fs.lstatSync(candidate);
    if (!stat.isFile() || stat.isSymbolicLink()) return null;
    return `/uploads/avatars/${filename}`;
  } catch (error: any) {
    if (error?.code === "ENOENT") return null;
    return null;
  }
};
