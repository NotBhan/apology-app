import { z } from "zod";
import {
  envelopeStyleSchema,
  motionPresetSchema,
  transitionStyleSchema,
  visualCustomizationSchema,
} from "@/lib/validation/customization";

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

export const BIRTHDAY_CAKE_FLAVORS = [
  "theme",
  "vanilla",
  "chocolate",
  "strawberry",
  "matcha",
  "funfetti",
] as const;

export type BirthdayCakeFlavor = (typeof BIRTHDAY_CAKE_FLAVORS)[number];

export const BIRTHDAY_CAKE_TOPPINGS = [
  "theme",
  "cherries",
  "stars",
  "strawberries",
  "flowers",
  "sprinkles",
] as const;

export type BirthdayCakeTopping = (typeof BIRTHDAY_CAKE_TOPPINGS)[number];

export const BIRTHDAY_GIFT_REVEALS = ["tap-unwrap", "direct"] as const;
export type BirthdayGiftReveal = (typeof BIRTHDAY_GIFT_REVEALS)[number];

export const BIRTHDAY_CANDLE_MODES = ["tap-relight", "single-wish"] as const;
export type BirthdayCandleMode = (typeof BIRTHDAY_CANDLE_MODES)[number];

export const BIRTHDAY_CELEBRATION_INTENSITIES = ["subtle", "festive", "grand"] as const;
export type BirthdayCelebrationIntensity = (typeof BIRTHDAY_CELEBRATION_INTENSITIES)[number];

const hexColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Use a 6-digit hex colour.");

const optionalText = (max: number, label: string) =>
  z.string().trim().max(max, `${label} must be ${max} characters or fewer.`).optional();

export const birthdayColorsSchema = z.object({
  background: hexColorSchema.optional(),
  surface: hexColorSchema.optional(),
  primary: hexColorSchema.optional(),
  secondary: hexColorSchema.optional(),
  accent: hexColorSchema.optional(),
  text: hexColorSchema.optional(),
});

export const birthdayContentOverridesSchema = z.object({
  openingEyebrow: optionalText(60, "Opening eyebrow"),
  openingSubtitle: optionalText(120, "Opening subtitle"),
  openingCta: optionalText(40, "Opening button label"),
  wishCardBadge: optionalText(40, "Wish card label"),
  cakeHeading: optionalText(60, "Cake heading"),
  cakeSubtitle: optionalText(120, "Cake subtitle"),
  cakeCta: optionalText(50, "Cake button label"),
  letterEyebrow: optionalText(60, "Letter eyebrow"),
  letterHeading: optionalText(60, "Letter heading"),
  letterSignOff: optionalText(60, "Letter sign-off"),
  galleryHeading: optionalText(60, "Gallery heading"),
  gallerySubtitle: optionalText(120, "Gallery subtitle"),
  galleryCta: optionalText(50, "Gallery button label"),
  finaleHeading: optionalText(80, "Finale heading"),
  showAgeBadge: z.boolean().optional(),
  showCakeScene: z.boolean().optional(),
  showGalleryScene: z.boolean().optional(),
});

export const birthdayCakeCustomizationSchema = z.object({
  tiers: z.union([z.literal(2), z.literal(3)]).optional(),
  flavor: z.enum(BIRTHDAY_CAKE_FLAVORS).optional(),
  topping: z.enum(BIRTHDAY_CAKE_TOPPINGS).optional(),
});

export const birthdayVisualCustomizationSchema = visualCustomizationSchema.extend({
  cake: birthdayCakeCustomizationSchema.optional(),
});

export const birthdayInteractionCustomizationSchema = z.object({
  envelopeStyle: envelopeStyleSchema.optional(),
  transitionStyle: transitionStyleSchema.optional(),
  motionPreset: motionPresetSchema.optional(),
  giftReveal: z.enum(BIRTHDAY_GIFT_REVEALS).optional(),
  candleMode: z.enum(BIRTHDAY_CANDLE_MODES).optional(),
  celebrationIntensity: z.enum(BIRTHDAY_CELEBRATION_INTENSITIES).optional(),
});

export const birthdayCustomizationSchema = z.object({
  colors: birthdayColorsSchema.optional(),
  content: birthdayContentOverridesSchema.optional(),
  visual: birthdayVisualCustomizationSchema.optional(),
  interaction: birthdayInteractionCustomizationSchema.optional(),
});

export type BirthdayCustomization = z.infer<typeof birthdayCustomizationSchema>;

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
  customization: birthdayCustomizationSchema.optional(),
});

export type BirthdayContent = z.infer<typeof birthdayContentSchema>;
