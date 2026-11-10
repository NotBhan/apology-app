import { z } from "zod";

/**
 * Birthday content contract.
 *
 * Deliberately independent of the apology schema: a birthday has a headline, a
 * wish and an optional age, not an apology's three-message arc. Keeping the
 * shapes separate is what stops one experience's fields leaking into another.
 */
export const BIRTHDAY_THEME_IDS = ["confetti", "midnight-gold"] as const;

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
  photos: z.array(z.string().trim().min(1).max(2048)).max(5, "Up to 5 photos.").default([]),
  audio: z.enum(["none", "celebration", "soft"]).default("none"),
});

export type BirthdayContent = z.infer<typeof birthdayContentSchema>;
