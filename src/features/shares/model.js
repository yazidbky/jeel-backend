import pool from "../../core/db/connection.js";
export const sharePost = async (userId, postId) => {
  const [posts] = await pool.execute("SELECT id FROM posts WHERE id = ? LIMIT 1", [postId]);
  if (!posts[0]) return { error: "Post not found" };
  await pool.execute("INSERT INTO shares (user_id, post_id) VALUES (?, ?)", [
    userId,
    postId,
  ]);
  const [rows] = await pool.execute(
    "SELECT COUNT(*) AS count FROM shares WHERE post_id = ?",
    [postId],
  );
  return { shared: true, shareCount: rows[0].count };
};
