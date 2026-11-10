import { describe, expect, it } from "vitest";
import { getExperience, listExperiences, requireExperience } from "./registry";

describe("experience registry", () => {
  it("exposes apology and birthday as distinct modules", () => {
    const ids = listExperiences().map((experience) => experience.id);
    expect(ids).toEqual(["apology", "birthday"]);

    const birthday = getExperience("birthday");
    expect(birthday?.category).toBe("celebration");
    expect(birthday?.name).toBe("Happy Birthday");
    // Birthday must not inherit the apology scene vocabulary.
    expect(birthday?.sceneIds).not.toContain("sorry");
    expect(birthday?.sceneIds).toContain("wish");
  });

  it("gives every module a coherent theme set", () => {
    for (const experience of listExperiences()) {
      expect(experience.themeIds.length).toBeGreaterThan(0);
      expect(new Set(experience.themeIds).size).toBe(experience.themeIds.length);
      expect(experience.themeIds).toContain(experience.defaultThemeId);
      expect(experience.sceneIds.length).toBeGreaterThan(0);
      expect(experience.accent).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("gives each experience a distinct discovery accent", () => {
    const accents = listExperiences().map((experience) => experience.accent);
    expect(new Set(accents).size).toBe(accents.length);
  });

  it("returns undefined for an unknown module", () => {
    expect(getExperience("love")).toBeUndefined();
    expect(getExperience("")).toBeUndefined();
  });

  it("fails loudly when a module is required but missing", () => {
    expect(() => requireExperience("nope")).toThrow(/UNKNOWN_EXPERIENCE/);
  });

  it("rejects empty content against each module's own schema", () => {
    for (const experience of listExperiences()) {
      expect(experience.draftSchema.safeParse({}).success).toBe(false);
    }
  });
});
