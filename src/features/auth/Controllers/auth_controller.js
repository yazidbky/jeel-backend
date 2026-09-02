import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  createUser,
  checkPassword,
  getUserById,
  findUserByEmail,
  generateAccessToken,
  generateRefreshToken,
  createRefreshTokenRecord,
  verifyRefreshTokenRecord,
  rotateRefreshToken,
  updateUserPassword,
} from "../Models/auth_model.js";
import {
  createPendingRegistration,
  findPendingRegistration,
  incrementPendingAttempts,
  deletePendingRegistration,
} from "../Models/pendingRegistration.model.js";
import { createOtp, verifyOtp } from "../Models/otp_model.js";
import { createResetToken, consumePasswordChangeAuthorization } from "../Models/forget_password_token.model.js";
import { sendOtpEmail } from "../Services/email_service.js";
import { hashValue } from "../../../core/utils/crypto.utils.js";
import { addTokenToBlacklist, clearRateLimit } from "../../../core/utils/security.js";

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
    clearRateLimit(`register:${email.toLowerCase()}`);

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
      role: "user",
      emailVerified: true,
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
    clearRateLimit(`login:${user.email.toLowerCase()}`);

    return res.status(200).json({ message: "OTP sent to your email. Please check your inbox." });
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

    const accessToken = generateAccessToken({ ...user, role: user.role || "user" });
    const refreshToken = generateRefreshToken({ ...user, role: user.role || "user" });
    await createRefreshTokenRecord(user.id, refreshToken);

    return res.status(200).json({
      message: "Login successful",
      user: {
        uuid: user.uuid,
        name: user.name,
        email: user.email,
        role: user.role || "user",
        emailVerified: Boolean(user.email_verified),
        createdAt: user.created_at,
      },
      token: accessToken,
      refreshToken,
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

// ===== CHANGE PASSWORD: request OTP =====
export const requestPasswordChangeOtp = async (req, res) => {
  try {
    const user = await findUserByEmail(req.user?.email);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const otp = await createOtp(user.id, "password_change");
    await sendOtpEmail(user.email, otp);

    return res.status(200).json({ message: "OTP sent to your email" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to send password change OTP" });
  }
};

// ===== CHANGE PASSWORD: verify OTP and authorize the next password screen =====
export const verifyPasswordChangeOtp = async (req, res) => {
  const { otp } = req.body || {};

  if (!otp) {
    return res.status(400).json({ message: "OTP is required" });
  }

  try {
    const user = await findUserByEmail(req.user?.email);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const otpResult = await verifyOtp(user.id, "password_change", otp);
    if (!otpResult.valid) {
      return res.status(400).json({ message: otpResult.reason });
    }

    await createResetToken(user.id);
    return res.status(200).json({ message: "OTP verified. You can now change your password." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to verify password change OTP" });
  }
};

// ===== CHANGE PASSWORD: requires auth token and prior OTP verification =====
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

    const isAuthorized = await consumePasswordChangeAuthorization(user.id);
    if (!isAuthorized) {
      return res.status(403).json({ message: "Verify the OTP before changing your password" });
    }

    const newPasswordHash = bcrypt.hashSync(newPassword, 10);
    await updateUserPassword(user.id, newPasswordHash);

    return res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to change password" });
  }
};

export const logout = async (req, res) => {
  const authHeader = req.headers.authorization;
  const { refreshToken } = req.body || {};

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(400).json({ message: "Authorization token is required" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
    addTokenToBlacklist(token, decoded.exp ? decoded.exp * 1000 : Date.now() + 60 * 60 * 1000);

    if (refreshToken) {
      const decodedRefresh = jwt.verify(refreshToken, process.env.JWT_SECRET || "dev-secret");
      if (decodedRefresh?.type === "refresh" && decodedRefresh.email) {
        const user = await findUserByEmail(decodedRefresh.email);
        if (user) {
          await pool.execute(
            "UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = ? AND expires_at > NOW()",
            [user.id],
          );
        }
      }
    }

    return res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

export const refreshAccessToken = async (req, res) => {
  const { refreshToken } = req.body || {};

  if (!refreshToken) {
    return res.status(400).json({ message: "Refresh token is required" });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_JWT_SECRET || "dev-secret");

    if (decoded.type !== "refresh") {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const user = await findUserByEmail(decoded.email);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    const isValidRefreshToken = await verifyRefreshTokenRecord(user.id, refreshToken);
    if (!isValidRefreshToken) {
      return res.status(401).json({ message: "Refresh token expired or revoked" });
    }

    const newAccessToken = generateAccessToken({ ...user, role: user.role || "user" });
    const newRefreshToken = generateRefreshToken({ ...user, role: user.role || "user" });
    await rotateRefreshToken(user.id, refreshToken, newRefreshToken);

    return res.status(200).json({
      message: "Tokens refreshed successfully",
      token: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    console.error(error);
    return res.status(401).json({ message: "Invalid or expired refresh token" });
  }
};
