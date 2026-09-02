import pool from "../../core/db/connection.js";

export const createMessage = async ({ conversationId, senderId, content, messageType, replyToMessageId, attachments }) => {
	const connection = await pool.getConnection();
	try {
		await connection.beginTransaction();
		const [result] = await connection.execute(
			"INSERT INTO messages (conversation_id, sender_id, content, message_type, reply_to_message_id) VALUES (?, ?, ?, ?, ?)",
			[conversationId, senderId, content, messageType, replyToMessageId || null],
		);
		for (const attachment of attachments) {
			await connection.execute(
				"INSERT INTO message_attachments (message_id, url, type, file_size, mime_type) VALUES (?, ?, ?, ?, ?)",
				[result.insertId, attachment.url, attachment.type, attachment.fileSize || null, attachment.mimeType || null],
			);
		}
		await connection.execute(
			"INSERT INTO message_status (message_id, user_id, status) SELECT ?, user_id, 'sent' FROM conversation_participants WHERE conversation_id = ? AND left_at IS NULL",
			[result.insertId, conversationId],
		);
		await connection.execute(
			"UPDATE conversations SET updated_at = CURRENT_TIMESTAMP, last_message_at = CURRENT_TIMESTAMP, last_message_preview = ? WHERE id = ?",
			[content.slice(0, 255), conversationId],
		);
		await connection.commit();
		return getMessage(result.insertId);
	} catch (error) {
		await connection.rollback();
		throw error;
	} finally {
		connection.release();
	}
};

export const getMessage = async (messageId) => {
	const [rows] = await pool.execute(
		`SELECT m.*, u.name AS sender_name,
			(SELECT JSON_ARRAYAGG(JSON_OBJECT('id', ma.id, 'url', ma.url, 'type', ma.type, 'fileSize', ma.file_size, 'mimeType', ma.mime_type)) FROM message_attachments ma WHERE ma.message_id = m.id) AS attachments
		 FROM messages m JOIN users u ON u.id = m.sender_id WHERE m.id = ?`, [messageId],
	);
	return rows[0];
};

export const listMessages = async (conversationId, cursor, limit) => {
	const params = [conversationId];
	let cursorClause = "";
	if (cursor) {
		cursorClause = " AND m.id < ?";
		params.push(cursor);
	}
	params.push(limit + 1);
	const [rows] = await pool.execute(
		`SELECT m.*, u.name AS sender_name,
			(SELECT JSON_ARRAYAGG(JSON_OBJECT('id', ma.id, 'url', ma.url, 'type', ma.type, 'fileSize', ma.file_size, 'mimeType', ma.mime_type)) FROM message_attachments ma WHERE ma.message_id = m.id) AS attachments
		 FROM messages m JOIN users u ON u.id = m.sender_id
		 WHERE m.conversation_id = ?${cursorClause} ORDER BY m.id DESC LIMIT ?`, params,
	);
	const hasMore = rows.length > limit;
	const messages = rows.slice(0, limit).reverse();
	return { messages, nextCursor: hasMore ? String(rows[limit].id) : null };
};

export const editMessage = async (messageId, senderId, content) => {
	const [result] = await pool.execute(
		"UPDATE messages SET content = ?, edited_at = CURRENT_TIMESTAMP WHERE id = ? AND sender_id = ? AND deleted_at IS NULL",
		[content, messageId, senderId],
	);
	return result.affectedRows ? getMessage(messageId) : null;
};

export const softDeleteMessage = async (messageId, senderId) => {
	const [result] = await pool.execute(
		"UPDATE messages SET content = '', deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND sender_id = ? AND deleted_at IS NULL",
		[messageId, senderId],
	);
	return result.affectedRows > 0;
};

export const markStatusesRead = async (conversationId, userId, messageId) => {
	await pool.execute(
		"UPDATE message_status SET status = 'read' WHERE user_id = ? AND message_id IN (SELECT id FROM messages WHERE conversation_id = ? AND id <= ?)",
		[userId, conversationId, messageId],
	);
};