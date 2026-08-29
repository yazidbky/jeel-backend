import express from "express";
import { authMiddleware } from "../auth/Middlewares/middleware.js";
import { uploadMedia } from "../social/Middlewares/upload.js";
import { upload } from "./controller.js";
import { requirePostOwner } from "../social/Middlewares/ownership.js";
const router = express.Router();
router.post("/", authMiddleware, uploadMedia.array("media", 10), upload);
router.post(
	"/posts/:postId/media",
	authMiddleware,
	requirePostOwner,
	uploadMedia.single("file"),
	upload,
);
router.get("/posts/:postId/media", authMiddleware, upload);
export default router;
