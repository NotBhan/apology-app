import type { ApologyCustomization } from "@/types/apology";
import type { ApologyTheme } from "@/types/theme";

export const FONT_STACKS = {
  display: "var(--font-display), 'Playfair Display', Georgia, serif",
  hand: "var(--font-hand), 'Caveat', 'Segoe Script', cursive",
  body: "var(--font-body), 'Nunito', ui-sans-serif, system-ui, sans-serif",
  sans: "var(--font-sans), 'Inter', ui-sans-serif, system-ui, sans-serif",
} as const;

export type ThemeScopeVars = Record<`--${string}`, string>;

/**
 * Resolves the effective palette for a theme, applying only the sender's
 * *colour* overrides. Structural values (spacing, composition, motion) are
 * never overridable.
 */
export function resolvePalette(theme: ApologyTheme, customization?: ApologyCustomization) {
  return {
    ...theme.palette,
    ...(customization?.colors?.background
      ? { background: customization.colors.background }
      : {}),
    ...(customization?.colors?.primary ? { primary: customization.colors.primary } : {}),
    ...(customization?.colors?.secondary
      ? { secondary: customization.colors.secondary }
      : {}),
    ...(customization?.colors?.accent ? { accent: customization.colors.accent } : {}),
  };
}

export function themeScopeVars(
  theme: ApologyTheme,
  customization?: ApologyCustomization,
): ThemeScopeVars {
  const palette = resolvePalette(theme, customization);
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
    "--t-font-heading": FONT_STACKS[theme.typography.heading],
    "--t-font-body": FONT_STACKS[theme.typography.body],
    "--t-font-deco": FONT_STACKS[theme.typography.decorative ?? "hand"],
    "--t-heading-weight": String(theme.typography.headingWeight ?? 500),
    "--t-heading-tracking": theme.typography.headingTracking ?? "-0.02em",
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
