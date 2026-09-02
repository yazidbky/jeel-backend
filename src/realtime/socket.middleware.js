import jwt from "jsonwebtoken";
import { isTokenBlacklisted } from "../core/utils/security.js";

export const socketAuth = (socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.headers.authorization?.replace(/^Bearer /, "");
  if (!token || isTokenBlacklisted(token)) return next(new Error("Unauthorized"));
  try {
    const user = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
    socket.user = user;
    return next();
  } catch { return next(new Error("Unauthorized")); }
};