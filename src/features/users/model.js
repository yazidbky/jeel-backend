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
  const result = await pool.query(
    "INSERT INTO users (uuid, name, email, password) VALUES ($1, $2, $3, $4) RETURNING *",
    [uuid, name, email, password],
  );

  return result.rows[0] ? getSafeUser(result.rows[0]) : null;
};

export const getAllUsers = async () => {
  const result = await pool.query("SELECT * FROM users");
  return result.rows.map(getSafeUser);
};

export const getUserById = async (userId) => {
  const result = await pool.query("SELECT * FROM users WHERE id = $1", [userId]);
  return result.rows[0] ? getSafeUser(result.rows[0]) : null;
};

export const deleteUserById = async (userId) => {
  const result = await pool.query(
    "DELETE FROM users WHERE id = $1 RETURNING *",
    [userId],
  );

  return result.rows[0] ? getSafeUser(result.rows[0]) : null;
};

export const updateUser = async (userId, { name, email }) => {
  const result = await pool.query(
    "UPDATE users SET name = $1, email = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *",
    [name, email, userId],
  );

  return result.rows[0] ? getSafeUser(result.rows[0]) : null;
};