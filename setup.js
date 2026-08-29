import pool from "./src/core/db/connection.js";
import app from "./src/app.js";
import request from "supertest";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import realPool from "./src/core/db/connection.js";

const testPool = {
  execute: (...args) => realPool.execute(...args),
  query: async (sql, values = []) => {
    const mysqlSql = sql.replace(/\$(\d+)/g, "?");
    const [rows] = await realPool.execute(mysqlSql, values);
    if (/^\s*SELECT/i.test(mysqlSql)) return { rows };
    return { rows, rowCount: rows.affectedRows };
  },
  end: () => realPool.end(),
};

// Creates a signed JWT the same way your authMiddleware expects it.
export function makeAuthToken(userId, overrides = {}) {
  return jwt.sign(
    { id: userId, type: "access", ...overrides },
    process.env.JWT_SECRET || "dev-secret",
    { expiresIn: '15m' }
  );
}

// Inserts a bare-minimum user directly into the DB for test fixtures,
// bypassing the registration flow so feature tests stay isolated from auth.
export async function createTestUser(overrides = {}) {
  const email = overrides.email || `user_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com`;
  const [result] = await pool.execute(
    `INSERT INTO users (uuid, name, email, password, email_verified)
     VALUES (?, ?, ?, ?, TRUE)`,
    [randomUUID(), overrides.name || `Test User ${Date.now()}`, email, "irrelevant_hash"],
  );
  const [rows] = await pool.execute("SELECT id, uuid, email, name FROM users WHERE id = ?", [result.insertId]);
  return rows[0];
}

export async function createTestPost(userId, overrides = {}) {
  const [result] = await pool.execute(
    `INSERT INTO posts (user_id, caption, created_at)
     VALUES (?, ?, NOW())`,
    [userId, overrides.caption || "Test post caption"],
  );
  const [rows] = await pool.execute("SELECT * FROM posts WHERE id = ?", [result.insertId]);
  return rows[0];
}

// Wipes tables between tests. Order matters due to FK constraints —
// children before parents.
export async function cleanupDb() {
  await pool.execute("DELETE FROM shares");
  await pool.execute("DELETE FROM likes");
  await pool.execute("DELETE FROM comments");
  await pool.execute("DELETE FROM media");
  await pool.execute("DELETE FROM posts");
  await pool.execute("DELETE FROM follows");
  await pool.execute("DELETE FROM users WHERE email LIKE '%@test.com'");
}

export { app, request, testPool as pool };
