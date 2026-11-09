import type { SituationKey } from "@/types/apology";
import type { AmbientKind, ThemeId } from "@/types/theme";

/**
 * The visual vocabulary of the product, in one place.
 *
 * Three categories, deliberately kept apart:
 *
 * - **functional** — a control or a state. Must be recognisable in every theme,
 *   must never be decorative, and must carry an accessible name when it stands
 *   alone. Backed by Lucide icons.
 * - **character** — emotional storytelling. Backed by the sticker pack system,
 *   never by Unicode emoji.
 * - **decorative** — ambient art owned by a theme. May differ wildly between
 *   themes; carries no meaning and is always `aria-hidden`.
 *
 * Nothing in this file renders. It is the reference that tests and components
 * check against, so a stray symbol cannot appear without a documented meaning.
 */

export type SymbolKind = "functional" | "character" | "decorative";

export interface SymbolDefinition {
  id: string;
  kind: SymbolKind;
  /** One sentence: what this symbol communicates. */
  meaning: string;
  /** Screens or components allowed to use it. */
  contexts: string[];
  /** Required accessible name when the symbol appears without adjacent text. */
  ariaLabel?: string;
}

/* -------------------------------------------------------------------------- */
/* Functional icons                                                           */
/* -------------------------------------------------------------------------- */

export const FUNCTIONAL_SYMBOLS: SymbolDefinition[] = [
  {
    id: "play",
    kind: "functional",
    meaning: "Start playback of the letter's soundtrack.",
    contexts: ["presentation/audio-control"],
    ariaLabel: "Play music",
  },
  {
    id: "pause",
    kind: "functional",
    meaning: "Pause the soundtrack.",
    contexts: ["presentation/audio-control"],
    ariaLabel: "Pause music",
  },
  {
    id: "volume-on",
    kind: "functional",
    meaning: "Sound is audible; pressing mutes it.",
    contexts: ["presentation/audio-control"],
    ariaLabel: "Mute music",
  },
  {
    id: "volume-off",
    kind: "functional",
    meaning: "Sound is muted; pressing restores it.",
    contexts: ["presentation/audio-control"],
    ariaLabel: "Unmute music",
  },
  {
    id: "chevron-left",
    kind: "functional",
    meaning: "Go back one scene or one photo.",
    contexts: ["presentation/back", "presentation/memory-gallery"],
    ariaLabel: "Previous",
  },
  {
    id: "chevron-right",
    kind: "functional",
    meaning: "Advance one photo.",
    contexts: ["presentation/memory-gallery"],
    ariaLabel: "Next photo",
  },
  {
    id: "arrow-right",
    kind: "functional",
    meaning: "Choose this response and continue.",
    contexts: ["presentation/response-panel"],
  },
  {
    id: "heart",
    kind: "functional",
    meaning: "An affection or care action, never a control in itself.",
    contexts: ["manage/status"],
  },
  {
    id: "check",
    kind: "functional",
    meaning: "A confirmed selection.",
    contexts: ["creator/theme-card", "creator/pack-card", "creator/situations"],
  },
  {
    id: "trash",
    kind: "functional",
    meaning: "Permanently delete a letter and its files.",
    contexts: ["manage/actions"],
  },
  {
    id: "refresh",
    kind: "functional",
    meaning: "Renew an expired link for a fresh window.",
    contexts: ["manage/actions"],
  },
  {
    id: "external-link",
    kind: "functional",
    meaning: "Open the published letter in a new tab.",
    contexts: ["creator/publish"],
  },
  {
    id: "copy",
    kind: "functional",
    meaning: "Copy the private link to the clipboard.",
    contexts: ["creator/publish"],
  },
  {
    id: "lock",
    kind: "functional",
    meaning: "The link is private and requires the token.",
    contexts: ["creator/publish", "manage/hint"],
  },
  {
    id: "clock",
    kind: "functional",
    meaning: "A time limit, an expiry or a remaining window.",
    contexts: ["creator/publish", "manage/status", "creator/situations"],
  },
];

