import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../../db/connection.js";
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

export const createUser = async ({ name, email, password }) => {
  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    throw new Error("User already exists");
  }

  const uuid = uuidv4();
  const hashedPassword = bcrypt.hashSync(password, 10);

  const result = await pool.query(
    "INSERT INTO users (uuid, name, email, password) VALUES ($1, $2, $3, $4) RETURNING *",
    [uuid, name, email.toLowerCase(), hashedPassword],
  );

  const newUser = result.rows[0];
  return {
    user: getSafeUser(newUser),
    token: generateToken(newUser),
  };
};

export const verifyUser = async (email, password) => {
  const user = await findUserByEmail(email);
  if (!user) return null;

  const isValidPassword = bcrypt.compareSync(password, user.password);
  if (!isValidPassword) return null;

  return {
    user: getSafeUser(user),
    token: generateToken(user),
  };
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

// export const getUserById = (id) => {
//   const user = users.find((item) => item.id === id);
//   return user ? getSafeUser(user) : null;
// };
