import { describe, expect, it } from "vitest";
import { contrastRatio } from "@/lib/theme-vars";
import {
  MISS_YOU_PHOTO_LAYOUTS,
  MISS_YOU_THEME_IDS,
  missYouContentSchema,
  normalizeMissYouPhotos,
} from "./schema";
import { MISS_YOU_THEMES, resolveMissYouTheme } from "./themes";

const validPayload = {
  recipientName: "Ananya",
  senderName: "Rohan",
  headline: "Thinking of you tonight",
  distanceNote: "2,100 km apart",
  letter: "Every rainstorm sounds a little quieter without you laughing across the table.",
  reminders: ["The tea stall on the corner", "That playlist from November"],
  reunionWish: "First thing when you land: slow walk by the lake.",
  themeId: "dusk-postage" as const,
};

describe("miss-you schema & themes", () => {
  it("parses valid minimal payload with sensible defaults", () => {
    const parsed = missYouContentSchema.safeParse({
      recipientName: "Ananya",
      senderName: "Rohan",
      headline: "Across the miles",
      letter: "Wish you were here.",
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.themeId).toBe("dusk-postage");
      expect(parsed.data.photoLayout).toBe("postcards");
      expect(parsed.data.photos).toEqual([]);
      expect(parsed.data.reminders).toEqual([]);
      expect(parsed.data.audio).toBe("none");
    }
  });

  it("supports all five themes and four photo layouts", () => {
    for (const themeId of MISS_YOU_THEME_IDS) {
      for (const photoLayout of MISS_YOU_PHOTO_LAYOUTS) {
        const parsed = missYouContentSchema.safeParse({
          ...validPayload,
          themeId,
          photoLayout,
        });
        expect(parsed.success).toBe(true);
      }
    }
  });

  it("normalizes both legacy string URLs and structured photo objects", () => {
    const normalized = normalizeMissYouPhotos([
      "https://example.com/1.webp",
      { url: "https://example.com/2.webp", caption: "Rainy pier", width: 1200, height: 1600 },
      { url: "   " },
    ]);

    expect(normalized).toHaveLength(2);
    expect(normalized[0]?.url).toBe("https://example.com/1.webp");
    expect(normalized[0]?.caption).toBeUndefined();
    expect(normalized[1]?.caption).toBe("Rainy pier");
    expect(normalized[1]?.width).toBe(1200);
    expect(normalized[1]?.height).toBe(1600);
  });

  it("enforces limits on photos, reminders, and required fields", () => {
    expect(missYouContentSchema.safeParse({ ...validPayload, headline: "" }).success).toBe(false);
    expect(missYouContentSchema.safeParse({ ...validPayload, letter: "" }).success).toBe(false);
    expect(
      missYouContentSchema.safeParse({
        ...validPayload,
        reminders: ["a", "b", "c", "d"],
      }).success,
    ).toBe(false);
    expect(
      missYouContentSchema.safeParse({
        ...validPayload,
        photos: ["1", "2", "3", "4", "5", "6"],
      }).success,
    ).toBe(false);
  });

  it.each(MISS_YOU_THEMES.map((theme) => [theme.id, theme] as const))(
    "theme %s meets >= 4.5:1 text contrast on background and surface",
    (_id, theme) => {
      const bgContrast = contrastRatio(theme.palette.text, theme.palette.background);
      const surfaceContrast = contrastRatio(theme.palette.text, theme.palette.surface);
      expect(bgContrast, `${theme.id} bg contrast`).toBeGreaterThanOrEqual(4.5);
      expect(surfaceContrast, `${theme.id} surface contrast`).toBeGreaterThanOrEqual(4.5);
    },
  );

  it("falls back safely when resolving unknown theme IDs", () => {
    expect(resolveMissYouTheme("unknown-theme").id).toBe("dusk-postage");
  });
});
