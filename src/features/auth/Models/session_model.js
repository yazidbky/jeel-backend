import pool from "../../../core/db/connection.js";
import { hashValue } from "../../../core/utils/crypto.utils.js";

export const createSessionRecord = async ({ userId, accessToken, refreshToken, userAgent, ipAddress }) => {
  const accessHash = hashValue(accessToken);
  const refreshHash = hashValue(refreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await pool.execute(
    "INSERT INTO sessions (user_id, access_token_hash, refresh_token_hash, user_agent, ip_address, expires_at) VALUES (?, ?, ?, ?, ?, ?)",
    [userId, accessHash, refreshHash, userAgent || null, ipAddress || null, expiresAt],
  );

  return { accessHash, refreshHash, expiresAt };
};

export const revokeSessionByUser = async (userId) => {
  await pool.execute("UPDATE sessions SET revoked = TRUE WHERE user_id = ?", [userId]);
};

export const getActiveSessions = async (userId) => {
  const [rows] = await pool.execute(
    "SELECT * FROM sessions WHERE user_id = ? AND revoked = FALSE AND expires_at > NOW() ORDER BY created_at DESC",
    [userId],
  );

  return rows;
};
