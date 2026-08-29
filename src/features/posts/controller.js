import { getCurrentUser } from "../../core/utils/current_user.js";
import { toMediaRecord } from "../social/Services/media_service.js";
import {
  createPost,
  getPostById,
  listUserPosts,
  updatePost,
  deletePost,
} from "./model.js";

const pagination = (req) => {
  const limit = Math.min(
    Math.max(Number.parseInt(req.query.limit, 10) || 20, 1),
    50,
  );
  const offset = Math.max(Number.parseInt(req.query.offset, 10) || 0, 0);
  return { limit, offset };
};

export const create = async (req, res, next) => {
  try {
    const user = await getCurrentUser(req);
    const media = (req.files || []).map(toMediaRecord);
    if (!req.body.caption?.trim() && media.length === 0) {
      return res.status(400).json({ message: "Caption or media is required" });
    }
    const post = await createPost(user.id, req.body.caption, media);
    return res.status(201).json({ ...post, post });
  } catch (error) {
    return next(error);
  }
};
export const getOne = async (req, res, next) => {
  try {
    const post = await getPostById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    return res.json({ ...post, post });
  } catch (error) {
    return next(error);
  }
};
export const listMine = async (req, res, next) => {
  try {
    const user = await getCurrentUser(req);
    const { limit, offset } = pagination(req);
    return res.json({
      posts: await listUserPosts(user.id, limit, offset),
      limit,
      offset,
    });
  } catch (error) {
    return next(error);
  }
};
export const update = async (req, res, next) => {
  try {
    return res.json(await updatePost(req.params.id, req.body.caption));
  } catch (error) {
    return next(error);
  }
};
export const remove = async (req, res, next) => {
  try {
    await deletePost(req.params.id);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
};
