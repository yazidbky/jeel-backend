import pool from "../../../core/db/connection.js";
import { generateOtp, hashValue } from "../../../core/utils/crypto.utils.js";

const OTP_EXPIRY_MINUTES = 10;

export const createPendingRegistration = async ({ name, email, passwordHash }) => {
  await pool.query("DELETE FROM pending_registrations WHERE email = $1", [
    email.toLowerCase(),
  ]);

  const rawOtp = generateOtp();
  const otpHash = hashValue(rawOtp);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await pool.query(
    `INSERT INTO pending_registrations (email, name, password_hash, otp_hash, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [email.toLowerCase(), name, passwordHash, otpHash, expiresAt],
  );

  return rawOtp;
};

export const findPendingRegistration = async (email) => {
  const result = await pool.query(
    "SELECT * FROM pending_registrations WHERE email = $1 ORDER BY created_at DESC LIMIT 1",
    [email.toLowerCase()],
  );
  return result.rows[0] || null;
};

export const incrementPendingAttempts = async (id) => {
  await pool.query(
    "UPDATE pending_registrations SET attempts = attempts + 1 WHERE id = $1",
    [id],
  );
};

export const deletePendingRegistration = async (id) => {
  await pool.query("DELETE FROM pending_registrations WHERE id = $1", [id]);
};
