import { getCurrentUser } from "../../core/utils/current_user.js";
import { getFeed } from "./model.js";
export const list = async (req, res, next) => {
  try {
    const user = await getCurrentUser(req);
    const limit = Math.min(
      Math.max(Number.parseInt(req.query.limit, 10) || 20, 1),
      50,
    );
    const offset = Math.max(Number.parseInt(req.query.offset, 10) || 0, 0);
    return res.json({
      posts: await getFeed(user.id, limit, offset),
      limit,
      offset,
    });
  } catch (error) {
    return next(error);
  }
};
