// Role bootstrap only. The first administrator is created interactively through
// the one-time initial setup flow; no deployable build contains default credentials.
import { getAsync, runAsync } from "../query";

export const ADMIN_ROLE_NAME = "Admin";

export const SALESPERSON_ROLE_NAME = "Salesperson";

export const MANAGER_ROLE_NAME = "Manager";

export const WAREHOUSE_ROLE_NAME = "Warehouse";

export const TECHNICIAN_ROLE_NAME = "Technician";

export const MARKETER_ROLE_NAME = "Marketer";

export const seedInitialRoles = async (): Promise<void> => {
  // Ensure Admin Role
  let adminRole = await getAsync("SELECT id FROM roles WHERE name = ?", [
    ADMIN_ROLE_NAME,
  ]);
  if (!adminRole) {
    const adminRoleResult = await runAsync(
      "INSERT INTO roles (name) VALUES (?)",
      [ADMIN_ROLE_NAME],
    );
    adminRole = { id: adminRoleResult.lastID };
    console.log(`Role "${ADMIN_ROLE_NAME}" created with ID: ${adminRole.id}`);
  }

  // Ensure Salesperson Role
  let salespersonRole = await getAsync("SELECT id FROM roles WHERE name = ?", [
    SALESPERSON_ROLE_NAME,
  ]);
  if (!salespersonRole) {
    const salespersonRoleResult = await runAsync(
      "INSERT INTO roles (name) VALUES (?)",
      [SALESPERSON_ROLE_NAME],
    );
    salespersonRole = { id: salespersonRoleResult.lastID };
    console.log(
      `Role "${SALESPERSON_ROLE_NAME}" created with ID: ${salespersonRole.id}`,
    );
  }

  // Ensure Manager Role
  let managerRole = await getAsync("SELECT id FROM roles WHERE name = ?", [
    MANAGER_ROLE_NAME,
  ]);
  if (!managerRole) {
    const managerRoleResult = await runAsync(
      "INSERT INTO roles (name) VALUES (?)",
      [MANAGER_ROLE_NAME],
    );
    managerRole = { id: managerRoleResult.lastID };
    console.log(
      `Role "${MANAGER_ROLE_NAME}" created with ID: ${managerRole.id}`,
    );
  }
  // Ensure Warehouse Role
  let warehouseRole = await getAsync("SELECT id FROM roles WHERE name = ?", [
    WAREHOUSE_ROLE_NAME,
  ]);
  if (!warehouseRole) {
    const warehouseRoleResult = await runAsync(
      "INSERT INTO roles (name) VALUES (?)",
      [WAREHOUSE_ROLE_NAME],
    );
    warehouseRole = { id: warehouseRoleResult.lastID };
    console.log(
      `Role "${WAREHOUSE_ROLE_NAME}" created with ID: ${warehouseRole.id}`,
    );
  }
  // Ensure Technician Role
  let technicianRole = await getAsync("SELECT id FROM roles WHERE name = ?", [
    TECHNICIAN_ROLE_NAME,
  ]);
  if (!technicianRole) {
    const technicianRoleResult = await runAsync(
      "INSERT INTO roles (name) VALUES (?)",
      [TECHNICIAN_ROLE_NAME],
    );
    technicianRole = { id: technicianRoleResult.lastID };
    console.log(
      `Role "${TECHNICIAN_ROLE_NAME}" created with ID: ${technicianRole.id}`,
    );
  }
  // Ensure Marketer Role
  let marketerRole = await getAsync("SELECT id FROM roles WHERE name = ?", [
    MARKETER_ROLE_NAME,
  ]);
  if (!marketerRole) {
    const marketerRoleResult = await runAsync(
      "INSERT INTO roles (name) VALUES (?)",
      [MARKETER_ROLE_NAME],
    );
    marketerRole = { id: marketerRoleResult.lastID };
    console.log(
      `Role "${MARKETER_ROLE_NAME}" created with ID: ${marketerRole.id}`,
    );
  }

};
