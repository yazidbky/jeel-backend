import pool from "../../core/db/connection.js";

export const toggleLike = async (userId, postId) => {
  const [existing] = await pool.execute(
    "SELECT 1 FROM likes WHERE user_id = ? AND post_id = ?",
    [userId, postId],
  );
  if (existing.length)
    await pool.execute("DELETE FROM likes WHERE user_id = ? AND post_id = ?", [
      userId,
      postId,
    ]);
  else
    await pool.execute("INSERT INTO likes (user_id, post_id) VALUES (?, ?)", [
      userId,
      postId,
    ]);
  const [count] = await pool.execute(
    "SELECT COUNT(*) AS count FROM likes WHERE post_id = ?",
    [postId],
  );
  return { liked: !existing.length, likeCount: count[0].count };
};
