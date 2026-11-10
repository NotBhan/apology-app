import type { ExperienceModule } from "../types";
import { birthdayContentSchema } from "./schema";
import { BIRTHDAY_THEMES } from "./themes";

/**
 * The birthday experience.
 *
 * Shares the platform (auth, storage, publishing, expiry, deletion) but owns
 * its content schema, themes and scene vocabulary. It has no `hurt` or `sorry`
 * scene — that is the point of a module rather than a template switch.
 */
export const birthdayExperience: ExperienceModule = {
  id: "birthday",
  name: "Happy Birthday",
  tagline: "A celebration they can open, not just read.",
  category: "celebration",
  accent: "#e8590c",
  draftSchema: birthdayContentSchema,
  themeIds: BIRTHDAY_THEMES.map((theme) => theme.id),
  defaultThemeId: "confetti",
  sceneIds: ["opening", "wish", "message", "gallery", "finale"],
};
