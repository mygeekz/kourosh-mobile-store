import type { Service } from "../../types";
import { allAsync, getAsync, runAsync } from "../db/query";

export const getAllServicesFromDb = async (): Promise<Service[]> => {
  return await allAsync(`SELECT * FROM services ORDER BY name ASC`);
};

export const addServiceToDb = async (
  service: Omit<Service, "id">,
): Promise<Service> => {
  const { name, description, price } = service;
  try {
    const result = await runAsync(
      `INSERT INTO services (name, description, price) VALUES (?, ?, ?)`,
      [name, description, price],
    );
    return await getAsync("SELECT * FROM services WHERE id = ?", [
      result.lastID,
    ]);
  } catch (err: any) {
    if (err.message.includes("UNIQUE constraint failed")) {
      throw new Error("نام این خدمت تکراری است.");
    }
    throw new Error(`خطا در عملیاتی پایگاه داده: ${err.message}`);
  }
};

export const updateServiceInDb = async (
  id: number,
  service: Omit<Service, "id">,
): Promise<Service> => {
  const { name, description, price } = service;
  try {
    await runAsync(
      `UPDATE services SET name = ?, description = ?, price = ? WHERE id = ?`,
      [name, description, price, id],
    );
    const updatedService = await getAsync(
      "SELECT * FROM services WHERE id = ?",
      [id],
    );
    if (!updatedService) throw new Error("خدمت برای ویرایش یافت نشد.");
    return updatedService;
  } catch (err: any) {
    if (err.message.includes("UNIQUE constraint failed")) {
      throw new Error("نام این خدمت تکراری است.");
    }
    throw new Error(`خطا در عملیاتی پایگاه داده: ${err.message}`);
  }
};

export const deleteServiceFromDb = async (id: number): Promise<boolean> => {
  const result = await runAsync(`DELETE FROM services WHERE id = ?`, [id]);
  if (result.changes === 0) {
    throw new Error("خدمت برای حذف یافت نشد.");
  }
  return result.changes > 0;
};
