import { createUser, getUserById, verifyUser } from "./model.js";

const isValidEmail = (value) => /\S+@\S+\.\S+/.test(value);

export const register = async (req, res) => {
  const { name, email, password } = req.body || {};

  if (!name || !email || !password) {
    return res
      .status(400)
      .json({ message: "Name, email, and password are required" });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ message: "Please provide a valid email" });
  }

  if (password.length < 6) {
    return res
      .status(400)
      .json({ message: "Password must be at least 6 characters" });
  }

  try {
    const result = await createUser({ name, email, password });
    return res
      .status(201)
      .json({ message: "User registered successfully", ...result });
    console.log("User registered successfully:", result);
  } catch (error) {
    if (error.message === "User already exists") {
      return res.status(409).json({ message: "User already exists" });
    }

    return res.status(500).json({ message: "Registration failed" });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const result = await verifyUser(email, password);

    if (!result) {
      console.log("Invalid email or password for email:", email);
      return res.status(401).json({ message: "Invalid email or password" });
    }
    console.log("Login successful:", result);
    return res.status(200).json({ message: "Login successful", ...result });
  } catch (error) {
    return res.status(500).json({ message: "Login failed" });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await getUserById(req.user?.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ user });
  } catch (error) {
    return res.status(500).json({ message: "Failed to retrieve user" });
  }
};
