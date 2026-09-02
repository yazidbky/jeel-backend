import pool from "../../core/db/connection.js";
import { assertIsParticipant } from "../conversations/service.js";
import { createMessage, listMessages, editMessage, softDeleteMessage, markStatusesRead } from "./model.js";

// Helper to convert UUID to integer ID
const uuidToIntId = async (uuid) => {
	const [users] = await pool.execute("SELECT id FROM users WHERE uuid = ?", [uuid]);
	if (users.length === 0) {
		const error = new Error("User not found");
		error.statusCode = 400;
		throw error;
	}
	return users[0].id;
};

export const sendMessage = async (conversationId, userUuid, input) => {
  await assertIsParticipant(conversationId, userUuid);
  const userId = await uuidToIntId(userUuid);
  return createMessage({ conversationId, senderId: userId, ...input });
};

export const getMessages = async (conversationId, userUuid, cursor, limit) => {
  await assertIsParticipant(conversationId, userUuid);
  return listMessages(conversationId, cursor, limit);
};

export const updateMessage = async (messageId, userUuid, conversationId, content) => {
  await assertIsParticipant(conversationId, userUuid);
  const userId = await uuidToIntId(userUuid);
  const message = await editMessage(messageId, userId, content);
  if (!message) { const error = new Error("Message not found or not owned by user"); error.statusCode = 404; throw error; }
  return message;
};

export const deleteMessage = async (messageId, userUuid, conversationId) => {
  await assertIsParticipant(conversationId, userUuid);
  const userId = await uuidToIntId(userUuid);
  if (!(await softDeleteMessage(messageId, userId))) { const error = new Error("Message not found or not owned by user"); error.statusCode = 404; throw error; }
};

export const readMessages = async (conversationId, userUuid, messageId) => {
  await assertIsParticipant(conversationId, userUuid);
  const userId = await uuidToIntId(userUuid);
  await markStatusesRead(conversationId, userId, messageId);
};