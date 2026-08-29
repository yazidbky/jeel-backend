import { getCurrentUser } from "../../core/utils/current_user.js";
import { sharePost } from "./model.js";
export const share = async (req, res, next) => {
  try {
    const user = await getCurrentUser(req);
    const result = await sharePost(user.id, req.params.postId);
    if (result.error) return res.status(404).json({ message: result.error });
    return res.status(201).json({
      ...result,
      post_id: Number(req.params.postId),
      user_id: user.id,
    });
  } catch (error) {
    return next(error);
  }
};
