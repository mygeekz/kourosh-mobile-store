import bcryptjs from "bcryptjs";
import type {
  ChangePasswordPayload,
  Role as FrontendRole,
  UserForDisplay as FrontendUserForDisplay,
} from "../../../types";
import { ADMIN_ROLE_NAME } from "../core/initRuntime";
import { resolvePublicAvatarUrl } from "../../utils/avatarAssets";
import { getDbInstance } from "../core/runtimeBindings";
import type { UserForDb, UserUpdatePayload } from "../core/types";
import {
  allTypedAsync,
  getTypedAsync,
  runAsync,
  type SqliteBindValue,
} from "../query";

type RoleNameRow = { name: string };
type UserIdRow = { id: number };
type UsernameRow = { username: string };
type PasswordHashRow = { passwordHash: string };
type TableInfoRow = { name?: unknown };
type StoredUserRow = Omit<UserForDb, "roleName">;
type EditableUserRow = Omit<UserForDb, "passwordHash" | "roleName">;
type UserDisplayRow = {
  id: number;
  username: string;
  roleId: number;
  roleName: string;
  firstName?: string | null;
  lastName?: string | null;
  dateAdded: string;
  avatarPath?: string | null;
  lastLoginAt?: string | null;
};
type LegacyUserLookupRow = {
  id: number;
  username: string;
  passwordHash: string | null;
  roleId: number;
  roleName: string | null;
  firstName?: string | null;
  lastName?: string | null;
  lastLoginAt?: string | null;
  dateAdded: string | null;
  avatarPath?: string | null;
};

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const requireRoleName = (row: RoleNameRow | undefined): string => {
  if (!row?.name) throw new Error("نقش کاربر یافت نشد.");
  return row.name;
};

export const getAllRoles = async (): Promise<FrontendRole[]> => {
  await getDbInstance();
  return await allTypedAsync<FrontendRole>(
    "SELECT * FROM roles ORDER BY name ASC",
  );
};

export const addUserToDb = async (
  username: string,
  passwordPlain: string,
  roleId: number,
): Promise<Omit<UserForDb, "passwordHash" | "roleName">> => {
  await getDbInstance();
  const normalizedUsername = username.trim();
  const existingUser = await getTypedAsync<UserIdRow>(
    "SELECT id FROM users WHERE username = ? COLLATE NOCASE",
    [normalizedUsername],
  );
  if (existingUser) throw new Error("نام کاربری قبلا استفاده شده است.");

  const passwordHash = await bcryptjs.hash(passwordPlain, 10);
  const result = await runAsync(
    "INSERT INTO users (username, passwordHash, roleId) VALUES (?, ?, ?)",
    [normalizedUsername, passwordHash, roleId],
  );
  return {
    id: result.lastID,
    username: normalizedUsername,
    roleId,
    dateAdded: new Date().toISOString(),
  };
};

export const updateUserInDb = async (
  userId: number,
  data: UserUpdatePayload,
): Promise<Omit<UserForDb, "passwordHash">> => {
  await getDbInstance();
  const user = await getTypedAsync<StoredUserRow>(
    "SELECT * FROM users WHERE id = ?",
    [userId],
  );
  if (!user) throw new Error("کاربر یافت نشد.");

  if (user.username === "admin" && data.roleId) {
    const requestedRole = await getTypedAsync<RoleNameRow>(
      "SELECT name FROM roles WHERE id = ?",
      [data.roleId],
    );
    if (requestedRole?.name !== ADMIN_ROLE_NAME) {
      throw new Error(
        "نقش کاربر مدیر اصلی (admin) قابل تغییر نیست مگر به نقش مدیر دیگری.",
      );
    }
  }

  const fieldsToUpdate: string[] = [];
  const params: SqliteBindValue[] = [];

  if (data.roleId !== undefined) {
    fieldsToUpdate.push("roleId = ?");
    params.push(data.roleId);
  }

  if (data.firstName !== undefined) {
    fieldsToUpdate.push("firstName = ?");
    params.push((data.firstName ?? "").toString().trim() || null);
  }

  if (data.lastName !== undefined) {
    fieldsToUpdate.push("lastName = ?");
    params.push((data.lastName ?? "").toString().trim() || null);
  }

  if (fieldsToUpdate.length === 0) {
    const role = await getTypedAsync<RoleNameRow>(
      "SELECT name FROM roles WHERE id = ?",
      [user.roleId],
    );
    return {
      id: user.id,
      username: user.username,
      roleId: user.roleId,
      roleName: requireRoleName(role),
      firstName: user.firstName,
      lastName: user.lastName,
      dateAdded: user.dateAdded,
      avatarPath: user.avatarPath,
      lastLoginAt: user.lastLoginAt,
    };
  }

  params.push(userId);
  await runAsync(
    `UPDATE users SET ${fieldsToUpdate.join(", ")} WHERE id = ?`,
    params,
  );
  const updatedUser = await getTypedAsync<EditableUserRow>(
    "SELECT id, username, roleId, firstName, lastName, dateAdded, avatarPath, lastLoginAt FROM users WHERE id = ?",
    [userId],
  );
  if (!updatedUser) throw new Error("کاربر پس از ویرایش یافت نشد.");

  const role = await getTypedAsync<RoleNameRow>(
    "SELECT name FROM roles WHERE id = ?",
    [updatedUser.roleId],
  );
  return { ...updatedUser, roleName: requireRoleName(role) };
};

