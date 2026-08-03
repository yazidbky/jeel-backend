import { forgotPassword, verifyOtp, resetPassword } from "../controllers/password.controller.js";

router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOtp);
router.post("/reset-password", resetPassword);