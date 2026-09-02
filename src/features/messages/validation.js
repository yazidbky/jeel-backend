import { z } from "zod";

export const messageInput = z.object({
  content: z.string().trim().min(1).max(5000),
  messageType: z.enum(["text", "system"]).default("text"),
  replyToMessageId: z.coerce.number().int().positive().nullable().optional(),
  attachments: z.array(z.object({
    url: z.string().trim().url().max(1000),
    type: z.string().trim().min(1).max(50),
    fileSize: z.coerce.number().int().nonnegative().optional(),
    mimeType: z.string().trim().max(255).optional(),
  })).max(10).default([]),
});

export const messageIdInput = z.object({ id: z.coerce.number().int().positive() });