export const deleteUserFromDb = async (userId: number): Promise<boolean> => {
  await getDbInstance();
  const user = await getTypedAsync<UsernameRow>(
    "SELECT username FROM users WHERE id = ?",
    [userId],
  );
  if (!user) throw new Error("کاربر یافت نشد.");
  if (user.username === "admin") {
    throw new Error("امکان حذف کاربر مدیر اصلی (admin) وجود ندارد.");
  }

  const result = await runAsync("DELETE FROM users WHERE id = ?", [userId]);
  return result.changes > 0;
};

export const getAllUsersWithRoles = async (): Promise<
  FrontendUserForDisplay[]
> => {
  await getDbInstance();
  const usersFromDb = await allTypedAsync<UserDisplayRow>(`
    SELECT u.id, u.username, u.roleId, r.name as roleName, u.firstName, u.lastName, u.dateAdded, u.avatarPath, u.lastLoginAt
    FROM users u
    JOIN roles r ON u.roleId = r.id
    ORDER BY u.username ASC
  `);
  return usersFromDb.map((user) => ({
    id: user.id,
    username: user.username,
    roleId: user.roleId,
    roleName: user.roleName,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    lastLogin: user.lastLoginAt ?? null,
    dateAdded: user.dateAdded,
    avatarUrl: resolvePublicAvatarUrl(user.avatarPath),
  }));
};

export const findUserByUsername = async (
  username: string,
): Promise<UserForDb | null> => {
  await getDbInstance();

  const hasColumn = async (table: "users", col: string): Promise<boolean> => {
    try {
      const rows = await allTypedAsync<TableInfoRow>(
        `PRAGMA table_info(${table});`,
      );
      return rows.some((row) => String(row.name) === col);
    } catch {
      return false;
    }
  };

  const hasDateAdded = await hasColumn("users", "dateAdded");
  const hasAvatarPath = await hasColumn("users", "avatarPath");
  const hasFirstName = await hasColumn("users", "firstName");
  const hasLastName = await hasColumn("users", "lastName");
  const hasLastLoginAt = await hasColumn("users", "lastLoginAt");
  const hasUsername = await hasColumn("users", "username");
  const hasEmail = await hasColumn("users", "email");
  const hasPasswordHash = await hasColumn("users", "passwordHash");
  const hasLegacyPassword = await hasColumn("users", "password");
  const hasRoleId = await hasColumn("users", "roleId");
  const hasRole = await hasColumn("users", "role");

  const selectDateAdded = hasDateAdded
    ? "u.dateAdded as dateAdded"
    : "NULL as dateAdded";
  const selectAvatarPath = hasAvatarPath
    ? "u.avatarPath as avatarPath"
    : "NULL as avatarPath";
  const selectFirstName = hasFirstName
    ? "u.firstName as firstName"
    : "NULL as firstName";
  const selectLastName = hasLastName
    ? "u.lastName as lastName"
    : "NULL as lastName";
  const selectLastLoginAt = hasLastLoginAt
    ? "u.lastLoginAt as lastLoginAt"
    : "NULL as lastLoginAt";
  const selectIdentity = hasUsername
    ? "u.username as username"
    : hasEmail
      ? "u.email as username"
      : '\"\" as username';
  const selectPassword = hasPasswordHash
    ? "u.passwordHash as passwordHash"
    : hasLegacyPassword
      ? "u.password as passwordHash"
      : "NULL as passwordHash";
  const selectRoleId = hasRoleId ? "u.roleId as roleId" : "1 as roleId";

  const whereClauses: string[] = [];
  const params: string[] = [];
  if (hasUsername) {
    whereClauses.push("u.username = ?");
    params.push(username);
  }
  if (hasEmail) {
    whereClauses.push("u.email = ?");
    params.push(username);
  }
  if (!whereClauses.length) return null;

  try {
    const roleJoin = hasRoleId ? "LEFT JOIN roles r ON u.roleId = r.id" : "";
    const selectRoleName = hasRoleId
      ? "r.name as roleName"
      : hasRole
        ? "u.role as roleName"
        : '\"Admin\" as roleName';

    const userRow = await getTypedAsync<LegacyUserLookupRow>(
      `SELECT u.id, ${selectIdentity}, ${selectPassword}, ${selectRoleId}, ${selectRoleName}, ${selectFirstName}, ${selectLastName}, ${selectLastLoginAt}, ${selectDateAdded}, ${selectAvatarPath}
       FROM users u
       ${roleJoin}
       WHERE ${whereClauses.join(" OR ")}
       LIMIT 1`,
      params,
    );

    if (userRow) {
      return {
        id: userRow.id,
        username: userRow.username,
        passwordHash: userRow.passwordHash ?? "",
        roleId: userRow.roleId,
        roleName: userRow.roleName || "Admin",
        firstName: userRow.firstName ?? null,
        lastName: userRow.lastName ?? null,
        lastLoginAt: userRow.lastLoginAt ?? null,
        dateAdded: userRow.dateAdded ?? "",
        avatarPath: userRow.avatarPath ?? null,
      };
    }
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    if (!message.includes("no such column") && !message.includes("no such table")) {
      throw error;
    }
  }

  return null;
};

