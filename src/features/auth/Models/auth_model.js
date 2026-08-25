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
  const [rows] = await pool.execute(
    "SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1",
    [email],
  );
  return rows[0] || null;
};

export const createUser = async ({ name, email, passwordHash }) => {
  const uuid = uuidv4();

  await pool.execute(
    "INSERT INTO users (uuid, name, email, password) VALUES (?, ?, ?, ?)",
    [uuid, name, email.toLowerCase(), passwordHash],
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

export const generateToken = (user) => {
  return jwt.sign(
    { id: user.uuid, email: user.email, name: user.name },
    process.env.JWT_SECRET || "dev-secret",
    { expiresIn: "1h" },
  );
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
