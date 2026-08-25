import pool from "../../core/db/connection.js";
import { v4 as uuidv4 } from "uuid";

const getSafeUser = (user) => ({
  id: user.id,
  uuid: user.uuid,
  name: user.name,
  email: user.email,
  createdAt: user.created_at,
});

export const createUser = async ({ name, email, password }) => {
  const uuid = uuidv4();
  await pool.execute(
    "INSERT INTO users (uuid, name, email, password) VALUES (?, ?, ?, ?)",
    [uuid, name, email, password],
  );

  const [rows] = await pool.execute("SELECT * FROM users WHERE id = LAST_INSERT_ID() LIMIT 1");
  return rows[0] ? getSafeUser(rows[0]) : null;
};

export const getAllUsers = async () => {
  const [rows] = await pool.execute("SELECT * FROM users");
  return rows.map(getSafeUser);
};

export const getUserById = async (userId) => {
  const [rows] = await pool.execute("SELECT * FROM users WHERE id = ? LIMIT 1", [userId]);
  return rows[0] ? getSafeUser(rows[0]) : null;
};

export const deleteUserById = async (userId) => {
  const [rows] = await pool.execute("SELECT * FROM users WHERE id = ? LIMIT 1", [userId]);
  if (!rows[0]) return null;

  await pool.execute("DELETE FROM users WHERE id = ?", [userId]);
  return getSafeUser(rows[0]);
};

export const updateUser = async (userId, { name, email }) => {
  await pool.execute(
    "UPDATE users SET name = ?, email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [name, email, userId],
  );

  const [rows] = await pool.execute("SELECT * FROM users WHERE id = ? LIMIT 1", [userId]);
  return rows[0] ? getSafeUser(rows[0]) : null;
};