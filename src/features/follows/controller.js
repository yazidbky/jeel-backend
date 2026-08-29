import { getCurrentUser } from "../../core/utils/current_user.js";
import { followUser, unfollowUser, listFollowing, listFollowers } from "./model.js";
const targetId = (req) => Number.parseInt(req.params.userId, 10);
export const follow = async (req, res, next) => {
  try {
    const user = await getCurrentUser(req);
    const result = await followUser(user.id, targetId(req));
    if (result.error) return res.status(400).json({ message: result.error });
    return res.status(result.following ? 201 : 200).json(result);
  } catch (error) {
    return next(error);
  }
};
export const unfollow = async (req, res, next) => {
  try {
    const user = await getCurrentUser(req);
    return res.json(await unfollowUser(user.id, targetId(req)));
  } catch (error) {
    return next(error);
  }
};
export const following = async (req, res, next) => {
  try {
    const user = await getCurrentUser(req);
    const users = await listFollowing(Number.parseInt(req.params.userId, 10) || user.id);
    return res.json(users);
  } catch (error) {
    return next(error);
  }
};

export const followers = async (req, res, next) => {
  try {
    const user = await getCurrentUser(req);
    return res.json(await listFollowers(Number.parseInt(req.params.userId, 10) || user.id));
  } catch (error) {
    return next(error);
  }
};
