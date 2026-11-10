import { describe, expect, it } from "vitest";
import { BIRTHDAY_THEME_IDS, birthdayContentSchema } from "./schema";
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
      expect(parsed.data.audio).toBe("none");
    }
  });

  it("accepts an age and a wish", () => {
    expect(
      birthdayContentSchema.safeParse({ ...valid, age: 30, wish: "More sleep." }).success,
    ).toBe(true);
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
