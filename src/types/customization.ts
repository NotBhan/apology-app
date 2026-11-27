export const FONT_PAIRINGS = ["theme", "editorial", "handwritten", "clean"] as const;
export type FontPairing = (typeof FONT_PAIRINGS)[number];

export const TEXT_SIZES = ["compact", "comfortable", "expressive"] as const;
export type TextSize = (typeof TEXT_SIZES)[number];

export const TEXT_ALIGNMENTS = ["theme", "left", "center"] as const;
export type TextAlignment = (typeof TEXT_ALIGNMENTS)[number];

export const DECORATION_DENSITIES = ["minimal", "balanced", "lush"] as const;
export type DecorationDensity = (typeof DECORATION_DENSITIES)[number];

export const MOTION_PRESETS = ["gentle", "expressive", "still"] as const;
export type MotionPreset = (typeof MOTION_PRESETS)[number];

export const TRANSITION_STYLES = [
  "theme",
  "crossfade",
  "scale",
  "card",
  "curtain",
  "paper",
] as const;
export type TransitionStyle = (typeof TRANSITION_STYLES)[number];

export const REVEAL_STYLES = [
  "theme",
  "word-stagger",
  "typewriter",
  "ink",
  "line-reveal",
  "fade",
] as const;
export type RevealStyle = (typeof REVEAL_STYLES)[number];

export const ENVELOPE_STYLES = ["wax-seal", "ribbon", "open-letter"] as const;
export type EnvelopeStyle = (typeof ENVELOPE_STYLES)[number];

export interface VisualCustomization {
  fontPairing?: FontPairing;
  textSize?: TextSize;
  alignment?: TextAlignment;
  decorationsEnabled?: boolean;
  decorationDensity?: DecorationDensity;
}

export interface ApologyInteractionCustomization {
  envelopeStyle?: EnvelopeStyle;
  transitionStyle?: TransitionStyle;
  revealStyle?: RevealStyle;
  motionPreset?: MotionPreset;
}

export interface ApologyContentCustomization {
  openingTitle?: string;
  openingSubtitle?: string;
  openingCta?: string;
  envelopeHeader?: string;
  envelopeSignOff?: string;
  closingHeadline?: string;
  closingBody?: string;
  sceneHeadings?: {
    hurt?: string;
    meaning?: string;
    sorry?: string;
    memory?: string;
    response?: string;
  };
  showSituationLabel?: boolean;
  showMemoryScene?: boolean;
}
