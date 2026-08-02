import express from "express";
import { getMe, login, register } from "./controllers.js";
import { authMiddleware } from "./middleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", authMiddleware, getMe);

export default router;
