import pool from "../../../core/db/connection.js";
import { generateOtp, hashValue } from "../../../core/utils/crypto.utils.js";

const OTP_EXPIRY_MINUTES = 10;

export const createOtp = async (userId, purpose) => {
  await pool.execute(
    "UPDATE otps SET used = TRUE WHERE user_id = ? AND purpose = ? AND used = FALSE",
    [userId, purpose],
  );

  const rawOtp = generateOtp();
  const otpHash = hashValue(rawOtp);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await pool.execute(
    `INSERT INTO otps (user_id, otp_hash, purpose, expires_at)
     VALUES (?, ?, ?, ?)`,
    [userId, otpHash, purpose, expiresAt],
  );

  return rawOtp;
};

export const verifyOtp = async (userId, purpose, submittedOtp) => {
  const [rows] = await pool.execute(
    `SELECT * FROM otps
     WHERE user_id = ? AND purpose = ? AND used = FALSE
     ORDER BY created_at DESC LIMIT 1`,
    [userId, purpose],
  );

  const otpRow = rows[0];
  if (!otpRow) return { valid: false, reason: "No active OTP found" };

  if (new Date(otpRow.expires_at) < new Date()) {
    return { valid: false, reason: "OTP expired" };
  }

  if (otpRow.attempts >= otpRow.max_attempts) {
    return { valid: false, reason: "Too many attempts" };
  }

  const submittedHash = hashValue(submittedOtp);
  if (submittedHash !== otpRow.otp_hash) {
    await pool.execute(
      "UPDATE otps SET attempts = attempts + 1 WHERE id = ?",
      [otpRow.id],
    );
    return { valid: false, reason: "Incorrect OTP" };
  }

  await pool.execute("UPDATE otps SET used = TRUE WHERE id = ?", [otpRow.id]);
  return { valid: true };
};