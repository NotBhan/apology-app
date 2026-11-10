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

export interface ExperienceModule {
  id: ExperienceId;
  /** Shown in discovery and the editor. */
  name: string;
  /** One line describing the intent, not the implementation. */
  tagline: string;
  category: ExperienceCategory;
  /** Server-authoritative content validation for this experience. */
  draftSchema: z.ZodTypeAny;
  /** Theme identifiers this module understands. */
  themeIds: readonly string[];
  defaultThemeId: string;
  /** Scene vocabulary in presentation order. */
  sceneIds: readonly string[];
}
