import bcrypt from "bcryptjs";
import { findUserByEmail } from "../Models/auth_model.js";
import { createOtp, verifyOtp as verifyOtpModel } from "../Models/otp_model.js";
import {
  createResetToken,
  resetPasswordWithToken,
} from "../Models/forget_password_token.model.js";
import { sendOtpEmail } from "../Services/email_service.js";

const PURPOSE = "password_reset";
const RESET_COOKIE = "password_reset_token";
const RESET_TOKEN_MAX_AGE = 10 * 60 * 1000;

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await findUserByEmail(email);

    if (user) {
      const otp = await createOtp(user.id, PURPOSE);
      await sendOtpEmail(user.email, otp);
    }

    return res.status(200).json({
      message: "If that email is registered, a code has been sent.",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const user = await findUserByEmail(email);
    if (!user) return res.status(400).json({ message: "Invalid request" });

    const result = await verifyOtpModel(user.id, PURPOSE, otp);
    if (!result.valid) {
      return res.status(400).json({ message: result.reason });
    }

    const resetToken = await createResetToken(user.id);
    res.cookie(RESET_COOKIE, resetToken, {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: RESET_TOKEN_MAX_AGE,
    });

    return res.status(200).json({
      message: "OTP verified. You can now set a new password.",
      resetToken,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    const resetToken = req.get("X-Password-Reset-Token") || req.cookies?.[RESET_COOKIE];

    if (!newPassword) {
      return res.status(400).json({ message: "New password is required" });
    }
    if (!resetToken) {
      return res.status(401).json({ message: "Verify the OTP before resetting your password" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    const resetSucceeded = await resetPasswordWithToken(resetToken, hashedPassword);
    if (!resetSucceeded) {
      return res.status(401).json({ message: "Reset authorization is invalid or expired" });
    }

    res.clearCookie(RESET_COOKIE);

    return res.status(200).json({ message: "Password reset successful" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Something went wrong" });
  }
};