import pool from "../../core/db/connection.js";

export const isParticipant = async (conversationId, userId) => {
	const [rows] = await pool.execute(
		"SELECT 1 FROM conversation_participants WHERE conversation_id = ? AND user_id = ? AND left_at IS NULL LIMIT 1",
		[conversationId, userId],
	);
	return rows.length > 0;
};

export const createConversation = async ({ type, name, createdBy, participantIds }) => {
	const connection = await pool.getConnection();
	try {
		await connection.beginTransaction();
		
		// Convert createdBy UUID to integer ID
		// const [creatorUsers] = await connection.execute(
		// 	"SELECT uuid FROM users WHERE uuid = ?",
		// 	[createdBy],
		// );
		// if (creatorUsers.length === 0) {
		// 	await connection.rollback();
		// 	const error = new Error(`Creator user not found`);
		// 	error.statusCode = 400;
		// 	throw error;
		// }
		const createdByIntId = createdBy;  // Already an integer ID
		
		// Convert participant UUIDs to integer IDs
		const participantIntIds = [];
		for (const uuid of participantIds) {
			console.log("Looking up participant UUID:", uuid);
			let [users] = await connection.execute(
				"SELECT id FROM users WHERE uuid = ?",
				[uuid],
			);
			console.log("Found users with direct lookup:", users);
			
			if (users.length === 0) {
				console.log("Trying LOWER() lookup...");
				[users] = await connection.execute(
					"SELECT id FROM users WHERE LOWER(uuid) = LOWER(?)",
					[uuid],
				);
				console.log("Found users with LOWER lookup:", users);
			}
			
			if (users.length === 0) {
				await connection.rollback();
				const error = new Error(`User ${uuid} not found`);
				error.statusCode = 400;
				throw error;
			}
			participantIntIds.push(users[0].id);
		}
		
		const [result] = await connection.execute(
			"INSERT INTO conversations (type, name, created_by) VALUES (?, ?, ?)",
			[type, name || null, createdByIntId],
		);
		const users = [...new Set([createdByIntId, ...participantIntIds])];
		for (const userId of users) {
			await connection.execute(
				"INSERT INTO conversation_participants (conversation_id, user_id, role) VALUES (?, ?, ?)",
				[result.insertId, userId, userId === createdByIntId ? "owner" : "member"],
			);
		}
		await connection.commit();
		return getConversation(result.insertId, createdByIntId);
	} catch (error) {
		await connection.rollback();
		throw error;
	} finally {
		connection.release();
	}
};

export const getConversation = async (conversationId, userId) => {
	const [rows] = await pool.execute(
		`SELECT c.*, cp.role, cp.muted, cp.last_read_message_id
		 FROM conversations c JOIN conversation_participants cp ON cp.conversation_id = c.id
		 WHERE c.id = ? AND cp.user_id = ? AND cp.left_at IS NULL`, [conversationId, userId],
	);
	return rows[0];
};

export const listConversations = async (userId) => {
	const [rows] = await pool.execute(
		`SELECT c.*, cp.role, cp.muted, cp.last_read_message_id
		 FROM conversations c JOIN conversation_participants cp ON cp.conversation_id = c.id
		WHERE cp.user_id = ? AND cp.left_at IS NULL ORDER BY COALESCE(c.last_message_at, c.created_at) DESC, c.id DESC`, [userId],
	);
	return rows;
};

export const addParticipant = async (conversationId, userUuid, role = "member") => {
	// Convert UUID to integer ID
	const [users] = await pool.execute(
		"SELECT id FROM users WHERE uuid = ?",
		[userUuid],
	);
	if (users.length === 0) {
		const error = new Error("User not found");
		error.statusCode = 400;
		throw error;
	}
	const userId = users[0].id;
	
	await pool.execute(
		"INSERT INTO conversation_participants (conversation_id, user_id, role) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE left_at = NULL, role = VALUES(role)",
		[conversationId, userId, role],
	);
	return getConversation(conversationId, userId);
};

export const activeParticipantIds = async (conversationId) => {
	const [rows] = await pool.execute(
		"SELECT user_id FROM conversation_participants WHERE conversation_id = ? AND left_at IS NULL", [conversationId],
	);
	return rows.map((row) => row.user_id);
};

export const markRead = async (conversationId, userId, messageId) => {
	await pool.execute(
		"UPDATE conversation_participants SET last_read_message_id = ? WHERE conversation_id = ? AND user_id = ? AND left_at IS NULL",
		[messageId, conversationId, userId],
	);
};