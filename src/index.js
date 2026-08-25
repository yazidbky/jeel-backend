import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import authRoutes from "./features/auth/Routes/routes.js";
import forgetPasswordRoutes from "./features/auth/Routes/forget_password_routes.js";
import { initializeDatabase } from "./core/db/init.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "API is running",
    authRoutes: ["/auth/register", "/auth/login", "/auth/me"],
    passwordRoutes: ["/forget-password/forgot-password", "/forget-password/verify-otp", "/forget-password/reset-password"],
  });
});

app.use("/auth", authRoutes);
app.use("/forget-password", forgetPasswordRoutes);

initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
  });
