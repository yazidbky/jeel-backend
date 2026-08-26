import bcrypt from "bcryptjs";
import pool from "./connection.js";

const ensureColumn = async (tableName, columnDefinition, columnName) => {
  try {
    await pool.execute(`ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS ${columnDefinition}`);
  } catch (error) {
    if (!String(error?.code).includes("1060") && !String(error?.message).includes("Duplicate column")) {
      throw error;
    }
  }

  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS count FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
    [tableName, columnName],
  );

  return Number(rows[0]?.count || 0) > 0;
};

const createDefaultAdmin = async () => {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    return;
  }

  const [rows] = await pool.execute(
    "SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1",
    [adminEmail],
  );

  if (rows.length > 0) {
    await pool.execute(
      "UPDATE users SET role = 'admin', email_verified = TRUE WHERE LOWER(email) = LOWER(?)",
      [adminEmail],
    );
    return;
  }

  const passwordHash = bcrypt.hashSync(adminPassword, 10);
  const uuid = crypto.randomUUID();
  await pool.execute(
    "INSERT INTO users (uuid, name, email, password, role, email_verified) VALUES (?, ?, ?, ?, 'admin', TRUE)",
    [uuid, "Admin", adminEmail, passwordHash],
  );

  console.log("✓ Default admin user created");
};

const initializeDatabase = async () => {
  try {
    console.log("Initializing database...");

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        uuid VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'user',
        email_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    console.log("✓ Users table created successfully");

    await ensureColumn("users", "role VARCHAR(20) NOT NULL DEFAULT 'user'", "role");
    await ensureColumn("users", "email_verified BOOLEAN DEFAULT FALSE", "email_verified");

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS otps (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        otp_hash VARCHAR(255) NOT NULL,
        purpose VARCHAR(50) NOT NULL,
        attempts INT DEFAULT 0,
        max_attempts INT DEFAULT 5,
        used BOOLEAN DEFAULT FALSE,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    console.log("✓ OTP table created successfully");

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        token_hash VARCHAR(255) NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    console.log("✓ Reset token table created successfully");

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS pending_registrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        otp_hash VARCHAR(255) NOT NULL,
        attempts INT DEFAULT 0,
        max_attempts INT DEFAULT 5,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log("✓ Pending registration table created successfully");

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS token_blacklist (
        id INT AUTO_INCREMENT PRIMARY KEY,
        token_hash VARCHAR(255) NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log("✓ Token blacklist table created successfully");

    await pool.execute(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
    `);

    await pool.execute(`
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)
    `);

    await pool.execute(`
      CREATE INDEX IF NOT EXISTS idx_otps_user_purpose ON otps(user_id, purpose)
    `);

    await pool.execute(`
      CREATE INDEX IF NOT EXISTS idx_reset_tokens_user ON password_reset_tokens(user_id)
    `);

    await pool.execute(`
      CREATE INDEX IF NOT EXISTS idx_pending_registrations_email ON pending_registrations(email)
    `);

    await createDefaultAdmin();

    console.log("✓ Database initialization completed!");
  } catch (error) {
    console.error("Error initializing database:", error);
    throw error;
  }
};

export { initializeDatabase };
