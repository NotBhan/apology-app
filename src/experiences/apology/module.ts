import { draftPayloadSchema } from "@/lib/validation/apology";
import { THEME_IDS } from "@/types/theme";
import type { ExperienceModule } from "../types";

/**
 * The apology experience.
 *
 * This is a thin description of what already exists: the schema, themes and
 * scene vocabulary are unchanged, so adding the registry cannot alter
 * behaviour. `build-scenes.ts` and the theme registry stay where they are; the
 * module points at them rather than duplicating them.
 */
export const apologyExperience: ExperienceModule = {
  id: "apology",
  name: "I'm Sorry",
  tagline: "Say it properly, without the pressure of a reply.",
  category: "apology",
  accent: "#6d3fa8",
  draftSchema: draftPayloadSchema,
  themeIds: THEME_IDS,
  defaultThemeId: "romantic",
  sceneIds: [
    "opening",
    "hurt",
    "meaning",
    "sorry",
    "letter",
    "envelope",
    "memory",
    "closing",
    "response",
  ],
};
