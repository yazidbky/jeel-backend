import pool from "../../db/connection.js";

// Get all users
export const getAllUsers = async () => {
  const result = await pool.query(
    "SELECT id, uuid, name, email, created_at FROM users ORDER BY created_at DESC",
  );
  return result.rows;
};

// Get user by UUID
export const getUserByUUID = async (uuid) => {
  const result = await pool.query("SELECT * FROM users WHERE uuid = $1", [
    uuid,
  ]);
  return result.rows[0] || null;
};

// Update user
export const updateUser = async (uuid, { name, email }) => {
  const result = await pool.query(
    "UPDATE users SET name = $1, email = $2, updated_at = CURRENT_TIMESTAMP WHERE uuid = $3 RETURNING id, uuid, name, email, created_at",
    [name, email, uuid],
  );
  return result.rows[0] || null;
};

// Delete user
export const deleteUser = async (uuid) => {
  const result = await pool.query(
    "DELETE FROM users WHERE uuid = $1 RETURNING id, uuid, name, email",
    [uuid],
  );
  return result.rows[0] || null;
};

// Get user count
export const getUserCount = async () => {
  const result = await pool.query("SELECT COUNT(*) as count FROM users");
  return parseInt(result.rows[0].count, 10);
};
