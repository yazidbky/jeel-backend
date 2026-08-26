import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import pool from "./connection.js";
import { runMigrations } from "./migrationRunner.js";

const requiredDatabaseVariables = ["DB_HOST", "DB_USER", "DB_NAME"];

const validateConfiguration = () => {
  const missingVariables = requiredDatabaseVariables.filter((name) => !process.env[name]);

  if (missingVariables.length > 0) {
    throw new Error(`Missing required database configuration: ${missingVariables.join(", ")}`);
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if ((adminEmail && !adminPassword) || (!adminEmail && adminPassword)) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be provided together");
  }
};

const createDefaultAdmin = async () => {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) return;

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [roleRows] = await connection.execute(
      "SELECT id FROM roles WHERE name = 'admin' LIMIT 1",
    );

    if (roleRows.length === 0) {
      throw new Error("Admin role is missing after migrations");
    }

    const [userRows] = await connection.execute(
      "SELECT id FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1 FOR UPDATE",
      [adminEmail],
    );

    let userId;

    if (userRows.length > 0) {
      userId = userRows[0].id;
      await connection.execute(
        "UPDATE users SET role = 'admin', email_verified = TRUE WHERE id = ?",
        [userId],
      );
    } else {
      const passwordHash = await bcrypt.hash(adminPassword, 12);
      const uuid = randomUUID();
      const [result] = await connection.execute(
        "INSERT INTO users (uuid, name, email, password, role, email_verified) VALUES (?, ?, ?, ?, 'admin', TRUE)",
        [uuid, "Admin", adminEmail, passwordHash],
      );
      userId = result.insertId;
      console.log("✓ Default admin user created");
    }

    await connection.execute(
      "INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)",
      [userId, roleRows[0].id],
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const initializeDatabase = async () => {
  try {
    console.log("Initializing database...");
    validateConfiguration();
    await runMigrations();
    await createDefaultAdmin();
    console.log("✓ Database initialization completed!");
  } catch (error) {
    console.error("Error initializing database:", error);
    await pool.end();
    throw error;
  }
};

export { initializeDatabase };
