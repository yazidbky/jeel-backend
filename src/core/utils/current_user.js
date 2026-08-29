import pool from "../db/connection.js";

export const getCurrentUser = async (req) => {
  const [rows] = await pool.execute(
    "SELECT id, uuid, name, email FROM users WHERE uuid = ? OR id = ? LIMIT 1",
    [req.user?.id, req.user?.id],
  );
  return rows[0] || null;
};
