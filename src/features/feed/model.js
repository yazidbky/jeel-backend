import pool from "../../core/db/connection.js";
export const getFeed = async (userId, limit, offset) => {
  const [rows] = await pool.execute(
    `SELECT p.id, p.user_id, u.uuid AS user_uuid, u.name AS author_name, p.caption,
      p.created_at, p.updated_at,
      (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS like_count,
      (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comment_count,
      (SELECT COUNT(*) FROM shares s WHERE s.post_id = p.id) AS share_count
     FROM posts p JOIN users u ON u.id = p.user_id
     WHERE p.user_id IN (SELECT following_id FROM follows WHERE follower_id = ?)
    ORDER BY p.created_at DESC, p.id DESC LIMIT ? OFFSET ?`,
    [userId, limit, offset],
  );
  return rows;
};
