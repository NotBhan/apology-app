import { apologyExperience } from "./apology/module";
import { birthdayExperience } from "./birthday/module";
import type { ExperienceId, ExperienceModule } from "./types";

/**
 * Experience registry.
 *
 * Order is presentation order on the homepage. Adding a module means adding one
 * import and one entry; no shared code changes.
 */
export const EXPERIENCES: readonly ExperienceModule[] = [
  apologyExperience,
  birthdayExperience,
];

export function listExperiences(): readonly ExperienceModule[] {
  return EXPERIENCES;
}

export function getExperience(id: string): ExperienceModule | undefined {
  return EXPERIENCES.find((experience) => experience.id === id);
}

export function requireExperience(id: string): ExperienceModule {
  const experience = getExperience(id);
  if (!experience) throw new Error(`UNKNOWN_EXPERIENCE:${id}`);
  return experience;
}

/** Default used when a record predates `experience_type`. */
export const DEFAULT_EXPERIENCE_ID: ExperienceId = "apology";
