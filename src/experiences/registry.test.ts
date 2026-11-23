import { describe, expect, it } from "vitest";
import { getExperience, listExperiences, requireExperience } from "./registry";
import type { ExperienceModule } from "./types";

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

  describe("experience reply configuration (Phase 3.1 & 3.2)", () => {
    it("configures apology reply behavior with empathy and space", () => {
      const apology = requireExperience("apology");
      expect(apology.replyConfig).toBeDefined();
      const config = apology.replyConfig!;
      expect(config.enabled).toBe(true);
      expect(config.modalTitle("Sam")).toBe("Reply to Sam");
      expect(config.modalSubtitle).toBe("Leave an intimate, heartfelt note");
      expect(config.messagePlaceholder).toBe("Write your reply...");
      expect(config.emotionBadgePrefix).toBe("Feeling");
      expect(config.accent).toBe(apology.accent);

      const emotionKeys = config.emotions.map((e) => e.key);
      expect(emotionKeys).toEqual(["forgive", "time", "talk", "appreciate"]);
      for (const emotion of config.emotions) {
        expect(emotion.key.length).toBeGreaterThan(0);
        expect(emotion.label.length).toBeGreaterThan(0);
        expect(emotion.description?.length).toBeGreaterThan(0);
      }

      expect(config.presets).toBeDefined();
      expect(config.presets!.length).toBeGreaterThanOrEqual(3);
    });

    it("configures birthday reply behavior with celebration and gratitude", () => {
      const birthday = requireExperience("birthday");
      expect(birthday.replyConfig).toBeDefined();
      const config = birthday.replyConfig!;
      expect(config.enabled).toBe(true);
      expect(config.modalTitle("Anya")).toBe("Thank Anya");
      expect(config.modalSubtitle).toBe("Send a thank-you note, joyous wish, or celebration photos");
      expect(config.messagePlaceholder).toBe("Write a thank-you note, share a birthday wish, or describe your day...");
      expect(config.emotionBadgePrefix).toBe("Vibe");
      expect(config.accent).toBe(birthday.accent);

      const emotionKeys = config.emotions.map((e) => e.key);
      expect(emotionKeys).toEqual(["grateful", "touched", "joyful", "celebrating"]);
      for (const emotion of config.emotions) {
        expect(emotion.key.length).toBeGreaterThan(0);
        expect(emotion.label.length).toBeGreaterThan(0);
        expect(emotion.description?.length).toBeGreaterThan(0);
      }

      expect(config.presets).toBeDefined();
      expect(config.presets!.length).toBeGreaterThanOrEqual(3);
    });

    it("enforces emotion key uniqueness within each experience configuration", () => {
      for (const experience of listExperiences()) {
        if (!experience.replyConfig) continue;
        const keys = experience.replyConfig.emotions.map((e) => e.key);
        expect(new Set(keys).size).toBe(keys.length);
      }
    });

    it("verifies emotion keys conform to backend validation ceiling (<= 50 chars)", () => {
      for (const experience of listExperiences()) {
        if (!experience.replyConfig) continue;
        for (const emotion of experience.replyConfig.emotions) {
          expect(emotion.key.length).toBeLessThanOrEqual(50);
          expect(emotion.key.trim()).toBe(emotion.key);
          expect(emotion.key.length).toBeGreaterThan(0);
        }
      }
    });

    it("handles experience modules without replyConfig safely", () => {
      // Future experiences or modules without reply configuration must remain valid
      const dummyExperience: ExperienceModule = {
        id: "apology" as const,
        name: "Test Module",
        tagline: "Test",
        category: "apology" as const,
        accent: "#123456",
        draftSchema: requireExperience("apology").draftSchema,
        themeIds: ["romantic"],
        defaultThemeId: "romantic",
        sceneIds: ["opening"],
      };

      expect(dummyExperience.replyConfig).toBeUndefined();
      const isReplyEnabled = Boolean(dummyExperience.replyConfig?.enabled);
      expect(isReplyEnabled).toBe(false);
    });
  });
});
