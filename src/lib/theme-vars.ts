import type { ApologyCustomization } from "@/types/apology";
import type { TextAlignment, TextSize } from "@/types/customization";
import type { ApologyTheme } from "@/types/theme";

export const FONT_STACKS = {
  display: "var(--font-display), 'Playfair Display', Georgia, serif",
  hand: "var(--font-hand), 'Caveat', 'Segoe Script', cursive",
  body: "var(--font-body), 'Nunito', ui-sans-serif, system-ui, sans-serif",
  sans: "var(--font-sans), 'Inter', ui-sans-serif, system-ui, sans-serif",
} as const;

export type ThemeScopeVars = Record<`--${string}`, string>;

const DARK_TEXT_FALLBACK = "#1f1826";
const LIGHT_TEXT_FALLBACK = "#fffaf3";

function parseHexRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  if (clean.length === 3) {
    return [
      parseInt(clean[0] + clean[0], 16),
      parseInt(clean[1] + clean[1], 16),
      parseInt(clean[2] + clean[2], 16),
    ];
  }
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

function toHex(rgb: [number, number, number]): string {
  return (
    "#" +
    rgb
      .map((channel) =>
        Math.max(0, Math.min(255, Math.round(channel)))
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

function mixHex(hexA: string, hexB: string, weightB: number): string {
  const [r1, g1, b1] = parseHexRgb(hexA);
  const [r2, g2, b2] = parseHexRgb(hexB);
  const w = Math.max(0, Math.min(1, weightB));
  return toHex([r1 + (r2 - r1) * w, g1 + (g2 - g1) * w, b1 + (b2 - b1) * w]);
}

function isDarkHex(hex: string): boolean {
  const [r, g, b] = parseHexRgb(hex);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum < 0.52;
}

export interface BasePalette {
  background: string;
  backgroundAlt?: string;
  surface: string;
  surfaceAlt?: string;
  primary: string;
  secondary: string;
  accent: string;
  text: string;
  mutedText: string;
  border: string;
}

export interface PaletteOverrides {
  background?: string;
  surface?: string;
  primary?: string;
  secondary?: string;
  accent?: string;
  text?: string;
}

/**
 * Resolves colour overrides against a theme's base palette while keeping
 * surface, alt-background, border, and text contrast legible.
 */
export function resolveAdaptivePalette<T extends BasePalette>(
  basePalette: T,
  colors?: PaletteOverrides,
): T {
  const baseBg = colors?.background ?? basePalette.background;
  const bgOverridden = Boolean(
    colors?.background && colors.background.toLowerCase() !== basePalette.background.toLowerCase(),
  );
  const darkBg = isDarkHex(baseBg);

  let derivedText = basePalette.text;
  let derivedMuted = basePalette.mutedText;
  let derivedBgAlt = basePalette.backgroundAlt;
  let derivedSurface = basePalette.surface;
  let derivedSurfaceAlt = basePalette.surfaceAlt;
  let derivedBorder = basePalette.border;

  const themeIsDark = isDarkHex(basePalette.background);
  if (bgOverridden) {
    derivedText = readableTextOn(
      baseBg,
      themeIsDark ? DARK_TEXT_FALLBACK : basePalette.text,
      themeIsDark ? basePalette.text : LIGHT_TEXT_FALLBACK,
    );
    derivedMuted = mixHex(derivedText, baseBg, 0.34);
    if (basePalette.backgroundAlt) {
      derivedBgAlt = darkBg ? mixHex(baseBg, "#000000", 0.18) : mixHex(baseBg, "#000000", 0.06);
    }
    derivedSurface = darkBg ? mixHex(baseBg, "#ffffff", 0.08) : mixHex(baseBg, "#ffffff", 0.68);
    if (basePalette.surfaceAlt) {
      derivedSurfaceAlt = darkBg ? mixHex(baseBg, "#ffffff", 0.14) : mixHex(baseBg, "#ffffff", 0.44);
    }
    derivedBorder = mixHex(baseBg, derivedText, 0.18);
  }

  const surface = colors?.surface ?? derivedSurface;
  const text =
    colors?.text ??
    (bgOverridden || colors?.surface
      ? readableTextOn(
          colors?.surface ? surface : baseBg,
          themeIsDark ? DARK_TEXT_FALLBACK : basePalette.text,
          themeIsDark ? basePalette.text : LIGHT_TEXT_FALLBACK,
        )
      : derivedText);

  return {
    ...basePalette,
    background: baseBg,
    ...(derivedBgAlt !== undefined ? { backgroundAlt: derivedBgAlt } : {}),
    surface,
    ...(derivedSurfaceAlt !== undefined
      ? { surfaceAlt: colors?.surface ? mixHex(surface, text, 0.05) : derivedSurfaceAlt }
      : {}),
    border: colors?.surface ? mixHex(surface, text, 0.18) : derivedBorder,
    primary: colors?.primary ?? basePalette.primary,
    secondary: colors?.secondary ?? basePalette.secondary,
    accent: colors?.accent ?? basePalette.accent,
    text,
    mutedText: colors?.text ? mixHex(colors.text, baseBg, 0.34) : derivedMuted,
  };
}

/**
 * Resolves the effective palette for a theme, applying the sender's colour
 * overrides while keeping surface, alt-background, and text contrast legible.
 */
export function resolvePalette(theme: ApologyTheme, customization?: ApologyCustomization) {
  return resolveAdaptivePalette(theme.palette, customization?.colors);
}

function resolveFontStacks(theme: ApologyTheme, customization?: ApologyCustomization) {
  const pairing = customization?.visual?.fontPairing ?? "theme";
  if (pairing === "editorial") {
    return {
      heading: FONT_STACKS.display,
      body: FONT_STACKS.body,
      deco: FONT_STACKS.hand,
    };
  }
  if (pairing === "handwritten") {
    return {
      heading: FONT_STACKS.hand,
      body: FONT_STACKS.body,
      deco: FONT_STACKS.hand,
    };
  }
  if (pairing === "clean") {
    return {
      heading: FONT_STACKS.sans,
      body: FONT_STACKS.sans,
      deco: FONT_STACKS.hand,
    };
  }
  return {
    heading: FONT_STACKS[theme.typography.heading],
    body: FONT_STACKS[theme.typography.body],
    deco: FONT_STACKS[theme.typography.decorative ?? "hand"],
  };
}

function resolveScale(size: TextSize | undefined): string {
  if (size === "compact") return "0.93";
  if (size === "expressive") return "1.08";
  return "1";
}

function resolveAlignment(alignment: TextAlignment | undefined): string {
  if (alignment === "left") return "left";
  return "center";
}

export function themeScopeVars(
  theme: ApologyTheme,
  customization?: ApologyCustomization,
): ThemeScopeVars {
  const palette = resolvePalette(theme, customization);
  const fonts = resolveFontStacks(theme, customization);
  const textScale = resolveScale(customization?.visual?.textSize);
  const align = resolveAlignment(customization?.visual?.alignment);

  return {
    "--t-bg": palette.background,
    "--t-bg-alt": palette.backgroundAlt,
    "--t-surface": palette.surface,
    "--t-surface-alt": palette.surfaceAlt,
    "--t-primary": palette.primary,
    "--t-secondary": palette.secondary,
    "--t-accent": palette.accent,
    "--t-text": palette.text,
    "--t-muted": palette.mutedText,
    "--t-border": palette.border,
    "--t-font-heading": fonts.heading,
    "--t-font-body": fonts.body,
    "--t-font-deco": fonts.deco,
    "--t-heading-weight": String(theme.typography.headingWeight ?? 500),
    "--t-heading-tracking": theme.typography.headingTracking ?? "-0.02em",
    "--t-text-scale": textScale,
    "--t-align": align,
  };
}

/** Relative luminance based contrast helper for sender-chosen colours. */
export function contrastRatio(hexA: string, hexB: string): number {
  const lum = (hex: string) => {
    const clean = hex.replace("#", "");
    const channels = [0, 2, 4].map((i) => {
      const v = parseInt(clean.slice(i, i + 2), 16) / 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  };
  const a = lum(hexA);
  const b = lum(hexB);
  const [light, dark] = a > b ? [a, b] : [b, a];
  return (light + 0.05) / (dark + 0.05);
}

/** Picks a readable text colour for an arbitrary background. */
export function readableTextOn(background: string, dark = "#241733", light = "#fffaf3") {
  return contrastRatio(background, dark) >= 4.5 ? dark : light;
}
