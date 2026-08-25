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
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
    `);

    console.log("✓ Email index created successfully");

    console.log("Database initialization completed!");
  } catch (error) {
    console.error("Error initializing database:", error);
    throw error;
  }
};

export { initializeDatabase };
