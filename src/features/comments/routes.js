import express from "express";
import { authMiddleware } from "../auth/Middlewares/middleware.js";
import { requireCommentOwner } from "../social/Middlewares/ownership.js";
import { rateLimiter } from "../../core/utils/security.js";
import { create, list, remove } from "./controller.js";
const router = express.Router();
router.get("/posts/:postId", authMiddleware, list);
router.post(
  "/posts/:postId",
  authMiddleware,
  rateLimiter({ prefix: "comment", maxAttempts: 20 }),
  create,
);
router.get("/posts/:postId/comments", authMiddleware, list);
router.post(
  "/posts/:postId/comments",
  authMiddleware,
  rateLimiter({ prefix: "comment", maxAttempts: 20 }),
  create,
);
router.delete("/:commentId", authMiddleware, requireCommentOwner, remove);
export default router;
