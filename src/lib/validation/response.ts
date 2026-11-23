import { z } from "zod";

/**
 * Validation schemas for the Response system.
 * Wire + storage boundary enforcement for quick replies and experience replies.
 */

export const quickReplyPayloadSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Message cannot be empty")
    .max(2000, "Message must be 2000 characters or fewer"),
  recipientEmotion: z.string().trim().max(50, "Emotion tag too long").optional(),
  photos: z.array(z.string().uuid("Invalid asset ID")).max(10, "Maximum 10 photos allowed").default([]),
});

export const experienceReplyPayloadSchema = z.object({
  experienceType: z.string().trim().min(1, "Experience type required").max(50),
  content: z.record(z.string(), z.unknown()),
});

export const responseContentSchema = z.union([
  quickReplyPayloadSchema,
  experienceReplyPayloadSchema,
]);

export const createResponseDraftSchema = z.object({
  apologyId: z.string().uuid("Invalid experience ID"),
  responseType: z.enum(["quick", "experience"]),
  content: z.record(z.string(), z.unknown()).default({}),
});

export const saveResponseDraftSchema = z.object({
  content: z.record(z.string(), z.unknown()),
});

export const publishResponseSchema = z.object({
  content: responseContentSchema,
});

export const manageResponseActionSchema = z.object({
  action: z.enum(["revoke", "restore", "delete"]),
});

export type QuickReplyInput = z.infer<typeof quickReplyPayloadSchema>;
export type ExperienceReplyInput = z.infer<typeof experienceReplyPayloadSchema>;
export type ManageResponseAction = z.infer<typeof manageResponseActionSchema>;
