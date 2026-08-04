import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../../../core/db/connection.js";
import { v4 as uuidv4 } from "uuid";

const getSafeUser = (user) => ({
  id: user.uuid,
  name: user.name,
  email: user.email,
  createdAt: user.created_at,
});

export const findUserByEmail = async (email) => {
  const result = await pool.query(
    "SELECT * FROM users WHERE LOWER(email) = LOWER($1)",
    [email],
  );
  return result.rows[0] || null;
};

// Called only after OTP is verified (register flow)
export const createUser = async ({ name, email, passwordHash }) => {
  const uuid = uuidv4();

  const result = await pool.query(
    "INSERT INTO users (uuid, name, email, password) VALUES ($1, $2, $3, $4) RETURNING *",
    [uuid, name, email.toLowerCase(), passwordHash],
  );

  const newUser = result.rows[0];
  return {
    user: getSafeUser(newUser),
    token: generateToken(newUser),
  };
};

// Checks password only, no token issued (token comes after OTP)
export const checkPassword = async (email, password) => {
  const user = await findUserByEmail(email);
  if (!user) return null;

  const isValidPassword = bcrypt.compareSync(password, user.password);
  if (!isValidPassword) return null;

  return user;
};

export const generateToken = (user) => {
  return jwt.sign(
    { id: user.uuid, email: user.email, name: user.name },
    process.env.JWT_SECRET || "dev-secret",
    { expiresIn: "1h" },
  );
};

export const getUserById = async (id) => {
  const result = await pool.query("SELECT * FROM users WHERE uuid = $1", [id]);
  return result.rows[0] ? getSafeUser(result.rows[0]) : null;
};

export const updateUserPassword = async (userId, passwordHash) => {
  await pool.query(
    "UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
    [passwordHash, userId],
  );
};
