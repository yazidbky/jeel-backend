import { messageInput } from "./validation.js";
import { sendMessage, getMessages, updateMessage, deleteMessage, readMessages } from "./service.js";
import { getMessage } from "./model.js";
import { assertIsParticipant } from "../conversations/service.js";

const userId = (req) => req.user.id;

const parse = (schema, value) => {
  const result = schema.safeParse(value);
  if (!result.success) {
    const error = new Error(result.error.issues[0].message);
    error.statusCode = 400;
    throw error;
  }
  return result.data;
};

export const create = async (req, res, next) => {
  try {
    const input = parse(messageInput, req.body);
    const message = await sendMessage(req.params.id, userId(req), input);
    return res.status(201).json(message);
  } catch (error) {
    return next(error);
  }
};

export const list = async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
    const messages = await getMessages(req.params.id, userId(req), req.query.cursor, limit);
    return res.json(messages);
  } catch (error) {
    return next(error);
  }
};

export const edit = async (req, res, next) => {
  try {
    const input = parse(messageInput.pick({ content: true }), req.body);
    const message = await getMessage(req.params.id);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    const updated = await updateMessage(req.params.id, userId(req), message.conversation_id, input.content);
    return res.json(updated);
  } catch (error) {
    return next(error);
  }
};

export const remove = async (req, res, next) => {
  try {
    const message = await getMessage(req.params.id);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    await deleteMessage(req.params.id, userId(req), message.conversation_id);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
};

export const read = async (req, res, next) => {
  try {
    const messageId = Number(req.body.messageId);
    if (!Number.isInteger(messageId) || messageId < 1) {
      return res.status(400).json({ message: "messageId is required" });
    }

    await readMessages(req.params.id, userId(req), messageId);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
};