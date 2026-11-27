import { getTrack, type MusicTrack } from "@/content/tracks";
import {
  contrastRatio,
  FONT_STACKS,
  resolveAdaptivePalette,
  type ThemeScopeVars,
} from "@/lib/theme-vars";
import type {
  DecorationDensity,
  EnvelopeStyle,
  MotionPreset,
  TextAlignment,
  TextSize,
  TransitionStyle,
} from "@/types/customization";
import type {
  BirthdayCakeFlavor,
  BirthdayCandleMode,
  BirthdayCelebrationIntensity,
  BirthdayContent,
  BirthdayGiftReveal,
} from "./schema";
import { resolveBirthdayTheme, type BirthdayTheme } from "./themes";

export type BirthdaySceneKey = "opening" | "wish" | "message" | "gallery" | "finale";

export const BIRTHDAY_CAKE_FLAVOR_PRESETS: Record<
  Exclude<BirthdayCakeFlavor, "theme">,
  { label: string; base: string; frosting: string; accent: string }
> = {
  vanilla: { label: "Vanilla Cream", base: "#f3e1c3", frosting: "#fffcf6", accent: "#d97706" },
  chocolate: { label: "Rich Cocoa", base: "#5c3a28", frosting: "#3a2317", accent: "#f59e0b" },
  strawberry: { label: "Berry Blush", base: "#fbcfe8", frosting: "#fff1f5", accent: "#e11d48" },
  matcha: { label: "Matcha Cream", base: "#c8e0c2", frosting: "#f6fbf4", accent: "#2f855a" },
  funfetti: { label: "Funfetti Whip", base: "#fff1d6", frosting: "#ffffff", accent: "#ec4899" },
};

export interface BirthdayColorPreset {
  id: string;
  label: string;
  colors: {
    background: string;
    surface: string;
    primary: string;
    secondary: string;
    accent: string;
  };
}

export const BIRTHDAY_COLOR_PRESETS: BirthdayColorPreset[] = [
  {
    id: "champagne-blush",
    label: "Champagne Blush",
    colors: {
      background: "#fbf4ee",
      surface: "#fffcf9",
      primary: "#c93b6b",
      secondary: "#e2a354",
      accent: "#7c4dff",
    },
  },
  {
    id: "midnight-velvet",
    label: "Midnight Velvet",
    colors: {
      background: "#17141b",
      surface: "#221d28",
      primary: "#ebb968",
      secondary: "#d97757",
      accent: "#ffe08a",
    },
  },
  {
    id: "sage-cream",
    label: "Sage & Cream",
    colors: {
      background: "#f2f6f2",
      surface: "#fcfefd",
      primary: "#3f7a58",
      secondary: "#c86b52",
      accent: "#d69e2e",
    },
  },
  {
    id: "cobalt-pop",
    label: "Cobalt Confetti",
    colors: {
      background: "#f4f7ff",
      surface: "#ffffff",
      primary: "#2f57d8",
      secondary: "#ec4899",
      accent: "#f59e0b",
    },
  },
];

export interface ResolvedBirthdayConfig {
  baseTheme: BirthdayTheme;
  theme: BirthdayTheme;
  palette: BirthdayTheme["palette"];
  contrastRatioValue: number;
  hasLowContrast: boolean;
  typography: {
    headingFont: string;
    bodyFont: string;
    textSize: TextSize;
    textScale: string;
    alignment: TextAlignment;
  };
  scopeVars: ThemeScopeVars;
  cake: BirthdayTheme["cake"] & { flavor: BirthdayCakeFlavor };
  decorations: {
    enabled: boolean;
    density: DecorationDensity;
  };
  content: {
    openingEyebrow: string;
    openingSubtitle: string;
    openingCta: string;
    wishCardBadge: string;
    cakeHeading: string;
    cakeSubtitle: string;
    cakeCta: string;
    letterEyebrow: string;
    letterHeading: string;
    letterSignOff: string;
    galleryHeading: string;
    gallerySubtitle: string;
    galleryCta: string;
    finaleHeading: string;
    showAgeBadge: boolean;
    showCakeScene: boolean;
    showGalleryScene: boolean;
  };
  interaction: {
    envelopeStyle: EnvelopeStyle;
    transitionStyle: TransitionStyle;
    motionPreset: MotionPreset;
    giftReveal: BirthdayGiftReveal;
    candleMode: BirthdayCandleMode;
    celebrationIntensity: BirthdayCelebrationIntensity;
  };
  scenes: BirthdaySceneKey[];
  audioTrack?: MusicTrack;
}

