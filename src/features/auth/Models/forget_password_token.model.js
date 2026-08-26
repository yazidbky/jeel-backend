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

export const resetPasswordWithToken = async (submittedToken, passwordHash) => {
  const tokenHash = hashValue(submittedToken);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [tokenRows] = await connection.execute(
      `SELECT user_id FROM password_reset_tokens
       WHERE token_hash = ? AND used = FALSE AND expires_at > NOW()
       LIMIT 1 FOR UPDATE`,
      [tokenHash],
    );

    if (tokenRows.length === 0) {
      await connection.rollback();
      return false;
    }

    const userId = tokenRows[0].user_id;
    await connection.execute(
      "UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [passwordHash, userId],
    );
    await connection.execute(
      "UPDATE password_reset_tokens SET used = TRUE WHERE token_hash = ?",
      [tokenHash],
    );
    await connection.execute(
      "UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = ? AND revoked = FALSE",
      [userId],
    );
    await connection.execute(
      "UPDATE sessions SET revoked = TRUE WHERE user_id = ? AND revoked = FALSE",
      [userId],
    );

    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
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

  return { valid: true };
};

export const consumeResetToken = async (userId, submittedToken) => {
  const tokenHash = hashValue(submittedToken);
  const [result] = await pool.execute(
    `UPDATE password_reset_tokens
     SET used = TRUE
     WHERE user_id = ? AND token_hash = ? AND used = FALSE AND expires_at > NOW()` ,
    [userId, tokenHash],
  );

  return result.affectedRows > 0;
};

export const findValidResetToken = async (submittedToken) => {
  const tokenHash = hashValue(submittedToken);
  const [rows] = await pool.execute(
    `SELECT user_id FROM password_reset_tokens
     WHERE token_hash = ? AND used = FALSE AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [tokenHash],
  );

  return rows[0] || null;
};

export const consumeResetTokenByValue = async (submittedToken) => {
  const tokenHash = hashValue(submittedToken);
  const [result] = await pool.execute(
    `UPDATE password_reset_tokens
     SET used = TRUE
     WHERE token_hash = ? AND used = FALSE AND expires_at > NOW()` ,
    [tokenHash],
  );

  return result.affectedRows > 0;
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