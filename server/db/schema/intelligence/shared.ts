import { allAsync, runAsync } from "../../query";

type TableColumnInfo = { name?: string };

export const ensureColumn = async (
  tableName: string,
  columnName: string,
  addColumnSql: string,
): Promise<void> => {
  const columns = (await allAsync(`PRAGMA table_info(${tableName})`)) as TableColumnInfo[];
  if (!columns.some((column) => column.name === columnName)) {
    await runAsync(addColumnSql);
  }
};
