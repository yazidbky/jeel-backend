import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import authRoutes from "./features/auth/Routes/routes.js";
import forgetPasswordRoutes from "./features/auth/Routes/forget_password_routes.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

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

export default app;
