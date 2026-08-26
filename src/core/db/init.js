import pool from "./connection.js";

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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    console.log("✓ Users table created successfully");

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
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
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

    console.log("✓ Database initialization completed!");
  } catch (error) {
    console.error("Error initializing database:", error);
    throw error;
  }
};

export { initializeDatabase };
