import jwt from "jsonwebtoken";
import { isTokenBlacklisted } from "../../../core/utils/security.js";
export const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authorization token is required" });
  }

  const token = authHeader.split(" ")[1];

  if (isTokenBlacklisted(token)) {
    return res.status(401).json({ message: "Token has been revoked" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
    req.user = decoded;
    return next();
  } catch (error) {
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
