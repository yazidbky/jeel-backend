import express from "express";
import { authMiddleware } from "../auth/Middlewares/middleware.js";
import {
  createNewUser,
  getAllUsersController,
  getUserByIdController,
  updateUserController,
  deleteUserController,
} from "./controllers.js";

const router = express.Router();

router.post("/", createNewUser);
router.get("/", getAllUsersController);
router.get("/:id", authMiddleware, getUserByIdController);
router.put("/:id", authMiddleware, updateUserController);
router.delete("/:id", authMiddleware, deleteUserController);

export default router;