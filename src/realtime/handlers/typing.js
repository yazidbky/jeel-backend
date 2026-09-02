import { assertIsParticipant } from "../../features/conversations/service.js";
import { activeParticipantIds } from "../../features/conversations/model.js";

const notify = (io, ids, payload) => ids.forEach((id) => io.to(`user:${id}`).emit("typing:update", payload));
export const registerTypingHandlers = (io, socket) => {
  for (const [event, typing] of [["typing:start", true], ["typing:stop", false]]) {
    socket.on(event, async ({ conversationId }) => {
      try { await assertIsParticipant(conversationId, socket.user.id); const ids = await activeParticipantIds(conversationId); notify(io, ids.filter((id) => id !== socket.user.id), { conversationId, userId: socket.user.id, typing }); } catch { /* authorization failures are intentionally not broadcast */ }
    });
  }
};