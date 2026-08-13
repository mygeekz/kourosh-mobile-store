
import { db } from "./database";
import { AppError } from "./errors";

export function getInventory() {
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM inventory", [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

export function updateInventory(productId: number, quantity: number) {
  return new Promise((resolve, reject) => {
    db.run(
      "UPDATE inventory SET quantity = ? WHERE productId = ?",
      [quantity, productId],
      function (err) {
        if (this.changes === 0) reject(new AppError("Product not found", 404));
        else resolve({ productId, quantity });
      }
    );
  });
}
