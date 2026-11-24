import { z } from "zod";

/**
 * Birthday content contract.
 *
 * Deliberately independent of the apology schema: a birthday has a headline, a
 * wish and an optional age, not an apology's three-message arc. Keeping the
 * shapes separate is what stops one experience's fields leaking into another.
 */
export const BIRTHDAY_THEME_IDS = [
  "confetti",
  "midnight-gold",
  "pastel",
  "floral",
  "vintage",
  "playful",
] as const;

export type BirthdayThemeId = (typeof BIRTHDAY_THEME_IDS)[number];

export const BIRTHDAY_PHOTO_LAYOUTS = [
  "theme-adaptive",
  "scrapbook",
  "polaroid",
  "slideshow",
] as const;

export type BirthdayPhotoLayout = (typeof BIRTHDAY_PHOTO_LAYOUTS)[number];

export const birthdayPhotoItemSchema = z.union([
  z.string().trim().min(1).max(2048),
  z.object({
    url: z.string().trim().min(1).max(2048),
    caption: z.string().trim().max(120, "Keep caption under 120 characters.").optional(),
    focalPoint: z.string().optional(),
  }),
]);

export type BirthdayPhotoItem = z.infer<typeof birthdayPhotoItemSchema>;

export interface NormalizedBirthdayPhoto {
  id: string;
  url: string;
  caption?: string;
  focalPoint?: string;
}

export function normalizeBirthdayPhotos(photos: unknown): NormalizedBirthdayPhoto[] {
  if (!Array.isArray(photos)) return [];
  return photos
    .map((item, idx) => {
      if (typeof item === "string") {
        const trimmed = item.trim();
        if (!trimmed) return null;
        return {
          id: `bday-photo-${idx}-${trimmed.slice(-8)}`,
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
        return {
          id: `bday-photo-${idx}-${trimmedUrl.slice(-8)}`,
          url: trimmedUrl,
          caption,
          focalPoint,
        };
      }
      return null;
    })
    .filter((p): p is NormalizedBirthdayPhoto => p !== null);
}

const name = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .max(60, `${label} is too long.`);

export const birthdayContentSchema = z.object({
  recipientName: name("Their name"),
  senderName: name("Your name"),
  /** Optional: some birthdays do not advertise a number. */
  age: z
    .number()
    .int("Use a whole number.")
    .min(1, "Age must be positive.")
    .max(150, "That age is not believable.")
    .optional(),
  headline: z
    .string()
    .trim()
    .min(1, "Add a headline.")
    .max(80, "Keep the headline under 80 characters."),
  message: z
    .string()
    .trim()
    .min(1, "Write a message.")
    .max(600, "Keep the message under 600 characters."),
  wish: z.string().trim().max(200, "Keep the wish under 200 characters.").optional(),
  themeId: z.enum(BIRTHDAY_THEME_IDS),
  /** Decorative candle count on the cake (1–7, defaults to 3, strictly independent of age). */
  candleCount: z.number().int().min(1).max(7).default(3),
  photoLayout: z.enum(BIRTHDAY_PHOTO_LAYOUTS).default("theme-adaptive"),
  photos: z.array(birthdayPhotoItemSchema).max(5, "Up to 5 photos.").default([]),
  audio: z.enum(["none", "celebration", "soft"]).default("none"),
});

export type BirthdayContent = z.infer<typeof birthdayContentSchema>;
