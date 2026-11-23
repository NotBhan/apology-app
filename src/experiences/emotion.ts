import { getExperience } from "./registry";

export interface ResolvedEmotionBadge {
  label: string;
  prefix?: string;
}

/**
 * Resolves a stored emotion value to a user-facing label and category prefix.
 *
 * Required semantics:
 * - Missing or empty emotion: return null.
 * - Omitted experienceId (undefined): legacy Apology record; resolves via Apology config.
 * - Known experience: resolve configured emotion keys to configured labels, using that experience's prefix.
 * - Known experience with legacy emotion text: preserve the original text, using that experience's prefix.
 * - Unknown experience: preserve the stored emotion text without assigning an incorrect experience-specific prefix.
 */
export function resolveEmotionBadge(
  experienceId: string | undefined,
  storedEmotion: string | null | undefined,
): ResolvedEmotionBadge | null {
  if (!storedEmotion || !storedEmotion.trim()) {
    return null;
  }

  const trimmed = storedEmotion.trim();

  // If experienceId is omitted (undefined), caller is handling a legacy record that predates
  // experienceType tagging; preserve historical Apology fallback.
  // If an explicit experienceId is supplied, resolve that exact experience.
  const targetId = experienceId === undefined ? "apology" : experienceId;
  const experience = getExperience(targetId);

  if (!experience) {
    // Unknown experience: preserve stored emotion text without an experience-specific prefix.
    return {
      label: trimmed,
    };
  }

  const config = experience.replyConfig;
  const prefix = config?.emotionBadgePrefix;
  const matched = config?.emotions.find((e) => e.key === trimmed);

  return {
    label: matched ? matched.label : trimmed,
    ...(prefix ? { prefix } : {}),
  };
}
