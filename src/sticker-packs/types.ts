import type { ComponentType, ReactElement } from "react";
import type { CharacterState, StickerPackId } from "@/types/sticker";

export interface StickerArtProps {
  className?: string;
  /** When false the art renders static (reduced motion / inactive scene). */
  animate?: boolean;
  /** Overrides the pack's default expression. */
  state?: CharacterState;
}

/**
 * A pure render function rather than a component type: packs are selected at
 * runtime, so resolving one must not mint a new component identity each render.
 */
export type StickerRenderFn = (props: StickerArtProps) => ReactElement | null;

/** Serializable pack metadata — safe to import on the server and in pickers. */
export interface StickerPack {
  id: StickerPackId;
  name: string;
  tagline: string;
  /** Pack accent used by the picker and small UI touches. */
  accent: string;
  /** Character name shown in alt text, e.g. "Mochi the cat". */
  characterName: string;
  /** States this pack can render. Engine falls back to `idle`. */
  states: readonly CharacterState[];
  source: "original" | "licensed";
  licence?: string;
}

/** Lazy art module — only loaded when a scene actually displays the pack. */
export interface StickerPackArt {
  render(state: CharacterState): StickerRenderFn;
  Decorative: ComponentType<{ className?: string; animate?: boolean }>;
}
