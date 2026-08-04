import express from "express";
import {
	register,
	verifyRegisterOtp,
	login,
	verifyLoginOtp,
	getMe,
} from "../Controllers/auth_controller.js";
import { authMiddleware } from "../Middlewares/middleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/register/verify-otp", verifyRegisterOtp);

router.post("/login", login);
router.post("/login/verify-otp", verifyLoginOtp);

router.get("/me", authMiddleware, getMe);

export default router;