function cleanOverride(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
}

function resolveFonts(
  baseTheme: BirthdayTheme,
  pairing: NonNullable<NonNullable<BirthdayContent["customization"]>["visual"]>["fontPairing"],
) {
  if (pairing === "editorial") {
    return { headingFont: FONT_STACKS.display, bodyFont: FONT_STACKS.body };
  }
  if (pairing === "handwritten") {
    return { headingFont: FONT_STACKS.hand, bodyFont: FONT_STACKS.body };
  }
  if (pairing === "clean") {
    return { headingFont: FONT_STACKS.sans, bodyFont: FONT_STACKS.sans };
  }
  return {
    headingFont: baseTheme.typography.headingFont,
    bodyFont: baseTheme.typography.bodyFont,
  };
}

function resolveTextScale(size: TextSize | undefined): { textSize: TextSize; textScale: string } {
  if (size === "compact") return { textSize: "compact", textScale: "0.93" };
  if (size === "expressive") return { textSize: "expressive", textScale: "1.08" };
  return { textSize: "comfortable", textScale: "1" };
}

export function resolveBirthdayAudioTrack(
  audio: BirthdayContent["audio"] | string | undefined,
  themeId: BirthdayContent["themeId"],
): MusicTrack | undefined {
  if (audio === "celebration") return getTrack("sunlit-room");
  if (audio === "soft") {
    return getTrack(themeId === "midnight-gold" ? "midnight-glow" : "soft-lavender");
  }
  return undefined;
}

/**
 * Resolves all birthday content, palette contrast, typography, cake, scene
 * visibility, audio, and interaction defaults from persisted draft/published
 * content. Shared identically by BirthdayEditor preview and BirthdayLetter.
 */
