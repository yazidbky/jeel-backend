import pool from "../../core/db/connection.js";

const postQuery = `SELECT p.id, p.user_id, u.uuid AS user_uuid, u.name AS author_name,
  p.caption, p.created_at, p.updated_at,
  (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS like_count,
  (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comment_count,
  (SELECT COUNT(*) FROM shares s WHERE s.post_id = p.id) AS share_count
  FROM posts p JOIN users u ON u.id = p.user_id`;

export const createPost = async (userId, caption, media = []) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.execute(
      "INSERT INTO posts (user_id, caption) VALUES (?, ?)",
      [userId, caption || null],
    );
    for (const item of media) {
      await connection.execute(
        "INSERT INTO media (post_id, url, type, order_index) VALUES (?, ?, ?, ?)",
        [result.insertId, item.url, item.type, item.orderIndex],
      );
    }
    await connection.commit();
    return getPostById(result.insertId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const getPostById = async (postId) => {
  const [rows] = await pool.execute(`${postQuery} WHERE p.id = ? LIMIT 1`, [
    postId,
  ]);
  if (!rows[0]) return null;
  const [media] = await pool.execute(
    "SELECT id, url, type, order_index AS orderIndex FROM media WHERE post_id = ? ORDER BY order_index",
    [postId],
  );
  return { ...rows[0], media };
};

export const listUserPosts = async (userId, limit, offset) => {
  const [rows] = await pool.execute(
    `${postQuery} WHERE p.user_id = ? ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
    [userId, limit, offset],
  );
  return rows;
};

export const updatePost = async (postId, caption) => {
  await pool.execute(
    "UPDATE posts SET caption = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [caption || null, postId],
  );
  return getPostById(postId);
};

export const deletePost = async (postId) => {
  const [result] = await pool.execute("DELETE FROM posts WHERE id = ?", [
    postId,
  ]);
  return result.affectedRows > 0;
};
