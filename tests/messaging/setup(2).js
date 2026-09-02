// tests/setup.js
// Adjust these import paths to match your actual project layout.

import express from "express";
import http from "http";
import jwt from "jsonwebtoken";
import { io as ioClient } from "socket.io-client";
import pool from "../../src/core/db/connection.js";
import conversationsRouter from "../../src/features/conversations/routes.js";
import messagesRouter from "../../src/features/messages/routes.js";
import { createSocketServer } from "../../src/realtime/socket.server.js";
import * as conversationModel from "../../src/features/conversations/model.js";
import * as messageModel from "../../src/features/messages/model.js";
import { runMigrations } from "../../src/core/db/migrationRunner.js";

process.env.JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

await runMigrations();

// --- Auth helpers -----------------------------------------------------
// Token payload must include `id`, since authMiddleware/socketAuth attach
// the decoded payload directly as req.user / socket.user, and handlers
// read `.id` off of it (not `.sub`).
export function makeAuthToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "15m" });
}

// A minimal stand-in authMiddleware for the test app, since we don't have
// the real one's source here. It applies the same contract: verifies the
// bearer token and sets req.user to the decoded payload.
function testAuthMiddleware(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.replace(/^Bearer /, "");
  if (!token) return res.status(401).json({ message: "Unauthorized" });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ message: "Unauthorized" });
  }
}

// --- Test app (REST) ---------------------------------------------------
// If your real app.js already wires these routers with the real
// authMiddleware, import and use that instead of this stand-in.
export function buildTestApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/conversations", testAuthMiddleware, conversationsRouter);
  app.use("/api", testAuthMiddleware, messagesRouter);
  // Basic error handler matching the { message } shape controllers expect.
  app.use((error, req, res, _next) => {
    res.status(error.statusCode || 500).json({ message: error.message });
  });
  return app;
}

// --- Fixtures ------------------------------------------------------------
export async function createTestUser(overrides = {}) {
  const email = overrides.email || `user_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com`;
  const [result] = await pool.execute(
    "INSERT INTO users (uuid, email, password, name) VALUES (UUID(), ?, ?, ?)",
    [email, "irrelevant_hash", overrides.name || `Test User ${Date.now()}`]
  );
  return { id: result.insertId, email };
}

export async function createTestConversation(createdBy, participantIds, overrides = {}) {
  return conversationModel.createConversation({
    type: overrides.type || (participantIds.length === 1 ? "direct" : "group"),
    name: overrides.name || null,
    createdBy,
    participantIds,
  });
}

export async function createTestMessage(conversationId, senderId, overrides = {}) {
  return messageModel.createMessage({
    conversationId,
    senderId,
    content: overrides.content ?? "Test message",
    messageType: overrides.messageType || "text",
    replyToMessageId: overrides.replyToMessageId || null,
    attachments: overrides.attachments || [],
  });
}

// --- Sockets ---------------------------------------------------------
export function connectSocket(userId, port) {
  return new Promise((resolve, reject) => {
    const options = {
      transports: ["websocket"],
      forceNew: true,
    };
    if (userId !== undefined) options.auth = { token: makeAuthToken(userId) };
    const socket = ioClient(`http://localhost:${port}`, options);
    socket.on("connect", () => resolve(socket));
    socket.on("connect_error", (error) => {
      socket.close();
      reject(error);
    });
  });
}

export function startTestSocketServer(port) {
  const httpServer = http.createServer();
  const io = createSocketServer(httpServer);
  return new Promise((resolve) => {
    httpServer.listen(port, () => resolve({ httpServer, io }));
  });
}

// --- Cleanup ---------------------------------------------------------
// Order matters: children before parents, respecting FK constraints.
export async function cleanupDb() {
  await pool.execute("DELETE FROM message_status");
  await pool.execute("DELETE FROM message_attachments");
  await pool.execute("DELETE FROM messages");
  await pool.execute("DELETE FROM conversation_participants");
  await pool.execute("DELETE FROM conversations");
  await pool.execute("DELETE FROM users");
}

export { pool };
