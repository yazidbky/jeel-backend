import express from "express";
import { forgotPassword, verifyOtp, resetPassword } from "../Controllers/forget_password_controller.js";
import { rateLimiter } from "../../../core/utils/security.js";

const router = express.Router();

router.post("/forgot-password", rateLimiter({ prefix: "forgot-password", maxAttempts: 3 }), forgotPassword);
router.post("/verify-otp", rateLimiter({ prefix: "forgot-password-otp", maxAttempts: 5 }), verifyOtp);
router.post("/reset-password", rateLimiter({ prefix: "reset-password", maxAttempts: 5 }), resetPassword);

export default router;
