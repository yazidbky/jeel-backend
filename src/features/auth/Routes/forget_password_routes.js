import express from "express";
import { forgotPassword, verifyOtp, resetPassword } from "../Controllers/forget_password_controller.js";

const router = express.Router();

router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOtp);
router.post("/reset-password", resetPassword);

export default router;
