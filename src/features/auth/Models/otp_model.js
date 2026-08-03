import pool from "../../../db/connection.js";
import { generateOtp, hashValue } from "../../../utils/crypto.util.js";

const OTP_EXPIRY_MINUTES = 10;

export const createOtp = async (userId, purpose) => {
  // Invalidate any previous unused OTPs for this user+purpose
  await pool.query(
    "UPDATE otps SET used = TRUE WHERE user_id = $1 AND purpose = $2 AND used = FALSE",
    [userId, purpose],
  );

  const rawOtp = generateOtp();
  const otpHash = hashValue(rawOtp);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await pool.query(
    `INSERT INTO otps (user_id, otp_hash, purpose, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [userId, otpHash, purpose, expiresAt],
  );

  return rawOtp; // raw value only returned here, to be emailed — never stored raw
};

export const verifyOtp = async (userId, purpose, submittedOtp) => {
  const result = await pool.query(
    `SELECT * FROM otps
     WHERE user_id = $1 AND purpose = $2 AND used = FALSE
     ORDER BY created_at DESC LIMIT 1`,
    [userId, purpose],
  );

  const otpRow = result.rows[0];
  if (!otpRow) return { valid: false, reason: "No active OTP found" };

  if (new Date(otpRow.expires_at) < new Date()) {
    return { valid: false, reason: "OTP expired" };
  }

  if (otpRow.attempts >= otpRow.max_attempts) {
    return { valid: false, reason: "Too many attempts" };
  }

  const submittedHash = hashValue(submittedOtp);
  if (submittedHash !== otpRow.otp_hash) {
    await pool.query(
      "UPDATE otps SET attempts = attempts + 1 WHERE id = $1",
      [otpRow.id],
    );
    return { valid: false, reason: "Incorrect OTP" };
  }

  await pool.query("UPDATE otps SET used = TRUE WHERE id = $1", [otpRow.id]);
  return { valid: true };
};