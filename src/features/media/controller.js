import { toMediaRecord } from "../social/Services/media_service.js";
import pool from "../../core/db/connection.js";

export const upload = async (req, res, next) => {
  try {
    const files = req.files || (req.file ? [req.file] : []);
    if (req.method === "GET") {
      const [rows] = await pool.execute(
        "SELECT id, post_id, url, type, order_index FROM media WHERE post_id = ? ORDER BY order_index",
        [req.params.postId],
      );
      return res.json(rows);
    }
    const media = files.map(toMediaRecord);
    if (req.params.postId && media[0]) {
      const [[last]] = await pool.execute(
        "SELECT COALESCE(MAX(order_index), -1) AS lastIndex FROM media WHERE post_id = ?",
        [req.params.postId],
      );
      await pool.execute(
        "INSERT INTO media (post_id, url, type, order_index) VALUES (?, ?, ?, ?)",
        [req.params.postId, media[0].url, media[0].type, last.lastIndex + 1],
      );
      return res.status(201).json({ ...media[0], post_id: Number(req.params.postId), type: media[0].type === "image" ? "photo" : media[0].type, url: media[0].url });
    }
    return res.status(201).json({ media });
  } catch (error) {
    return next(error);
  }
};
