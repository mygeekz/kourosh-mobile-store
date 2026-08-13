import type sqlite3 from "sqlite3";
import { getActiveDb } from "./connection";

export type SqliteBindValue =
  | string
  | number
  | bigint
  | boolean
  | Buffer
  | Uint8Array
  | null
  | undefined;

export type SqliteBindParams = readonly SqliteBindValue[];
export type SqliteRow = object;

const requireDb = (): sqlite3.Database => {
  const db = getActiveDb();
  if (!db) {
    throw new Error("Database not initialized. Call getDbInstance first.");
  }
  return db;
};

const getUnknownAsync = (
  sql: string,
  params: SqliteBindParams = [],
): Promise<unknown> => {
  return new Promise((resolve, reject) => {
    let db: sqlite3.Database;
    try {
      db = requireDb();
    } catch (error: unknown) {
      reject(error);
      return;
    }

    db.get(sql, [...params], (error: Error | null, row: unknown) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(row);
    });
  });
};

const allUnknownAsync = (
  sql: string,
  params: SqliteBindParams = [],
): Promise<unknown[]> => {
  return new Promise((resolve, reject) => {
    let db: sqlite3.Database;
    try {
      db = requireDb();
    } catch (error: unknown) {
      reject(error);
      return;
    }

    db.all(sql, [...params], (error: Error | null, rows: unknown[]) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(rows);
    });
  });
};

export const runAsync = (
  sql: string,
  params: SqliteBindParams = [],
): Promise<sqlite3.RunResult> => {
  return new Promise((resolve, reject) => {
    let db: sqlite3.Database;
    try {
      db = requireDb();
    } catch (error: unknown) {
      reject(error);
      return;
    }

    db.run(
      sql,
      [...params],
      function (this: sqlite3.RunResult, error: Error | null) {
        if (error) {
          reject(error);
          return;
        }
        resolve(this);
      },
    );
  });
};

export const getTypedAsync = async <TRow extends SqliteRow>(
  sql: string,
  params: SqliteBindParams = [],
): Promise<TRow | undefined> => {
  const row = await getUnknownAsync(sql, params);
  return row === undefined ? undefined : (row as TRow);
};

export const allTypedAsync = async <TRow extends SqliteRow>(
  sql: string,
  params: SqliteBindParams = [],
): Promise<TRow[]> => {
  return (await allUnknownAsync(sql, params)) as TRow[];
};

/**
 * @deprecated Use getTypedAsync<TRow>() and define the selected SQLite row shape.
 * Kept temporarily while legacy call sites are migrated domain by domain.
 */
export const getAsync = (
  sql: string,
  params: SqliteBindParams = [],
): Promise<any> => getUnknownAsync(sql, params);

/**
 * @deprecated Use allTypedAsync<TRow>() and define the selected SQLite row shape.
 * Kept temporarily while legacy call sites are migrated domain by domain.
 */
export const allAsync = (
  sql: string,
  params: SqliteBindParams = [],
): Promise<any[]> => allUnknownAsync(sql, params);

export const execAsync = (sql: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    let db: sqlite3.Database;
    try {
      db = requireDb();
    } catch (error: unknown) {
      reject(error);
      return;
    }

    db.exec(sql, function (this: sqlite3.Statement, error: Error | null) {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
};
