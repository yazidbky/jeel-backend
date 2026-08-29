import express from "express";
import { authMiddleware } from "../auth/Middlewares/middleware.js";
import { rateLimiter } from "../../core/utils/security.js";
import { share } from "./controller.js";
const router = express.Router();
router.post(
  "/posts/:postId",
  authMiddleware,
  rateLimiter({ prefix: "share", maxAttempts: 20 }),
  share,
);
router.post(
  "/posts/:postId/share",
  authMiddleware,
  rateLimiter({ prefix: "share", maxAttempts: 20 }),
  share,
);
export default router;