export const upgradeLegacyPasswordHashInDb = async (
  userId: number,
  expectedLegacyPassword: string,
  upgradedPasswordHash: string,
): Promise<boolean> => {
  await getDbInstance();
  const columns = await allTypedAsync<TableInfoRow>(
    "PRAGMA table_info(users);",
  );
  const passwordColumn = columns.some(
    (column) => String(column.name) === "passwordHash",
  )
    ? "passwordHash"
    : columns.some((column) => String(column.name) === "password")
      ? "password"
      : null;
  if (!passwordColumn) return false;

  const result = await runAsync(
    `UPDATE users
     SET "${passwordColumn}" = ?
     WHERE id = ? AND "${passwordColumn}" = ?`,
    [upgradedPasswordHash, userId, expectedLegacyPassword],
  );
  return result.changes === 1;
};

export const changePasswordInDb = async (
  userId: number,
  { oldPassword, newPassword }: ChangePasswordPayload,
): Promise<boolean> => {
  await getDbInstance();
  const user = await getTypedAsync<PasswordHashRow>(
    "SELECT passwordHash FROM users WHERE id = ?",
    [userId],
  );
  if (!user) throw new Error("کاربر یافت نشد.");

  const isMatch = await bcryptjs.compare(oldPassword, user.passwordHash);
  if (!isMatch) throw new Error("کلمه عبور فعلی نامعتبر است.");

  const newPasswordHash = await bcryptjs.hash(newPassword, 10);
  const result = await runAsync(
    "UPDATE users SET passwordHash = ? WHERE id = ?",
    [newPasswordHash, userId],
  );
  return result.changes > 0;
};

export const resetUserPasswordInDb = async (
  userId: number,
  newPasswordPlain: string,
): Promise<boolean> => {
  await getDbInstance();
  const user = await getTypedAsync<UserIdRow & UsernameRow>(
    "SELECT id, username FROM users WHERE id = ?",
    [userId],
  );
  if (!user) throw new Error("کاربر برای تغییر رمز عبور یافت نشد.");

  const newPasswordHash = await bcryptjs.hash(newPasswordPlain, 10);
  const result = await runAsync(
    "UPDATE users SET passwordHash = ? WHERE id = ?",
    [newPasswordHash, userId],
  );
  return result.changes > 0;
};

export const updateAvatarPathInDb = async (
  userId: number,
  avatarPath: string | null,
): Promise<UserForDb> => {
  await getDbInstance();
  await runAsync("UPDATE users SET avatarPath = ? WHERE id = ?", [
    avatarPath,
    userId,
  ]);
  const updatedUser = await getTypedAsync<StoredUserRow>(
    "SELECT * FROM users WHERE id = ?",
    [userId],
  );
  if (!updatedUser) throw new Error("کاربر پس از ویرایش آواتار یافت نشد.");

  const role = await getTypedAsync<RoleNameRow>(
    "SELECT name FROM roles WHERE id = ?",
    [updatedUser.roleId],
  );
  return { ...updatedUser, roleName: requireRoleName(role) };
};
