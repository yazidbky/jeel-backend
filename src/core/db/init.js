import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import pool from "./connection.js";
import { runMigrations } from "./migrationRunner.js";

const createDefaultAdmin = async () => {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    return;
  }

  const [existingUser] = await pool.execute(
    "SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1",
    [adminEmail],
  );

  if (existingUser.length > 0) {
    await pool.execute(
      "UPDATE users SET role = 'admin', email_verified = TRUE WHERE LOWER(email) = LOWER(?)",
      [adminEmail],
    );

    const [roleRow] = await pool.execute("SELECT id FROM roles WHERE name = 'admin' LIMIT 1");
    if (roleRow.length > 0) {
      await pool.execute(
        "INSERT IGNORE INTO user_roles (user_id, role_id) SELECT id, ? FROM users WHERE LOWER(email) = LOWER(?)",
        [roleRow[0].id, adminEmail],
      );
    }

    return;
  }

  const passwordHash = bcrypt.hashSync(adminPassword, 10);
  const uuid = randomUUID();

  await pool.execute(
    "INSERT INTO users (uuid, name, email, password, role, email_verified) VALUES (?, ?, ?, ?, 'admin', TRUE)",
    [uuid, "Admin", adminEmail, passwordHash],
  );

  const [adminRecord] = await pool.execute(
    "SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1",
    [adminEmail],
  );

  const [roleRow] = await pool.execute("SELECT id FROM roles WHERE name = 'admin' LIMIT 1");
  if (roleRow.length > 0 && adminRecord.length > 0) {
    await pool.execute(
      "INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)",
      [adminRecord[0].id, roleRow[0].id],
    );
  }

  console.log("✓ Default admin user created");
};

const initializeDatabase = async () => {
  try {
    console.log("Initializing database...");
    await runMigrations();
    await createDefaultAdmin();
    console.log("✓ Database initialization completed!");
  } catch (error) {
    console.error("Error initializing database:", error);
    throw error;
  }
};

export { initializeDatabase };
