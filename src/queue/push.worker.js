import { Worker } from "bullmq";

export const startPushWorker = (sendPush) => {
  if (!process.env.REDIS_URL) return null;
  return new Worker("push-notifications", async (job) => sendPush(job.data), { connection: { url: process.env.REDIS_URL } });
};