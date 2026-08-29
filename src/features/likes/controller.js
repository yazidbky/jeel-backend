import { getCurrentUser } from "../../core/utils/current_user.js";
import { toggleLike } from "./model.js";
export const toggle = async (req, res, next) => {
  try {
    const user = await getCurrentUser(req);
    const result = await toggleLike(user.id, req.params.postId);
    return res.status(result.liked ? 201 : 200).json(result);
  } catch (error) {
    return next(error);
  }
};
