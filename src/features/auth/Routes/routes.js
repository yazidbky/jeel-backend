import express from "express";
import {
  register,
  verifyRegisterOtp,
  login,
  verifyLoginOtp,
  getMe,
  changePassword,
  logout,
} from "../Controllers/auth_controller.js";
import { authMiddleware, requireRole } from "../Middlewares/middleware.js";
import { rateLimiter } from "../../../core/utils/security.js";

const router = express.Router();

router.post("/register", rateLimiter({ prefix: "register" }), register);
router.post("/register/verify-otp", verifyRegisterOtp);

router.post("/login", rateLimiter({ prefix: "login" }), login);
router.post("/login/verify-otp", verifyLoginOtp);
router.post("/logout", authMiddleware, logout);

router.get("/me", authMiddleware, getMe);
router.post("/change-password", authMiddleware, changePassword);
router.get("/admin", authMiddleware, requireRole("admin"), (req, res) => {
  res.status(200).json({ message: "Admin access granted", user: req.user });
});

export default router;
