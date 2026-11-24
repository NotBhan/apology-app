import type { z } from "zod";

/**
 * Experience module contract.
 *
 * A module owns its content schema, themes, scene vocabulary and presentation.
 * The platform owns identity, storage, publishing, expiry and deletion. Adding
 * an experience must not require editing the apology module or the shared
 * repository.
 */
export type ExperienceId = "apology" | "birthday";

export type ExperienceCategory =
  | "apology"
  | "celebration"
  | "love"
  | "proposal"
  | "appreciation";

export interface ExperienceReplyEmotion {
  readonly key: string;
  readonly label: string;
  readonly description?: string;
}

export interface ExperienceReplyConfig {
  /** Whether recipients can respond to this experience */
  readonly enabled: boolean;
  /** Modal title generator parameterized by sender name */
  readonly modalTitle: (senderName: string) => string;
  readonly modalSubtitle: string;
  /** Text area guidance */
  readonly messagePlaceholder: string;
  /** Emotional options tailored to the experience */
  readonly emotions: readonly ExperienceReplyEmotion[];
  /** Emotion badge label for display (e.g., "Feeling" vs "Vibe") */
  readonly emotionBadgePrefix: string;
  /** Quick reply presets for low-friction responses */
  readonly presets?: readonly string[];
  /** Accent color matching the experience's visual identity */
  readonly accent: string;
  /** Invitation CTA label generator. Optional; defaults to module or generic wording */
  readonly inviteLabel?: (senderName: string) => string;
  /** Invitation CTA label generator for creating an experience reply. Optional */
  readonly experienceInviteLabel?: (senderName: string) => string;
  /** Whether experience replies are allowed for this module. Defaults to true if enabled */
  readonly allowExperienceReply?: boolean;
}

export interface ExperienceModule {
  id: ExperienceId;
  /** Shown in discovery and the editor. */
  name: string;
  /** One line describing the intent, not the implementation. */
  tagline: string;
  category: ExperienceCategory;
  /** Discovery accent; categories must not look identical. */
  accent: string;
  /** Server-authoritative content validation for this experience. */
  draftSchema: z.ZodTypeAny;
  /** Theme identifiers this module understands. */
  themeIds: readonly string[];
  defaultThemeId: string;
  /** Scene vocabulary in presentation order. */
  sceneIds: readonly string[];
  /** Experience-specific response configuration. Optional; absent or enabled: false disables replies. */
  replyConfig?: ExperienceReplyConfig;
}
