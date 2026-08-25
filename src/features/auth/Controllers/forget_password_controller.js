import bcrypt from "bcryptjs";
import { updateUserPassword } from "../Models/user_model.js";
import { findUserByEmail } from "../Models/auth_model.js";
import { createOtp, verifyOtp as verifyOtpModel } from "../Models/otp_model.js";
import { createResetToken, verifyResetToken } from "../Models/forget_password_token.model.js";
import { sendOtpEmail } from "../Services/email_service.js";

const PURPOSE = "password_reset";

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
    return res.status(200).json({ resetToken });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, resetToken, newPassword } = req.body;
    if (!email || !resetToken || !newPassword) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const user = await findUserByEmail(email);
    if (!user) return res.status(400).json({ message: "Invalid request" });

    const result = await verifyResetToken(user.id, resetToken);
    if (!result.valid) {
      return res.status(400).json({ message: result.reason });
    }

    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    await updateUserPassword(user.id, hashedPassword);

    return res.status(200).json({ message: "Password reset successful" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Something went wrong" });
  }
};