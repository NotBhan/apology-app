import { describe, expect, it } from "vitest";
import { getExperience, listExperiences, requireExperience } from "./registry";

describe("experience registry", () => {
  it("exposes the apology module as the default experience", () => {
    const apology = getExperience("apology");
    expect(apology?.name).toBe("I'm Sorry");
    expect(apology?.themeIds.length).toBeGreaterThan(0);
    expect(apology?.sceneIds).toContain("opening");
    expect(listExperiences()).toHaveLength(1);
  });

  it("returns undefined for an unknown module", () => {
    expect(getExperience("birthday")).toBeUndefined();
    expect(getExperience("")).toBeUndefined();
  });

  it("fails loudly when a module is required but missing", () => {
    expect(() => requireExperience("nope")).toThrow(/UNKNOWN_EXPERIENCE/);
  });

  it("rejects empty content against the module's own schema", () => {
    const apology = requireExperience("apology");
    expect(apology.draftSchema.safeParse({}).success).toBe(false);
  });
});
