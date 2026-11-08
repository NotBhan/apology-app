import { z } from "zod";
import { SITUATION_KEYS } from "@/types/apology";
import { CHARACTER_STATES, STICKER_PACK_IDS } from "@/types/sticker";
import { THEME_IDS } from "@/types/theme";
import { DEFAULT_LINK_DAYS, MAX_LINK_DAYS, MIN_LINK_DAYS } from "@/lib/expiry";

const trimmed = (min: number, max: number, label: string) =>
  z
    .string()
    .trim()
    .min(min, `${label} is required.`)
    .max(max, `${label} must be ${max} characters or fewer.`);

export const nameSchema = trimmed(1, 40, "Name");

/** Plain text only — never rendered as HTML. */
export const messageSchema = trimmed(1, 320, "Message");

export const personalNoteSchema = trimmed(0, 1200, "Personal note").default("");

export const themeIdSchema = z.enum(THEME_IDS);
export const stickerPackIdSchema = z.enum(STICKER_PACK_IDS);
export const characterStateSchema = z.enum(CHARACTER_STATES);

export const situationSchema = z.enum(SITUATION_KEYS);

const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Use a 6-digit hex colour.");

export const audioChoiceSchema = z.object({
  source: z.enum(["default", "custom", "none"]),
  trackId: z.string().max(64).optional(),
  assetId: z.string().max(128).optional(),
  volume: z.number().min(0).max(1),
});

export const photoAssetSchema = z.object({
  id: z.string().min(1).max(128),
  url: z.string().min(1).max(2048),
  caption: z.string().trim().max(120).optional(),
  focalPoint: z
    .string()
    .regex(/^\d{1,3}% \d{1,3}%$/)
    .optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

export const customizationSchema = z.object({
  colors: z
    .object({
      background: hexColor.optional(),
      primary: hexColor.optional(),
      secondary: hexColor.optional(),
      accent: hexColor.optional(),
    })
    .optional(),
  audio: audioChoiceSchema,
  photos: z.array(photoAssetSchema).max(5, "Up to 5 photos."),
  memoryStyle: z.enum(["polaroid", "scrapbook", "slideshow"]),
});

/**
 * The link window is the one field a client may set about publishing. The
 * computed `expiresAt` is deliberately absent from this schema, so a crafted
 * request cannot extend or immortalise a link.
 */
export const linkDurationDaysSchema = z
  .number()
  .int("Choose a whole number of days.")
  .min(MIN_LINK_DAYS, `A link must stay live for at least ${MIN_LINK_DAYS} day.`)
  .max(MAX_LINK_DAYS, `A link can stay live for at most ${MAX_LINK_DAYS} days.`);

export const draftPayloadSchema = z.object({
  recipientName: nameSchema,
  senderName: nameSchema,
  situation: situationSchema,
  situationCustom: z.string().trim().max(120).optional(),
  language: z.enum(["en", "hinglish"]),
  messages: z.object({
    message1: messageSchema,
    message2: messageSchema,
    message3: messageSchema,
    personalNote: personalNoteSchema,
  }),
  themeId: themeIdSchema,
  stickerPackId: stickerPackIdSchema,
  customization: customizationSchema,
  linkDurationDays: linkDurationDaysSchema.default(DEFAULT_LINK_DAYS),
});

export type DraftPayload = z.infer<typeof draftPayloadSchema>;

export const createDraftSchema = z.object({
  recipientName: nameSchema,
  senderName: nameSchema,
});

/** Recipient response is local-only unless the recipient explicitly shares it. */
export const recipientResponseSchema = z.object({
  response: z.enum(["forgive", "time", "talk", "appreciate"]),
  emotion: z.enum(["upset", "getting-there", "okay"]).optional(),
  share: z.boolean(),
});

/**
 * Zod schema for theme scene overrides coming from persistence. Scene structure
 * is authored in-app; persisted data can only reference known values, never
 * inject components or animation code.
 */
export const storedSceneSchema = z.object({
  id: z.string().max(48),
  type: z.enum([
    "opening",
    "message",
    "emotion-selector",
    "letter",
    "envelope",
    "memory",
    "gift",
    "closing",
    "response",
  ]),
  title: z.string().max(120).optional(),
});

export const publishedApologySchema = z.object({
  recipientName: nameSchema,
  senderName: nameSchema,
  situation: situationSchema,
  situationCustom: z.string().trim().max(120).optional(),
  messages: z.object({
    message1: messageSchema,
    message2: messageSchema,
    message3: messageSchema,
    personalNote: personalNoteSchema,
  }),
  themeId: themeIdSchema,
  stickerPackId: stickerPackIdSchema,
  customization: customizationSchema,
  publishedAt: z.string(),
});

export function formatZodError(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
