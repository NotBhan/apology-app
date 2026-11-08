/**
 * Character sticker contract.
 *
 * Format support is intentionally wider than the original brief: original
 * vector characters ship as animated `svg` React components (real, authored
 * motion - not static art reused). `lottie`, `rive`, `webp` and `apng`
 * remain first-class so licensed packs can drop in without engine changes.
 */
export const STICKER_PACK_IDS = [
  "cats",
  "bubu-dudu",
  "teddy-bears",
  "bunnies",
  "capybaras",
  "puppies",
] as const;

export type StickerPackId = (typeof STICKER_PACK_IDS)[number];

export const CHARACTER_STATES = [
  "idle",
  "blink",
  "happy",
  "sad",
  "crying",
  "hugging",
  "apologizing",
  "flowers",
  "heart",
  "hopeful",
  "celebrate",
] as const;

export type CharacterState = (typeof CHARACTER_STATES)[number];

export const STICKER_FORMATS = ["rive", "lottie", "webp", "apng", "svg"] as const;
export type StickerFormat = (typeof STICKER_FORMATS)[number];

export const STICKER_CATEGORIES = [
  "character",
  "decorative",
  "emotional",
  "interactive",
  "celebration",
] as const;
export type StickerCategory = (typeof STICKER_CATEGORIES)[number];

export interface StickerDefinition {
  id: string;
  packId: StickerPackId;
  /** Human label, used in pickers and alt text. */
  label: string;
  category: StickerCategory;
  format: StickerFormat;
  /**
   * Resolvable asset reference. For `svg` packs this is the registry key
   * `<packId>:<state>`; for file-backed formats it is a public path.
   */
  source: string;
  availableStates?: readonly CharacterState[];
  defaultState?: CharacterState;
  loop: boolean;
  /** width / height, used to reserve layout space and avoid CLS */
  aspect: number;
}

/** Scene placement of a sticker, resolved at render time. */
export interface StickerPlacement {
  stickerId: string;
  state?: CharacterState;
  /** Percentages of the scene box. */
  x: number;
  y: number;
  width: number;
  rotate?: number;
  layer?: number;
  /** Entrance animation key, e.g. `pop`, `drift-in`, `float-up`. */
  enter?: string;
  /** Whether the idle loop keeps running. */
  loop?: boolean;
  mobile?: {
    x?: number;
    y?: number;
    width?: number;
    scale?: number;
  };
}
