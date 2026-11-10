import { describe, expect, it } from "vitest";
import { PLATFORM_COPY } from "./content";

/**
 * Platform copy must not re-centre the product on one experience.
 *
 * The check is deliberately scoped to fields that describe the *platform*, and
 * it carries a documented allowlist: two fields name apologies as one category
 * among several, which is correct and must not fail.
 */
const APOLOGY_SPECIFIC = /\b(apolog\w*|forgive\w*|letter|letters)\b/i;

const PLATFORM_NEUTRAL_FIELDS = {
  "hero.eyebrow": PLATFORM_COPY.hero.eyebrow,
  "hero.headline": PLATFORM_COPY.hero.headline,
  "hero.supporting": PLATFORM_COPY.hero.supporting,
  "hero.reassurance": PLATFORM_COPY.hero.reassurance,
  "experiences.eyebrow": PLATFORM_COPY.experiences.eyebrow,
  "experiences.heading": PLATFORM_COPY.experiences.heading,
  "worlds.heading": PLATFORM_COPY.worlds.heading,
  "howItWorks.heading": PLATFORM_COPY.howItWorks.heading,
  "recipient.heading": PLATFORM_COPY.recipient.heading,
  "personalisation.heading": PLATFORM_COPY.personalisation.heading,
  "personalisation.description": PLATFORM_COPY.personalisation.description,
  "closing.heading": PLATFORM_COPY.closing.heading,
  "closing.supporting": PLATFORM_COPY.closing.supporting,
  "footer.description": PLATFORM_COPY.footer.description,
  "dashboard.title": PLATFORM_COPY.dashboard.title,
  "dashboard.description": PLATFORM_COPY.dashboard.description,
  "dashboard.emptyBody": PLATFORM_COPY.dashboard.emptyBody,
  "auth.signInBody": PLATFORM_COPY.auth.signInBody,
  "auth.signUpBody": PLATFORM_COPY.auth.signUpBody,
  "notFound.title": PLATFORM_COPY.notFound.title,
  "explore.title": PLATFORM_COPY.explore.title,
} as const;

/** Fields where naming apologies as *a category* is intended. */
const DOCUMENTED_EXCEPTIONS = ["experiences.supporting", "recipient.description"] as const;

describe("platform copy", () => {
  it("does not describe the platform as an apology or letter product", () => {
    for (const [field, value] of Object.entries(PLATFORM_NEUTRAL_FIELDS)) {
      expect(APOLOGY_SPECIFIC.test(value), `${field} → "${value}"`).toBe(false);
    }
  });

  it("keeps the documented exceptions narrow and specific", () => {
    // These mention apologies as one category among many; they must not become
    // the whole sentence, and must not mention letters at all.
    for (const field of DOCUMENTED_EXCEPTIONS) {
      const value =
        field === "experiences.supporting"
          ? PLATFORM_COPY.experiences.supporting
          : PLATFORM_COPY.recipient.description;
      expect(/\bletters?\b/i.test(value), `${field} mentions a letter`).toBe(false);
      expect(APOLOGY_SPECIFIC.test(value), `${field} mentions apologies`).toBe(true);
    }
  });

  it("uses 'experience' for the creator collection", () => {
    expect(PLATFORM_COPY.nav.collection).toBe("My Experiences");
    expect(PLATFORM_COPY.dashboard.title).toBe("My Experiences");
    expect(PLATFORM_COPY.dashboard.emptyCta).toMatch(/experience/i);
  });

  it("makes generic creation CTAs neutral", () => {
    expect(PLATFORM_COPY.hero.primaryCta).toBe("Create something");
    expect(PLATFORM_COPY.closing.cta).toBe("Create something");
  });

  it("does not promise forgiveness or pressure-free framing only an apology could offer", () => {
    const all = Object.values(PLATFORM_COPY.recipient.points).join(" ");
    expect(all.toLowerCase()).not.toContain("forgive");
  });
});
