import { recordRateLimit } from "../../core/utils/security.js";
import { sendMessage, readMessages } from "../../features/messages/service.js";
import { activeParticipantIds } from "../../features/conversations/model.js";
import { messageInput } from "../../features/messages/validation.js";
import { queueOfflineNotifications } from "../../queue/notification.queue.js";

const validInput = (input) => { const result = messageInput.safeParse(input); if (!result.success) throw new Error(result.error.issues[0].message); return result.data; };
const emitToParticipants = (io, participants, event, payload) => participants.forEach((id) => io.to(`user:${id}`).emit(event, payload));

export const registerMessageHandlers = (io, socket) => {
  socket.on("message:send", async (input, acknowledge = () => {}) => {
    try {
      if (!recordRateLimit(`socket-message:${socket.user.id}`, 10000, 30)) throw new Error("Message rate limit exceeded");
      const data = validInput(input);
      const message = await sendMessage(input.conversationId, socket.user.id, data);
      const participants = await activeParticipantIds(input.conversationId);
      emitToParticipants(io, participants, "message:new", message);
      await queueOfflineNotifications(participants.filter((id) => id !== socket.user.id && !io.sockets.adapter.rooms.get(`user:${id}`)?.size), message);
      acknowledge({ ok: true, message });
    } catch (error) { acknowledge({ ok: false, error: error.message }); }
  });
  socket.on("message:read", async ({ conversationId, messageId }, acknowledge = () => {}) => {
    try { await readMessages(conversationId, socket.user.id, messageId); const participants = await activeParticipantIds(conversationId); emitToParticipants(io, participants, "message:status", { conversationId, messageId, userId: socket.user.id, status: "read" }); acknowledge({ ok: true }); } catch (error) { acknowledge({ ok: false, error: error.message }); }
  });
};