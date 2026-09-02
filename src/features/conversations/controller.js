import { conversationInput, participantInput } from "./validation.js";
import {
  create,
  listConversations,
  getConversation,
  addParticipant,
  markRead,
  assertIsParticipant,
} from "./service.js";
import { readMessages } from "../messages/service.js";

const parse = (schema, value) => {
  console.log("🔍 Parsing input:", value);
  const result = schema.safeParse(value);
  console.log("✅ Parse result success:", result.success);
  if (!result.success) {
    console.log("❌ Parse errors:", result.error.issues);
    const error = new Error(result.error.issues[0].message);
    error.statusCode = 400;
    throw error;
  }
  return result.data;
};

export const createConversation = async (req, res, next) => {
  try {
    console.log("📝 createConversation called");
    console.log("📝 req.body:", req.body);
    console.log("📝 req.user:", req.user);
    
    const input = parse(conversationInput, req.body);
    console.log("✅ Validation passed - input:", input);
    
    console.log("🔄 Calling service.create() with:", { input, userId: req.user.id });
    const conversation = await create(input, req.user.id);
    console.log("✅ Conversation created:", conversation);
    return res.status(201).json(conversation);
  } catch (error) {
    console.log("❌ Error in createConversation:");
    console.log("   Message:", error.message);
    console.log("   Status Code:", error.statusCode);
    console.log("   Stack:", error.stack);
    return next(error);
  }
};

export const list = async (req, res, next) => {
  try {
    const conversations = await listConversations(req.user.id);
    return res.json(conversations);
  } catch (error) {
    return next(error);
  }
};

export const add = async (req, res, next) => {
  try {
    await assertIsParticipant(req.params.id, req.user.id);
    const input = parse(participantInput, req.body);
    // input.userId is UUID, pass it directly
    const participant = await addParticipant(req.params.id, input.userId, input.role);
    return res.status(201).json(participant);
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

    await readMessages(req.params.id, req.user.id, messageId);
    await markRead(req.params.id, req.user.id, messageId);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
};

export const detail = async (req, res, next) => {
  try {
    await assertIsParticipant(req.params.id, req.user.id);
    const conversation = await getConversation(req.params.id, req.user.id);
    return res.json(conversation);
  } catch (error) {
    return next(error);
  }
};