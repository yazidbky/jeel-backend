import bcrypt from "bcryptjs";
import {
  createUser,
  checkPassword,
  getUserById,
  findUserByEmail,
  generateToken,
  updateUserPassword,
} from "../Models/auth_model.js";
import {
  createPendingRegistration,
  findPendingRegistration,
  incrementPendingAttempts,
  deletePendingRegistration,
} from "../Models/pendingRegistration.model.js";
import { createOtp, verifyOtp } from "../Models/otp_model.js";
import { sendOtpEmail } from "../Services/email_service.js";
import { hashValue } from "../../../core/utils/crypto.utils.js";

const isValidEmail = (value) => /\S+@\S+\.\S+/.test(value);

// ===== REGISTER STEP 1: validate + send OTP =====
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
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const otp = await createPendingRegistration({ name, email, passwordHash });
    await sendOtpEmail(email, otp);

    return res.status(200).json({
      message: "OTP sent to your email. Verify to complete registration.",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Registration failed" });
  }
};

// ===== REGISTER STEP 2: verify OTP, create real user =====
export const verifyRegisterOtp = async (req, res) => {
  const { email, otp } = req.body || {};
  if (!email || !otp) {
    return res.status(400).json({ message: "Email and OTP are required" });
  }

  try {
    const pending = await findPendingRegistration(email);
    if (!pending) {
      return res.status(400).json({ message: "No pending registration found" });
    }
    if (new Date(pending.expires_at) < new Date()) {
      return res.status(400).json({ message: "OTP expired, please register again" });
    }
    if (pending.attempts >= pending.max_attempts) {
      return res.status(400).json({ message: "Too many attempts, please register again" });
    }

    const submittedHash = hashValue(otp);
    if (submittedHash !== pending.otp_hash) {
      await incrementPendingAttempts(pending.id);
      return res.status(400).json({ message: "Incorrect OTP" });
    }

    const result = await createUser({
      name: pending.name,
      email: pending.email,
      passwordHash: pending.password_hash,
    });
    await deletePendingRegistration(pending.id);

    return res
      .status(201)
      .json({ message: "User registered successfully", ...result });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Verification failed" });
  }
};

// ===== LOGIN STEP 1: check password, send OTP =====
export const login = async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const user = await checkPassword(email, password);
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const otp = await createOtp(user.id, "login");
    await sendOtpEmail(user.email, otp);

    return res.status(200).json({ message: "OTP sent to your email" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Login failed" });
  }
};

// ===== LOGIN STEP 2: verify OTP, issue token =====
export const verifyLoginOtp = async (req, res) => {
  const { email, otp } = req.body || {};
  if (!email || !otp) {
    return res.status(400).json({ message: "Email and OTP are required" });
  }

  try {
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(400).json({ message: "Invalid request" });
    }

    const result = await verifyOtp(user.id, "login", otp);
    if (!result.valid) {
      return res.status(400).json({ message: result.reason });
    }

    const token = generateToken(user);
    return res.status(200).json({
      message: "Login successful",
      user: {
        id: user.uuid,
        name: user.name,
        email: user.email,
        createdAt: user.created_at,
      },
      token,
    });
  } catch (error) {
    console.error(error);
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

// ===== CHANGE PASSWORD: requires auth token =====
export const changePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body || {};

  if (!oldPassword || !newPassword) {
    return res
      .status(400)
      .json({ message: "Old password and new password are required" });
  }

  if (newPassword.length < 6) {
    return res
      .status(400)
      .json({ message: "New password must be at least 6 characters" });
  }

  if (oldPassword === newPassword) {
    return res
      .status(400)
      .json({ message: "New password must be different from old password" });
  }

  try {
    const emailFromToken = req.user?.email;
    if (!emailFromToken) {
      return res.status(401).json({ message: "Invalid authentication token" });
    }

    const user = await findUserByEmail(emailFromToken);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isValidOldPassword = bcrypt.compareSync(oldPassword, user.password);
    if (!isValidOldPassword) {
      return res.status(400).json({ message: "Old password is incorrect" });
    }

    const newPasswordHash = bcrypt.hashSync(newPassword, 10);
    await updateUserPassword(user.id, newPasswordHash);

    return res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to change password" });
  }
};
