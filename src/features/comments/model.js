import pool from "../../core/db/connection.js";
export const createComment = async (
  userId,
  postId,
  content,
  parentCommentId,
) => {
  const [result] = await pool.execute(
    "INSERT INTO comments (post_id, user_id, content, parent_comment_id) VALUES (?, ?, ?, ?)",
    [postId, userId, content, parentCommentId || null],
  );
  const [rows] = await pool.execute(
    "SELECT c.*, u.name AS author_name FROM comments c JOIN users u ON u.id = c.user_id WHERE c.id = ?",
    [result.insertId],
  );
  return rows[0];
};
export const listComments = async (postId, limit, offset) => {
  const [rows] = await pool.execute(
    "SELECT c.*, u.name AS author_name FROM comments c JOIN users u ON u.id = c.user_id WHERE c.post_id = ? ORDER BY c.created_at ASC LIMIT ? OFFSET ?",
    [postId, limit, offset],
  );
  return rows;
};
export const deleteComment = async (commentId) =>
  pool.execute("DELETE FROM comments WHERE id = ?", [commentId]);
