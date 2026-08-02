import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import authRoutes from "./features/auth/routes.js";
import { initializeDatabase } from "./db/init.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "API is running",
    authRoutes: ["/auth/register", "/auth/login", "/auth/me"],
  });
});

app.use("/auth", authRoutes);

// Initialize database and start server
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
