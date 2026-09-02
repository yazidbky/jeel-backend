import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./features/auth/Routes/routes.js";
import forgetPasswordRoutes from "./features/auth/Routes/forget_password_routes.js";
import postsRoutes from "./features/posts/routes.js";
import mediaRoutes from "./features/media/routes.js";
import likesRoutes from "./features/likes/routes.js";
import commentsRoutes from "./features/comments/routes.js";
import sharesRoutes from "./features/shares/routes.js";
import followsRoutes from "./features/follows/routes.js";
import feedRoutes from "./features/feed/routes.js";
import conversationRoutes from "./features/conversations/routes.js";
import messageRoutes from "./features/messages/routes.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static("uploads"));

// Global request logger
app.use((req, res, next) => {
  console.log(`📍 ${req.method} ${req.path}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log(`   Body:`, JSON.stringify(req.body));
  }
  next();
});

app.get("/", (req, res) => {
  res.json({
    message: "API is running",
    authRoutes: [
      "/auth/register",
      "/auth/register/verify-otp",
      "/auth/login",
      "/auth/login/verify-otp",
      "/auth/refresh",
      "/auth/logout",
      "/auth/me",
      "/auth/admin",
    ],
    passwordRoutes: [
      "/forget-password/forgot-password",
      "/forget-password/verify-otp",
      "/forget-password/reset-password",
    ],
  });
});

app.use("/auth", authRoutes);
app.use("/forget-password", forgetPasswordRoutes);
app.use("/posts", postsRoutes);
app.use("/api/posts", postsRoutes);
app.use("/media", mediaRoutes);
app.use("/api", mediaRoutes);
app.use("/api/media", mediaRoutes);
app.use("/likes", likesRoutes);
app.use("/api", likesRoutes);
app.use("/comments", commentsRoutes);
app.use("/api", commentsRoutes);
app.use("/api/comments", commentsRoutes);
app.use("/shares", sharesRoutes);
app.use("/api", sharesRoutes);
app.use("/follows", followsRoutes);
app.use("/api", followsRoutes);
app.use("/api/follows", followsRoutes);
app.use("/feed", feedRoutes);
app.use("/api/feed", feedRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api", messageRoutes);

app.use((error, _req, res, _next) => {
  console.error("🚨 GLOBAL ERROR HANDLER");
  console.error("   Message:", error.message);
  console.error("   Status Code:", error.statusCode);
  console.error("   Stack:", error.stack);
  
  if (error.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ message: "File is too large" });
  }
  if (error.message === "Unsupported media type") {
    return res.status(400).json({ message: error.message });
  }
  return res.status(error.statusCode || 500).json({
    message: error.message || "Internal server error",
  });
});

export default app;
