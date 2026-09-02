import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import Redis from "ioredis";
import { socketAuth } from "./socket.middleware.js";
import { registerMessageHandlers } from "./handlers/message.js";
import { registerTypingHandlers } from "./handlers/typing.js";
import { registerPresenceHandlers } from "./handlers/presence.js";

export const createSocketServer = (httpServer) => {
  const io = new Server(httpServer, { cors: { origin: process.env.CLIENT_ORIGIN || true, credentials: true } });
  if (process.env.REDIS_URL) {
    const pubClient = new Redis(process.env.REDIS_URL);
    const subClient = pubClient.duplicate();
    io.adapter(createAdapter(pubClient, subClient));
  }
  io.use(socketAuth);
  io.on("connection", (socket) => {
    registerPresenceHandlers(io, socket);
    registerMessageHandlers(io, socket);
    registerTypingHandlers(io, socket);
  });
  return io;
};