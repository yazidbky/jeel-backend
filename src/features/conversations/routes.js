import express from "express";
import { authMiddleware } from "../auth/Middlewares/middleware.js";
import { createConversation, list, add, read, detail } from "./controller.js";
const router = express.Router();

console.log("🔧 Registering conversation routes");

router.use(authMiddleware);

// Test route
router.post("/test", (req, res) => {
  console.log("✅ TEST ROUTE HIT");
  res.json({ message: "test route works" });
});

router.post("/", createConversation);
router.get("/", list);
router.get("/:id", detail);
router.post("/:id/participants", add);
router.post("/:id/read", read);

export default router;