
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { db } from "./database";
import { AppError } from "./errors";

export async function register(email: string, password: string) {
  const hash = await bcrypt.hash(password, 10);
  return new Promise((resolve, reject) => {
    db.run(
      "INSERT INTO users (email, password, role) VALUES (?, ?, ?)",
      [email, hash, "ADMIN"],
      function (err) {
        if (err) reject(new AppError("User exists", 409));
        else resolve({ id: this.lastID, email });
      }
    );
  });
}

export async function login(email: string, password: string) {
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT * FROM users WHERE email = ?",
      [email],
      async (err, row: any) => {
        if (!row) return reject(new AppError("Invalid credentials", 401));
        const ok = await bcrypt.compare(password, row.password);
        if (!ok) return reject(new AppError("Invalid credentials", 401));
        const token = jwt.sign(
          { id: row.id, role: row.role },
          process.env.JWT_SECRET || "secret",
          { expiresIn: "1d" }
        );
        resolve({ token });
      }
    );
  });
}
