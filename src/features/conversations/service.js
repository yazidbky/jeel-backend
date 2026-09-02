import pool from "../../core/db/connection.js";
import { isParticipant as isParticipantModel, createConversation as createConversationModel, listConversations as listConversationsModel, getConversation as getConversationModel, addParticipant as addParticipantModel, markRead as markReadModel } from "./model.js";

// Helper to convert UUID to integer ID
const uuidToIntId = async (uuid) => {
	console.log("🔍 uuidToIntId - looking up UUID:", uuid);
	const [users] = await pool.execute("SELECT id FROM users WHERE uuid = ?", [uuid]);
	console.log("🔍 uuidToIntId - found users:", users);
	if (users.length === 0) {
		console.log("❌ User not found for UUID:", uuid);
		const error = new Error("User not found");
		error.statusCode = 400;
		throw error;
	}
	console.log("✅ Converted UUID to ID:", users[0].id);
	return users[0].id;
};

export const assertIsParticipant = async (conversationId, userUuid) => {
	const userId = await uuidToIntId(userUuid);
	if (!(await isParticipantModel(conversationId, userId))) {
		const error = new Error("You are not a participant in this conversation");
		error.statusCode = 403;
		throw error;
	}
};

export const create = async (input, userUuid) => {
	console.log("=== SERVICE CREATE ===");
	console.log("Input userUuid:", userUuid);
	console.log("Input participantIds:", input.participantIds);
	
	try {
		const userId = await uuidToIntId(userUuid);
		console.log("Converted userId (integer):", userId);
		
		const result = await createConversationModel({ ...input, createdBy: userId });
		console.log("✅ Model returned:", result);
		return result;
	} catch (error) {
		console.log("❌ Error in service.create:");
		console.log("   Message:", error.message);
		console.log("   Status:", error.statusCode);
		throw error;
	}
};

export const listConversations = async (userUuid) => {
	const userId = await uuidToIntId(userUuid);
	return listConversationsModel(userId);
};

export const getConversation = async (conversationId, userUuid) => {
	const userId = await uuidToIntId(userUuid);
	return getConversationModel(conversationId, userId);
};

export const addParticipant = (conversationId, userUuid, role) => addParticipantModel(conversationId, userUuid, role);

export const markRead = async (conversationId, userUuid, messageId) => {
	const userId = await uuidToIntId(userUuid);
	return markReadModel(conversationId, userId, messageId);
};