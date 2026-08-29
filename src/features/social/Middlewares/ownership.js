import pool from "../../../core/db/connection.js";
import { getCurrentUser } from "../../../core/utils/current_user.js";

export const requirePostOwner = async (req, res, next) => {
  try {
    const user = await getCurrentUser(req);
    const [rows] = await pool.execute(
      "SELECT id FROM posts WHERE id = ? AND user_id = ? LIMIT 1",
      [req.params.postId || req.params.id, user?.id],
    );
    if (!rows[0])
      return res.status(403).json({ message: "You do not own this post" });
    return next();
  } catch (error) {
    return next(error);
  }
};

export const requireCommentOwner = async (req, res, next) => {
  try {
    const user = await getCurrentUser(req);
    const [rows] = await pool.execute(
      "SELECT id FROM comments WHERE id = ? AND user_id = ? LIMIT 1",
      [req.params.commentId || req.params.id, user?.id],
    );
    if (!rows[0])
      return res.status(403).json({ message: "You do not own this comment" });
    return next();
  } catch (error) {
    return next(error);
  }
};
