import { z } from "zod";

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const conversationInput = z.object({
  type: z.enum(["direct", "group"]).default("direct"),
  name: z.string().trim().max(255).nullable().optional(),
  participantIds: z.array(z.string().uuid()).max(100),
});

export const participantInput = z.object({
  userId: z.string().uuid(),
  role: z.enum(["member", "owner"]).default("member"),
});