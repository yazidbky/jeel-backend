import pool from "../../../db/connection.js";
import { generateResetToken, hashValue } from "../../../utils/crypto.util.js";

const RESET_TOKEN_EXPIRY_MINUTES = 10;

export const createResetToken = async (userId) => {
  // Invalidate previous unused reset tokens for this user
  await pool.query(
    "UPDATE password_reset_tokens SET used = TRUE WHERE user_id = $1 AND used = FALSE",
    [userId],
  );

  const rawToken = generateResetToken();
  const tokenHash = hashValue(rawToken);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000);

  await pool.query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt],
  );

  return rawToken;
};

export const verifyResetToken = async (userId, submittedToken) => {
  const result = await pool.query(
    `SELECT * FROM password_reset_tokens
     WHERE user_id = $1 AND used = FALSE
     ORDER BY created_at DESC LIMIT 1`,
    [userId],
  );

  const tokenRow = result.rows[0];
  if (!tokenRow) return { valid: false, reason: "No active reset token" };

  if (new Date(tokenRow.expires_at) < new Date()) {
    return { valid: false, reason: "Reset token expired" };
  }

  const submittedHash = hashValue(submittedToken);
  if (submittedHash !== tokenRow.token_hash) {
    return { valid: false, reason: "Invalid reset token" };
  }

  await pool.query(
    "UPDATE password_reset_tokens SET used = TRUE WHERE id = $1",
    [tokenRow.id],
  );
  return { valid: true };
};