import { describe, expect, it } from "vitest";
import { EXPERIENCE_CATEGORIES, implementedCategories, listCategories } from "./categories";
import { getExperience } from "./registry";

describe("experience categories", () => {
  it("exposes five categories with unique ids and labels", () => {
    const categories = listCategories();
    expect(categories).toHaveLength(5);
    expect(new Set(categories.map((c) => c.id)).size).toBe(5);
    expect(new Set(categories.map((c) => c.label)).size).toBe(5);
  });

  it("marks exactly the two implemented experiences as available", () => {
    const implemented = implementedCategories();
    expect(implemented.map((c) => c.experienceId).sort()).toEqual(["apology", "birthday"]);
  });

  it("points every implemented category at a registered experience and an internal route", () => {
    for (const category of implementedCategories()) {
      expect(getExperience(category.experienceId)).toBeDefined();
      expect(category.href.startsWith("/")).toBe(true);
    }
  });

  it("cannot produce a creation link for an upcoming category", () => {
    for (const category of EXPERIENCE_CATEGORIES) {
      if (category.status === "upcoming") {
        // The discriminated union omits `href` entirely for upcoming entries.
        expect("href" in category).toBe(false);
        expect("experienceId" in category).toBe(false);
      }
    }
  });

  it("gives every category a hex accent", () => {
    for (const category of listCategories()) {
      expect(category.accent).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});
