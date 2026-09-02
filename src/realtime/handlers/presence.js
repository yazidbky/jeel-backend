export const registerPresenceHandlers = (io, socket) => {
  socket.join(`user:${socket.user.id}`);
  socket.on("disconnect", () => socket.broadcast.emit("presence:update", { userId: socket.user.id, online: false }));
  socket.broadcast.emit("presence:update", { userId: socket.user.id, online: true });
};