import { getCurrentUser } from "../../core/utils/current_user.js";
import { createComment, listComments, deleteComment } from "./model.js";
export const create = async (req, res, next) => {
  try {
    const { content, parentCommentId, parent_comment_id: parentCommentIdSnakeCase } = req.body;
    if (!content?.trim())
      return res.status(400).json({ message: "Comment content is required" });
    const user = await getCurrentUser(req);
    const parentId = parentCommentId ?? parentCommentIdSnakeCase;
    if (parentId) {
      const parentComments = await listComments(req.params.postId, 1000, 0);
      if (!parentComments.some((comment) => comment.id === Number(parentId))) {
        return res.status(400).json({ message: "Parent comment belongs to another post" });
      }
    }
    const comment = await createComment(user.id, req.params.postId, content.trim(), parentId);
    return res
      .status(201)
      .json({ ...comment, comment });
  } catch (error) {
    return next(error);
  }
};
export const list = async (req, res, next) => {
  try {
    const limit = Math.min(
      Math.max(Number.parseInt(req.query.limit, 10) || 50, 1),
      100,
    );
    const offset = Math.max(Number.parseInt(req.query.offset, 10) || 0, 0);
    const comments = await listComments(req.params.postId, limit, offset);
    return res.json(comments);
  } catch (error) {
    return next(error);
  }
};
export const remove = async (req, res, next) => {
  try {
    await deleteComment(req.params.commentId);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
};
