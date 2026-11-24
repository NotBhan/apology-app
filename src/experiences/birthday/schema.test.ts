import { describe, expect, it } from "vitest";
import {
  BIRTHDAY_PHOTO_LAYOUTS,
  BIRTHDAY_THEME_IDS,
  birthdayContentSchema,
  normalizeBirthdayPhotos,
} from "./schema";
import { BIRTHDAY_THEMES, getBirthdayTheme } from "./themes";

const valid = {
  recipientName: "Riya",
  senderName: "Arjun",
  headline: "Happy birthday",
  message: "Hope this year is kinder to you than the last one.",
  themeId: "confetti" as const,
};

describe("birthday content", () => {
  it("accepts a minimal birthday", () => {
    const parsed = birthdayContentSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.photos).toEqual([]);
      expect(parsed.data.photoLayout).toBe("theme-adaptive");
      expect(parsed.data.audio).toBe("none");
    }
  });

  it("accepts an age and a wish", () => {
    expect(
      birthdayContentSchema.safeParse({ ...valid, age: 30, wish: "More sleep." }).success,
    ).toBe(true);
  });

  it("accepts string array photos for backward compatibility", () => {
    const parsed = birthdayContentSchema.safeParse({
      ...valid,
      photos: ["https://example.com/p1.jpg", "https://example.com/p2.jpg"],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.photos).toHaveLength(2);
      const normalized = normalizeBirthdayPhotos(parsed.data.photos);
      expect(normalized).toHaveLength(2);
      expect(normalized[0].url).toBe("https://example.com/p1.jpg");
      expect(normalized[0].caption).toBeUndefined();
    }
  });

  it("accepts photo objects with captions and custom photo layout", () => {
    const parsed = birthdayContentSchema.safeParse({
      ...valid,
      photoLayout: "polaroid",
      photos: [
        { url: "https://example.com/p1.jpg", caption: "Sweet memories in Tokyo" },
        { url: "https://example.com/p2.jpg" },
      ],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.photoLayout).toBe("polaroid");
      expect(parsed.data.photos).toHaveLength(2);
      const normalized = normalizeBirthdayPhotos(parsed.data.photos);
      expect(normalized[0].caption).toBe("Sweet memories in Tokyo");
      expect(normalized[1].caption).toBeUndefined();
    }
  });

  it("supports all birthday photo layout variants", () => {
    for (const layout of BIRTHDAY_PHOTO_LAYOUTS) {
      const parsed = birthdayContentSchema.safeParse({
        ...valid,
        photoLayout: layout,
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.photoLayout).toBe(layout);
      }
    }
  });

  it("rejects invalid photo layout or too many photos", () => {
    expect(
      birthdayContentSchema.safeParse({ ...valid, photoLayout: "non-existent" }).success,
    ).toBe(false);
    expect(
      birthdayContentSchema.safeParse({
        ...valid,
        photos: [
          "https://example.com/1.jpg",
          "https://example.com/2.jpg",
          "https://example.com/3.jpg",
          "https://example.com/4.jpg",
          "https://example.com/5.jpg",
          "https://example.com/6.jpg",
        ],
      }).success,
    ).toBe(false);
  });

  it("rejects a missing headline or message", () => {
    expect(birthdayContentSchema.safeParse({ ...valid, headline: "" }).success).toBe(false);
    expect(birthdayContentSchema.safeParse({ ...valid, message: "" }).success).toBe(false);
  });

  it("rejects an unknown theme and an implausible age", () => {
    expect(birthdayContentSchema.safeParse({ ...valid, themeId: "romantic" }).success).toBe(false);
    expect(birthdayContentSchema.safeParse({ ...valid, age: 500 }).success).toBe(false);
  });
});

describe("birthday themes", () => {
  it("declares every advertised theme", () => {
    expect(BIRTHDAY_THEMES.map((theme) => theme.id).sort()).toEqual(
      [...BIRTHDAY_THEME_IDS].sort(),
    );
  });

  it("has visually distinct palettes", () => {
    const backgrounds = BIRTHDAY_THEMES.map((theme) => theme.palette.background);
    expect(new Set(backgrounds).size).toBe(BIRTHDAY_THEMES.length);
  });

  it("returns undefined for an unknown theme", () => {
    expect(getBirthdayTheme("nope")).toBeUndefined();
  });
});