export function resolveBirthdayConfig(content: BirthdayContent): ResolvedBirthdayConfig {
  const baseTheme = resolveBirthdayTheme(content.themeId);
  const custom = content.customization;
  const palette = resolveAdaptivePalette(baseTheme.palette, custom?.colors);

  const bgContrast = contrastRatio(palette.text, palette.background);
  const surfaceContrast = contrastRatio(palette.text, palette.surface);
  const contrastRatioValue = Math.min(bgContrast, surfaceContrast);
  const hasLowContrast = contrastRatioValue < 4.5;

  const visual = custom?.visual;
  const fonts = resolveFonts(baseTheme, visual?.fontPairing);
  const { textSize, textScale } = resolveTextScale(visual?.textSize);
  const alignment: TextAlignment = visual?.alignment === "left" ? "left" : "center";

  const flavor: BirthdayCakeFlavor = visual?.cake?.flavor ?? "theme";
  const flavorColors =
    flavor !== "theme" ? BIRTHDAY_CAKE_FLAVOR_PRESETS[flavor] : undefined;
  const resolvedTopping =
    visual?.cake?.topping && visual.cake.topping !== "theme"
      ? visual.cake.topping
      : baseTheme.cake.topping;

  const cake: BirthdayTheme["cake"] & { flavor: BirthdayCakeFlavor } = {
    tiers: visual?.cake?.tiers ?? baseTheme.cake.tiers,
    base: flavorColors?.base ?? baseTheme.cake.base,
    frosting: flavorColors?.frosting ?? baseTheme.cake.frosting,
    accent: flavorColors?.accent ?? (custom?.colors?.accent ?? baseTheme.cake.accent),
    plate: baseTheme.cake.plate,
    topping: resolvedTopping,
    flavor,
  };

  const resolvedTheme: BirthdayTheme = {
    ...baseTheme,
    palette,
    typography: {
      ...baseTheme.typography,
      headingFont: fonts.headingFont,
      bodyFont: fonts.bodyFont,
    },
    envelope: {
      ...baseTheme.envelope,
      paper: custom?.colors?.surface ?? baseTheme.envelope.paper,
      accent: palette.primary,
      seal: palette.secondary,
    },
    cake,
  };

  const showAgeBadge = custom?.content?.showAgeBadge ?? true;
  const showCakeScene = custom?.content?.showCakeScene ?? true;
  const showGalleryScene = custom?.content?.showGalleryScene ?? true;

  const defaultOpeningSubtitle =
    content.age && showAgeBadge
      ? `Turning ${content.age} today`
      : `Specially prepared for ${content.recipientName || "you"}`;
  const defaultCakeSubtitle =
    content.age && showAgeBadge
      ? `${content.age} looks wonderful on you.`
      : "Another beautiful year ahead.";
  const defaultFinaleHeading = content.wish?.trim() || "Happy birthday.";

  const resolvedContent = {
    openingEyebrow: cleanOverride(custom?.content?.openingEyebrow, "a birthday invitation"),
    openingSubtitle: cleanOverride(custom?.content?.openingSubtitle, defaultOpeningSubtitle),
    openingCta: cleanOverride(custom?.content?.openingCta, "Open it"),
    wishCardBadge: cleanOverride(custom?.content?.wishCardBadge, "A Special Day"),
    cakeHeading: cleanOverride(custom?.content?.cakeHeading, "make a wish"),
    cakeSubtitle: cleanOverride(custom?.content?.cakeSubtitle, defaultCakeSubtitle),
    cakeCta: cleanOverride(custom?.content?.cakeCta, "Blow out the candles"),
    letterEyebrow: cleanOverride(custom?.content?.letterEyebrow, baseTheme.name),
    letterHeading: cleanOverride(custom?.content?.letterHeading, "Personal Letter"),
    letterSignOff: cleanOverride(custom?.content?.letterSignOff, "With warmest wishes,"),
    galleryHeading: cleanOverride(custom?.content?.galleryHeading, "Some moments"),
    gallerySubtitle: cleanOverride(
      custom?.content?.gallerySubtitle,
      "Snapshots saved for your birthday",
    ),
    galleryCta: cleanOverride(custom?.content?.galleryCta, "One last thing"),
    finaleHeading: cleanOverride(custom?.content?.finaleHeading, defaultFinaleHeading),
    showAgeBadge,
    showCakeScene,
    showGalleryScene,
  };

  const interaction = {
    envelopeStyle: custom?.interaction?.envelopeStyle ?? ("wax-seal" as EnvelopeStyle),
    transitionStyle: custom?.interaction?.transitionStyle ?? ("theme" as TransitionStyle),
    motionPreset: custom?.interaction?.motionPreset ?? ("gentle" as MotionPreset),
    giftReveal: custom?.interaction?.giftReveal ?? ("tap-unwrap" as BirthdayGiftReveal),
    candleMode: custom?.interaction?.candleMode ?? ("tap-relight" as BirthdayCandleMode),
    celebrationIntensity:
      custom?.interaction?.celebrationIntensity ??
      ("festive" as BirthdayCelebrationIntensity),
  };

  const scenes: BirthdaySceneKey[] = ["opening"];
  if (showCakeScene) scenes.push("wish");
  scenes.push("message");
  if (showGalleryScene) scenes.push("gallery");
  scenes.push("finale");

  const scopeVars: ThemeScopeVars = {
    "--b-bg": palette.background,
    "--b-surface": palette.surface,
    "--b-primary": palette.primary,
    "--b-secondary": palette.secondary,
    "--b-accent": palette.accent,
    "--b-text": palette.text,
    "--b-muted": palette.mutedText,
    "--b-border": palette.border,
    "--b-font-heading": fonts.headingFont,
    "--b-font-body": fonts.bodyFont,
    "--b-text-scale": textScale,
    "--b-align": alignment,
  };

  return {
    baseTheme,
    theme: resolvedTheme,
    palette,
    contrastRatioValue,
    hasLowContrast,
    typography: {
      headingFont: fonts.headingFont,
      bodyFont: fonts.bodyFont,
      textSize,
      textScale,
      alignment,
    },
    scopeVars,
    cake,
    decorations: {
      enabled: visual?.decorationsEnabled ?? true,
      density: visual?.decorationDensity ?? "balanced",
    },
    content: resolvedContent,
    interaction,
    scenes,
    audioTrack: resolveBirthdayAudioTrack(content.audio, content.themeId),
  };
}