export const FUNCTIONAL_SYMBOL_IDS = FUNCTIONAL_SYMBOLS.map((symbol) => symbol.id);

export function getSymbol(id: string): SymbolDefinition | undefined {
  return FUNCTIONAL_SYMBOLS.find((symbol) => symbol.id === id);
}

/* -------------------------------------------------------------------------- */
/* Situations                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Each situation gets a symbol that describes *that* situation, not a generic
 * apology. This is the mapping the creator sees in step two.
 */
export const SITUATION_SYMBOLS: Record<
  SituationKey,
  { icon: string; meaning: string }
> = {
  "said-hurtful": { icon: "message-circle-off", meaning: "Words that landed badly" },
  fight: { icon: "heart-crack", meaning: "A rupture between two people" },
  "not-there": { icon: "clock", meaning: "A moment when presence was missing" },
  "broke-promise": { icon: "link-off", meaning: "A commitment that did not hold" },
  "forgot-special": { icon: "calendar-off", meaning: "A date that slipped" },
  other: { icon: "pen-line", meaning: "Something the sender will describe" },
};

/* -------------------------------------------------------------------------- */
/* Character states                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Character symbols are never icons and never emoji: they resolve to the active
 * sticker pack's artwork for that state.
 */
export const CHARACTER_SYMBOLS: SymbolDefinition[] = [
  ["idle", "Resting, neutral presence."],
  ["blink", "A small sign of life; used as an idle loop."],
  ["happy", "Relief or warmth."],
  ["sad", "Downcast; the sender's own regret."],
  ["crying", "Grief, used sparingly."],
  ["hugging", "Comfort offered or accepted."],
  ["apologizing", "The act of apologising itself."],
  ["flowers", "A peace offering."],
  ["heart", "Sincerity and affection."],
  ["hopeful", "Looking forward without assuming forgiveness."],
  ["celebrate", "Warmth after a forgiving answer. Never used before the recipient answers."],
].map(([state, meaning]) => ({
  id: `character:${state}`,
  kind: "character" as const,
  meaning,
  contexts: ["presentation/scenes"],
}));

/* -------------------------------------------------------------------------- */
/* Decorative motifs                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Ambient decoration is theme-owned. The same slot ("stars") means something
 * different in Midnight than in Minimal, which is why decoration is never
 * reused as a functional icon.
 */
export const DECORATIVE_SYMBOLS: Record<AmbientKind, string> = {
  hearts: "Floating hearts and ribbon (Romantic).",
  confetti: "Playful confetti and doodles (Friendship, Cute).",
  paper: "Paper edges, folds and ink (Heartfelt, Minimal).",
  stars: "Star field, moon and constellations (Midnight).",
  bubbles: "Soft blobs and bubbles (Cute).",
  petals: "Falling rose petals (Regret).",
  butterflies: "Butterflies over a meadow (Fresh Start).",
  sparkles: "Sparse light motes (Minimal on closing scenes).",
  none: "No ambient motion at all.",
};

export const DECORATIVE_BY_THEME: Record<ThemeId, AmbientKind> = {
  romantic: "hearts",
  friendship: "confetti",
  heartfelt: "paper",
  midnight: "stars",
  cute: "bubbles",
  regret: "petals",
  "fresh-start": "butterflies",
  minimal: "paper",
};

/* -------------------------------------------------------------------------- */
/* Guard                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Emoji detector used by the audit test. Matches pictographic ranges, variation
 * selectors, zero-width joiners and regional indicators.
 *
 * The product uses zero Unicode emoji: stories are told with the character
 * system, controls are Lucide icons, and decoration is theme art. This guard
 * exists so that stays true rather than by accident.
 */
const EMOJI_PATTERN =
  /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}\u{1F1E6}-\u{1F1FF}]/u;

export function findEmoji(text: string): string[] {
  const matches = text.match(new RegExp(EMOJI_PATTERN.source, "gu"));
  return matches ?? [];
}

/** Exported for the audit test, which scans source files rather than strings. */
export const EMOJI_PATTERN_SOURCE = EMOJI_PATTERN.source;
