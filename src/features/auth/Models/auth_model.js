import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import pool from "../../../core/db/connection.js";
import { hashValue } from "../../../core/utils/crypto.utils.js";
import { v4 as uuidv4 } from "uuid";

const getSafeUser = (user) => ({
  id: user.uuid,
  name: user.name,
  email: user.email,
  role: user.role || "user",
  emailVerified: Boolean(user.email_verified),
  createdAt: user.created_at,
});

export const findUserByEmail = async (email) => {
  const [rows] = await pool.execute(
    "SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1",
    [email],
  );
  return rows[0] || null;
};

export const createUser = async ({ name, email, passwordHash, role = "user", emailVerified = false }) => {
  const uuid = uuidv4();

  await pool.execute(
    "INSERT INTO users (uuid, name, email, password, role, email_verified) VALUES (?, ?, ?, ?, ?, ?)",
    [uuid, name, email.toLowerCase(), passwordHash, role, emailVerified ? 1 : 0],
  );

  const [rows] = await pool.execute(
    "SELECT * FROM users WHERE id = LAST_INSERT_ID() LIMIT 1",
  );

  const newUser = rows[0];
  return {
    user: getSafeUser(newUser),
    token: generateToken(newUser),
  };
};

export const checkPassword = async (email, password) => {
  const user = await findUserByEmail(email);
  if (!user) return null;

  const isValidPassword = bcrypt.compareSync(password, user.password);
  if (!isValidPassword) return null;

  return user;
};

export const generateAccessToken = (user) => {
  return jwt.sign(
    {
      id: user.uuid,
      email: user.email,
      name: user.name,
      role: user.role || "user",
      type: "access",
      jti: crypto.randomUUID(),
    },
    process.env.JWT_SECRET || "dev-secret",
    { expiresIn: "15m" },
  );
};

export const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      id: user.uuid,
      email: user.email,
      role: user.role || "user",
      type: "refresh",
      jti: crypto.randomUUID(),
    },
    process.env.JWT_SECRET || "dev-secret",
    { expiresIn: "7d" },
  );
};

export const generateToken = (user) => generateAccessToken(user);

export const createRefreshTokenRecord = async (userId, refreshToken) => {
  const tokenHash = hashValue(refreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await pool.execute(
    "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)",
    [userId, tokenHash, expiresAt],
  );

  return { tokenHash, expiresAt };
};

export const verifyRefreshTokenRecord = async (userId, refreshToken) => {
  const tokenHash = hashValue(refreshToken);
  const [rows] = await pool.execute(
    "SELECT * FROM refresh_tokens WHERE user_id = ? AND token_hash = ? AND revoked = FALSE AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1",
    [userId, tokenHash],
  );

  return rows.length > 0;
};

export const rotateRefreshToken = async (userId, oldRefreshToken, newRefreshToken) => {
  const oldHash = hashValue(oldRefreshToken);

  await pool.execute(
    "UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = ? AND token_hash = ? AND revoked = FALSE",
    [userId, oldHash],
  );

  await createRefreshTokenRecord(userId, newRefreshToken);
};

export const getUserById = async (id) => {
  const [rows] = await pool.execute("SELECT * FROM users WHERE uuid = ? LIMIT 1", [id]);
  return rows[0] ? getSafeUser(rows[0]) : null;
};

export const updateUserPassword = async (userId, passwordHash) => {
  await pool.execute(
    "UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [passwordHash, userId],
  );
};
