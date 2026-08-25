import pool from "../../../core/db/connection.js";
import { generateOtp, hashValue } from "../../../core/utils/crypto.utils.js";

const OTP_EXPIRY_MINUTES = 10;

export const createPendingRegistration = async ({ name, email, passwordHash }) => {
  await pool.execute("DELETE FROM pending_registrations WHERE email = ?", [
    email.toLowerCase(),
  ]);

  const rawOtp = generateOtp();
  const otpHash = hashValue(rawOtp);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await pool.execute(
    `INSERT INTO pending_registrations (email, name, password_hash, otp_hash, expires_at)
     VALUES (?, ?, ?, ?, ?)`,
    [email.toLowerCase(), name, passwordHash, otpHash, expiresAt],
  );

  return rawOtp;
};

export const findPendingRegistration = async (email) => {
  const [rows] = await pool.execute(
    "SELECT * FROM pending_registrations WHERE email = ? ORDER BY created_at DESC LIMIT 1",
    [email.toLowerCase()],
  );
  return rows[0] || null;
};

export const incrementPendingAttempts = async (id) => {
  await pool.execute(
    "UPDATE pending_registrations SET attempts = attempts + 1 WHERE id = ?",
    [id],
  );
};

export const deletePendingRegistration = async (id) => {
  await pool.execute("DELETE FROM pending_registrations WHERE id = ?", [id]);
};
