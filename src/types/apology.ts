import type { ThemeId } from "./theme";
import type { StickerPackId } from "./sticker";
import type {
  ApologyContentCustomization,
  ApologyInteractionCustomization,
  VisualCustomization,
} from "./customization";

export type {
  ApologyContentCustomization,
  ApologyInteractionCustomization,
  DecorationDensity,
  EnvelopeStyle,
  FontPairing,
  MotionPreset,
  RevealStyle,
  TextAlignment,
  TextSize,
  TransitionStyle,
  VisualCustomization,
} from "./customization";

export type DraftStatus = "draft" | "published" | "revoked" | "deleted";

export type Language = "en" | "hinglish";

export const SITUATION_KEYS = [
  "said-hurtful",
  "fight",
  "not-there",
  "broke-promise",
  "forgot-special",
  "other",
] as const;
export type SituationKey = (typeof SITUATION_KEYS)[number];

export interface ApologyMessages {
  message1: string;
  message2: string;
  message3: string;
  personalNote: string;
}

export interface AudioChoice {
  source: "default" | "custom" | "none";
  trackId?: string;
  /** Storage asset id uploaded through /api/uploads. */
  assetId?: string;
  /** 0-1, defaults to 0.6 */
  volume: number;
}

export interface PhotoAsset {
  id: string;
  url: string;
  caption?: string;
  /** CSS object-position, e.g. `50% 35%` */
  focalPoint?: string;
  width?: number;
  height?: number;
}

export interface ApologyCustomization {
  colors?: {
    background?: string;
    primary?: string;
    secondary?: string;
    accent?: string;
    text?: string;
    surface?: string;
  };
  audio: AudioChoice;
  photos: PhotoAsset[];
  memoryStyle: "polaroid" | "scrapbook" | "slideshow";
  content?: ApologyContentCustomization;
  visual?: VisualCustomization;
  interaction?: ApologyInteractionCustomization;
}

export interface ApologyDraft {
  id: string;
  /** Experience module id. Defaults to 'apology' for rows written before the platform. */
  experienceType?: string;
  /** Module-owned content document; null means the legacy apology columns apply. */
  content?: unknown;
  recipientName: string;
  senderName: string;
  situation: SituationKey;
  situationCustom?: string;
  language: Language;
  messages: ApologyMessages;
  themeId: ThemeId;
  stickerPackId: StickerPackId;
  customization: ApologyCustomization;
  /** Legacy publish-window field (1–7). Never persisted on a published row. */
  linkDurationDays: number;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  /** Legacy only. Published links are permanent; this is ignored on read. */
  expiresAt?: string;
  status: DraftStatus;
}

/** Returned only to the owning creator (never to the recipient). */
export interface ApologyRecord extends ApologyDraft {
  accessToken: string;
  /** Hash of the creator's manage key; the raw key lives in an http-only cookie. */
  ownerKeyHash: string;
}

/** Everything a recipient is allowed to see. */
export interface PublishedApology {
  id: string;
  /** Experience module id; 'apology' for records written before the platform. */
  experienceType?: string;
  /** Module-owned content document for non-apology experiences. */
  content?: unknown;
  recipientName: string;
  senderName: string;
  situation: SituationKey;
  situationCustom?: string;
  messages: ApologyMessages;
  themeId: ThemeId;
  stickerPackId: StickerPackId;
  customization: ApologyCustomization;
  publishedAt: string;
}

export interface CreateDraftInput {
  recipientName: string;
  senderName: string;
}
