import express from "express";
import { authMiddleware } from "../auth/Middlewares/middleware.js";
import { requirePostOwner } from "../social/Middlewares/ownership.js";
import { uploadMedia } from "../social/Middlewares/upload.js";
import { create, getOne, listMine, update, remove } from "./controller.js";

const router = express.Router();
router.use(authMiddleware);
router.post("/", uploadMedia.array("media", 10), create);
router.get("/mine", listMine);
router.get("/:id", getOne);
router.patch("/:id", requirePostOwner, update);
router.delete("/:id", requirePostOwner, remove);
export default router;
