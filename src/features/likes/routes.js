import express from "express";
import { authMiddleware } from "../auth/Middlewares/middleware.js";
import { rateLimiter } from "../../core/utils/security.js";
import { toggle } from "./controller.js";
const router = express.Router();
router.post(
  "/posts/:postId",
  authMiddleware,
  rateLimiter({ prefix: "like", maxAttempts: 30 }),
  toggle,
);
router.post(
  "/posts/:postId/like",
  authMiddleware,
  rateLimiter({ prefix: "like", maxAttempts: 30 }),
  toggle,
);
export default router;
