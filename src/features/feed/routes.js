import express from "express";
import { authMiddleware } from "../auth/Middlewares/middleware.js";
import { list } from "./controller.js";
const router = express.Router();
router.get("/", authMiddleware, list);
export default router;
