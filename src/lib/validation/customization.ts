import { z } from "zod";
import {
  DECORATION_DENSITIES,
  ENVELOPE_STYLES,
  FONT_PAIRINGS,
  MOTION_PRESETS,
  REVEAL_STYLES,
  TEXT_ALIGNMENTS,
  TEXT_SIZES,
  TRANSITION_STYLES,
} from "@/types/customization";

function optionalText(maxLength: number, label: string) {
  return z
    .string()
    .trim()
    .max(maxLength, `${label} must be ${maxLength} characters or fewer.`)
    .optional();
}

export const fontPairingSchema = z.enum(FONT_PAIRINGS);
export const textSizeSchema = z.enum(TEXT_SIZES);
export const textAlignmentSchema = z.enum(TEXT_ALIGNMENTS);
export const decorationDensitySchema = z.enum(DECORATION_DENSITIES);
export const motionPresetSchema = z.enum(MOTION_PRESETS);
export const transitionStyleSchema = z.enum(TRANSITION_STYLES);
export const revealStyleSchema = z.enum(REVEAL_STYLES);
export const envelopeStyleSchema = z.enum(ENVELOPE_STYLES);

export const visualCustomizationSchema = z.object({
  fontPairing: fontPairingSchema.optional(),
  textSize: textSizeSchema.optional(),
  alignment: textAlignmentSchema.optional(),
  decorationsEnabled: z.boolean().optional(),
  decorationDensity: decorationDensitySchema.optional(),
});

export const apologyInteractionSchema = z.object({
  envelopeStyle: envelopeStyleSchema.optional(),
  transitionStyle: transitionStyleSchema.optional(),
  revealStyle: revealStyleSchema.optional(),
  motionPreset: motionPresetSchema.optional(),
});

export const apologyContentSchema = z.object({
  openingTitle: optionalText(80, "Opening title"),
  openingSubtitle: optionalText(140, "Opening subtitle"),
  openingCta: optionalText(40, "Opening button label"),
  envelopeHeader: optionalText(60, "Letter header"),
  envelopeSignOff: optionalText(60, "Sign-off"),
  closingHeadline: optionalText(120, "Closing headline"),
  closingBody: optionalText(360, "Closing message"),
  sceneHeadings: z
    .object({
      hurt: optionalText(60, "First scene heading"),
      meaning: optionalText(60, "Second scene heading"),
      sorry: optionalText(60, "Third scene heading"),
      memory: optionalText(60, "Memory scene heading"),
      response: optionalText(60, "Response heading"),
    })
    .optional(),
  showSituationLabel: z.boolean().optional(),
  showMemoryScene: z.boolean().optional(),
});
