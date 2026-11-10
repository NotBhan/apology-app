import type { ExperienceId } from "./types";

/**
 * Experience categories.
 *
 * Authoritative source for what the homepage and the selection flow show. The
 * discriminated union makes a broken link impossible to express: an `upcoming`
 * entry has no `href` field at all, so no component can render one by mistake.
 */
export type ExperienceCategory =
  | {
      id: string;
      label: string;
      description: string;
      status: "implemented";
      experienceId: ExperienceId;
      href: string;
      accent: string;
    }
  | {
      id: string;
      label: string;
      description: string;
      status: "upcoming";
      accent: string;
    };

export const EXPERIENCE_CATEGORIES: readonly ExperienceCategory[] = [
  {
    id: "apology",
    label: "I'm Sorry",
    description:
      "Say what words alone sometimes struggle to express. Create a thoughtful apology with a personal touch.",
    status: "implemented",
    experienceId: "apology",
    href: "/create",
    accent: "#6d3fa8",
  },
  {
    id: "celebration",
    label: "Let's Celebrate",
    description:
      "Make someone's special day feel even more personal with an experience made just for them.",
    status: "implemented",
    experienceId: "birthday",
    href: "/create/birthday",
    accent: "#e8590c",
  },
  {
    id: "affection",
    label: "Just Because",
    description:
      "Tell someone what they mean to you, whether it's a declaration of love or a little reminder that they're missed.",
    status: "upcoming",
    accent: "#c2185b",
  },
  {
    id: "proposal",
    label: "The Big Question",
    description: "Some questions deserve a moment of their own. Create a reveal they won't forget.",
    status: "upcoming",
    accent: "#b07d18",
  },
  {
    id: "appreciation",
    label: "You're Special",
    description: "Celebrate the people who make life a little better.",
    status: "upcoming",
    accent: "#2f7d52",
  },
];

export type ImplementedCategory = Extract<ExperienceCategory, { status: "implemented" }>;

export function listCategories(): readonly ExperienceCategory[] {
  return EXPERIENCE_CATEGORIES;
}

export function implementedCategories(): readonly ImplementedCategory[] {
  return EXPERIENCE_CATEGORIES.filter(
    (category): category is ImplementedCategory => category.status === "implemented",
  );
}
