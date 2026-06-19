
import { db } from "./database";
import { AppError } from "./errors";
import { notifyLowInventory } from "./notificationService";

export function updateInventoryWithLog(productId: number, quantity: number) {
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT quantity, threshold FROM inventory WHERE productId = ?",
      [productId],
      (err, row: any) => {
        if (!row) return reject(new AppError("Product not found", 404));

        const oldQuantity = row.quantity;
        const threshold = row.threshold;

        db.run(
          "UPDATE inventory SET quantity = ? WHERE productId = ?",
          [quantity, productId],
          () => {
            db.run(
              "INSERT INTO inventory_logs (productId, oldQuantity, newQuantity, changedAt) VALUES (?, ?, ?, ?)",
              [productId, oldQuantity, quantity, new Date().toISOString()]
            );

            if (quantity <= threshold) {
              notifyLowInventory(productId, quantity);
            }

            resolve({
              productId,
              oldQuantity,
              newQuantity: quantity,
              alert: quantity <= threshold
            });
          }
        );
      }
    );
  });
}
