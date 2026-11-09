import type { CharacterState, StickerPlacement } from "./sticker";

export const SCENE_TYPES = [
  "opening",
  "message",
  "emotion-selector",
  "letter",
  "envelope",
  "memory",
  "gift",
  "closing",
  "response",
] as const;

export type SceneType = (typeof SCENE_TYPES)[number];

/** Which recipient answer was chosen. Never inferred, never auto-recorded. */
export const RESPONSE_OPTIONS = [
  "forgive",
  "time",
  "talk",
  "appreciate",
] as const;
export type ResponseOption = (typeof RESPONSE_OPTIONS)[number];

export const EMOTION_OPTIONS = ["upset", "getting-there", "okay"] as const;
export type EmotionOption = (typeof EMOTION_OPTIONS)[number];

/** Typed per-scene payloads. Kept small so persisted data never smuggles logic. */
export interface SceneContent {
  /** Index into the draft messages (1-3) for `message` scenes. */
  messageKey?: "message1" | "message2" | "message3";
  personalNote?: boolean;
  signature?: boolean;
  memoryStyle?: "polaroid" | "scrapbook" | "slideshow";
  allowEmotionSelector?: boolean;
}

export interface PresentationScene {
  id: string;
  type: SceneType;
  eyebrow?: string;
  title?: string;
  body?: string;
  content?: SceneContent;
  characterState?: CharacterState;
  stickers?: StickerPlacement[];
  animationPreset?: string;
  transitionPreset?: string;
  ctaLabel?: string;
  /** Optional scenes are dropped when their data is missing. */
  optional?: boolean;
}
