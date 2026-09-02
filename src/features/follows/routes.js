import express from "express";
import { authMiddleware } from "../auth/Middlewares/middleware.js";
import { rateLimiter } from "../../core/utils/security.js";
import { follow, unfollow, following, followers } from "./controller.js";
const router = express.Router();
router.use(authMiddleware);
router.get("/following", following);
router.get("/followers", followers);
router.post(
  "/:userId",
  rateLimiter({ prefix: "follow", maxAttempts: 30 }),
  follow,
);
router.delete(
  "/:userId",
  rateLimiter({ prefix: "unfollow", maxAttempts: 30 }),
  unfollow,
);
router.post(
  "/users/:userId/follow",
  authMiddleware,
  rateLimiter({ prefix: "follow", maxAttempts: 30 }),
  follow,
);
router.get("/users/:userId/followers", authMiddleware, followers);
router.get("/users/:userId/following", authMiddleware, following);
export default router;
