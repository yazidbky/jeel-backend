import pool from "../../../core/db/connection.js";
import { generateResetToken, hashValue } from "../../../core/utils/crypto.utils.js";

const RESET_TOKEN_EXPIRY_MINUTES = 10;

export const createResetToken = async (userId) => {
  await pool.execute(
    "UPDATE password_reset_tokens SET used = TRUE WHERE user_id = ? AND used = FALSE",
    [userId],
  );

  const rawToken = generateResetToken();
  const tokenHash = hashValue(rawToken);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000);

  await pool.execute(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES (?, ?, ?)`,
    [userId, tokenHash, expiresAt],
  );

  return rawToken;
};

export const verifyResetToken = async (userId, submittedToken) => {
  const [rows] = await pool.execute(
    `SELECT * FROM password_reset_tokens
     WHERE user_id = ? AND used = FALSE
     ORDER BY created_at DESC LIMIT 1`,
    [userId],
  );

  const tokenRow = rows[0];
  if (!tokenRow) return { valid: false, reason: "No active reset token" };

  if (new Date(tokenRow.expires_at) < new Date()) {
    return { valid: false, reason: "Reset token expired" };
  }

  const submittedHash = hashValue(submittedToken);
  if (submittedHash !== tokenRow.token_hash) {
    return { valid: false, reason: "Invalid reset token" };
  }

  await pool.execute(
    "UPDATE password_reset_tokens SET used = TRUE WHERE id = ?",
    [tokenRow.id],
  );
  return { valid: true };
};

export const consumePasswordChangeAuthorization = async (userId) => {
  const [result] = await pool.execute(
    `UPDATE password_reset_tokens
     SET used = TRUE
     WHERE user_id = ? AND used = FALSE AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [userId],
  );

  return result.affectedRows > 0;
};