import { Queue } from "bullmq";

const connection = process.env.REDIS_URL ? { url: process.env.REDIS_URL } : null;
export const pushNotificationQueue = connection
  ? new Queue("push-notifications", { connection })
  : { add: async () => null };

export const queueOfflineNotifications = async (recipientIds, message) => {
  if (!recipientIds.length) return;
  await pushNotificationQueue.add("message", { recipientIds, messageId: message.id, conversationId: message.conversation_id }, { removeOnComplete: 1000, removeOnFail: 5000 });
};