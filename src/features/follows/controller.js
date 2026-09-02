import { getCurrentUser } from "../../core/utils/current_user.js";
import { followUser, unfollowUser, listFollowing, listFollowers } from "./model.js";
const targetUuid = (req) => req.params.userId;
export const follow = async (req, res, next) => {
  try {
    const user = await getCurrentUser(req);
    const result = await followUser(user.id, targetUuid(req));
    if (result.error) return res.status(400).json({ message: result.error });
    return res.status(result.following ? 201 : 200).json(result);
  } catch (error) {
    return next(error);
  }
};
export const unfollow = async (req, res, next) => {
  try {
    const user = await getCurrentUser(req);
    return res.json(await unfollowUser(user.id, targetUuid(req)));
  } catch (error) {
    return next(error);
  }
};
export const following = async (req, res, next) => {
  try {
    const user = await getCurrentUser(req);
    const users = await listFollowing(req.params.userId || user.uuid);
    return res.json(users);
  } catch (error) {
    return next(error);
  }
};

export const followers = async (req, res, next) => {
  try {
    const user = await getCurrentUser(req);
    return res.json(await listFollowers(req.params.userId || user.uuid));
  } catch (error) {
    return next(error);
  }
};
