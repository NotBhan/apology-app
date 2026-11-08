import type { CharacterState, StickerPackId } from "./sticker";

export const THEME_IDS = [
  "romantic",
  "friendship",
  "heartfelt",
  "midnight",
  "cute",
  "regret",
  "fresh-start",
  "minimal",
] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export interface ThemePalette {
  background: string;
  /** Second stop for the theme's own background composition. */
  backgroundAlt: string;
  surface: string;
  surfaceAlt: string;
  primary: string;
  secondary: string;
  accent: string;
  text: string;
  mutedText: string;
  border: string;
}

export interface ThemeTypography {
  /** Family token resolved by the theme scope, e.g. `display`, `hand`, `body`. */
  heading: "display" | "body" | "hand";
  body: "body" | "sans";
  decorative?: "hand" | "display";
  headingWeight?: number;
  headingTracking?: string;
  uppercaseEyebrow?: boolean;
}

export type AmbientKind =
  | "hearts"
  | "confetti"
  | "paper"
  | "stars"
  | "bubbles"
  | "petals"
  | "butterflies"
  | "sparkles"
  | "none";

export type MessageReveal = "fade" | "typewriter" | "word-stagger" | "ink" | "line-reveal";

export interface ThemeMotion {
  preset: string;
  ambientKind: AmbientKind;
  ambientDensity: "low" | "medium" | "high";
  /** seconds */
  sceneEnterDuration: number;
  /** seconds between child reveals */
  stagger: number;
  messageReveal: MessageReveal;
  /** Character entrance style, consumed by CharacterController. */
  characterEntrance: "rise" | "pop" | "slide" | "fade" | "unfold";
  /** How scenes change. */
  transition: "crossfade" | "scale" | "card" | "curtain" | "paper";
}

export interface ThemeAssets {
  /** CSS paint used for the base layer (gradients only, no remote files). */
  backgroundPaint: string;
  /** Named decorative motifs the skin renders itself. */
  decorativeElements: string[];
  /** Envelope artwork variant key. */
  envelope: "classic" | "kraft" | "blush" | "midnight" | "ivory";
  letter: "ruled" | "plain" | "deckle" | "note";
  /** Optional texture overlay: grain | paper | none */
  texture: "grain" | "paper" | "none";
}

/**
 * A theme is data + a skin component. The skin owns composition; nothing
 * about a theme is derived by recolouring a shared template.
 */
export interface ApologyTheme {
  id: ThemeId;
  name: string;
  tagline: string;
  description: string;
  category: string;
  palette: ThemePalette;
  typography: ThemeTypography;
  assets: ThemeAssets;
  motion: ThemeMotion;
  /** Music track id from `src/content/tracks.ts`. */
  defaultMusic?: string;
  /** Ordered scene ids rendered by the presentation engine. */
  sceneIds: string[];
  /** Which copy variant the opening scene uses. */
  openingVariant: "bouquet" | "scrapbook" | "envelope" | "celestial" | "bounce" | "rose" | "sunrise" | "minimal";
  /** Preferred character state per scene id. */
  characterStates: Partial<Record<string, CharacterState>>;
  /** Recommended sticker pack when this theme is chosen (still overridable). */
  suggestedPack: StickerPackId;
}
