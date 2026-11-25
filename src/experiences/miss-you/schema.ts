import { z } from "zod";

/**
 * I Miss You content contract.
 *
 * Independent of Apology and Birthday: centers on distance, longing, quiet
 * daily reminders, keepsake photographs, and looking ahead to reunion.
 */
export const MISS_YOU_THEME_IDS = [
  "dusk-postage",
  "midnight-window",
  "morning-coffee",
  "starlight-distance",
  "pressed-violet",
] as const;

export type MissYouThemeId = (typeof MISS_YOU_THEME_IDS)[number];

export const MISS_YOU_PHOTO_LAYOUTS = [
  "postcards",
  "polaroid",
  "strips",
  "carousel",
] as const;

export type MissYouPhotoLayout = (typeof MISS_YOU_PHOTO_LAYOUTS)[number];

export const MISS_YOU_AUDIO_IDS = [
  "none",
  "soft-lavender",
  "midnight-glow",
  "paper-morning",
] as const;

export type MissYouAudioId = (typeof MISS_YOU_AUDIO_IDS)[number];

export const missYouPhotoItemSchema = z.union([
  z.string().trim().min(1).max(2048),
  z.object({
    url: z.string().trim().min(1).max(2048),
    caption: z.string().trim().max(120, "Keep caption under 120 characters.").optional(),
    focalPoint: z.string().optional(),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
  }),
]);

export type MissYouPhotoItem = z.infer<typeof missYouPhotoItemSchema>;

export interface NormalizedMissYouPhoto {
  id: string;
  url: string;
  caption?: string;
  focalPoint?: string;
  width?: number;
  height?: number;
}

export function normalizeMissYouPhotos(photos: unknown): NormalizedMissYouPhoto[] {
  if (!Array.isArray(photos)) return [];
  return photos
    .map((item, idx) => {
      if (typeof item === "string") {
        const trimmed = item.trim();
        if (!trimmed) return null;
        return {
          id: `miss-photo-${idx}-${trimmed.slice(-8)}`,
          url: trimmed,
        };
      }
      if (item && typeof item === "object" && "url" in item && typeof item.url === "string") {
        const trimmedUrl = item.url.trim();
        if (!trimmedUrl) return null;
        const caption =
          typeof item.caption === "string" && item.caption.trim() ? item.caption.trim() : undefined;
        const focalPoint =
          typeof item.focalPoint === "string" && item.focalPoint.trim()
            ? item.focalPoint.trim()
            : undefined;
        const width =
          "width" in item && typeof item.width === "number" && item.width > 0
            ? Math.round(item.width)
            : undefined;
        const height =
          "height" in item && typeof item.height === "number" && item.height > 0
            ? Math.round(item.height)
            : undefined;
        return {
          id: `miss-photo-${idx}-${trimmedUrl.slice(-8)}`,
          url: trimmedUrl,
          caption,
          focalPoint,
          width,
          height,
        };
      }
      return null;
    })
    .filter((p): p is NormalizedMissYouPhoto => p !== null);
}

const nameField = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .max(60, `${label} must be 60 characters or fewer.`);

export const missYouContentSchema = z.object({
  recipientName: nameField("Their name"),
  senderName: nameField("Your name"),
  headline: z
    .string()
    .trim()
    .min(1, "Add a headline.")
    .max(80, "Keep the headline under 80 characters."),
  distanceNote: z
    .string()
    .trim()
    .max(60, "Keep the distance label under 60 characters.")
    .optional(),
  letter: z
    .string()
    .trim()
    .min(1, "Write what is on your mind.")
    .max(800, "Keep your note under 800 characters."),
  reminders: z
    .array(z.string().trim().min(1).max(120, "Keep each reminder under 120 characters."))
    .max(3, "Up to 3 reminders.")
    .default([]),
  reunionWish: z
    .string()
    .trim()
    .max(240, "Keep the reunion note under 240 characters.")
    .optional(),
  themeId: z.enum(MISS_YOU_THEME_IDS).default("dusk-postage"),
  photoLayout: z.enum(MISS_YOU_PHOTO_LAYOUTS).default("postcards"),
  photos: z.array(missYouPhotoItemSchema).max(5, "Up to 5 photos.").default([]),
  audio: z.enum(MISS_YOU_AUDIO_IDS).default("none"),
});

export type MissYouContent = z.infer<typeof missYouContentSchema>;
