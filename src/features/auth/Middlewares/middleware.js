import jwt from "jsonwebtoken";
import { isTokenBlacklisted } from "../../../core/utils/security.js";
export const authMiddleware = (req, res, next) => {
  console.log("🔐 authMiddleware - path:", req.path);
  const authHeader = req.headers.authorization;
  console.log("🔐 authMiddleware - authHeader:", authHeader ? "present" : "missing");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log("❌ No Bearer token");
    return res.status(401).json({ message: "Authorization token is required" });
  }

  const token = authHeader.split(" ")[1];

  if (isTokenBlacklisted(token)) {
    console.log("❌ Token blacklisted");
    return res.status(401).json({ message: "Token has been revoked" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
    console.log("✅ Token verified, decoded id:", decoded.id);
    req.user = decoded;
    console.log("🔄 About to call next()");
    next();
    console.log("⚠️ AFTER next() called (this shouldn't print if route handler sends response)");
    return;
  } catch (error) {
    console.log("❌ Token verification failed:", error.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

export const requireRole = (allowedRole) => (req, res, next) => {
  if (!req.user || req.user.role !== allowedRole) {
    return res.status(403).json({ message: "Access denied. Admin privileges required." });
  }

  return next();
};

export const requireAnyRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: "You do not have permission to access this resource." });
  }

  return next();
};
