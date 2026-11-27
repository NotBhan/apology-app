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

  it("accepts and preserves Stage 4 customization across all domains", () => {
    const parsed = birthdayContentSchema.parse({
      ...valid,
      audio: "celebration",
      photos: [{ url: "https://example.com/p.jpg", caption: "Cake", focalPoint: "50% 25%" }],
      customization: {
        colors: {
          background: "#17141b",
          surface: "#221d28",
          primary: "#ebb968",
          text: "#f7f0e6",
        },
        content: {
          openingEyebrow: "special birthday edition",
          openingCta: "Unwrap now",
          letterHeading: "For Maya",
          letterSignOff: "Always celebrating you,",
          showCakeScene: true,
          showGalleryScene: false,
        },
        visual: {
          fontPairing: "editorial",
          textSize: "expressive",
          alignment: "left",
          decorationsEnabled: false,
          decorationDensity: "minimal",
          cake: { tiers: 3, flavor: "chocolate", topping: "cherries" },
        },
        interaction: {
          envelopeStyle: "open-letter",
          transitionStyle: "paper",
          motionPreset: "gentle",
          giftReveal: "direct",
          candleMode: "single-wish",
          celebrationIntensity: "grand",
        },
      },
    });

    expect(parsed.audio).toBe("celebration");
    expect(parsed.customization?.visual?.cake?.flavor).toBe("chocolate");
    expect(parsed.customization?.interaction?.envelopeStyle).toBe("open-letter");
  });

  it("rejects invalid colors or unsupported customization values", () => {
    expect(
      birthdayContentSchema.safeParse({
        ...valid,
        customization: { colors: { background: "not-hex" } },
      }).success,
    ).toBe(false);

    expect(
      birthdayContentSchema.safeParse({
        ...valid,
        customization: { visual: { cake: { tiers: 5 } } },
      }).success,
    ).toBe(false);
  });

  it("resolves defaults safely for legacy content and applies overrides cleanly", async () => {
    const { resolveBirthdayConfig } = await import("./resolve");
    const legacy = resolveBirthdayConfig(birthdayContentSchema.parse(valid));
    expect(legacy.scenes).toEqual(["opening", "wish", "message", "gallery", "finale"]);
    expect(legacy.interaction.envelopeStyle).toBe("wax-seal");
    expect(legacy.interaction.candleMode).toBe("tap-relight");
    expect(legacy.audioTrack).toBeUndefined();

    const customized = resolveBirthdayConfig(
      birthdayContentSchema.parse({
        ...valid,
        audio: "soft",
        customization: {
          content: {
            showCakeScene: false,
            showGalleryScene: false,
            finaleHeading: "Cheers to you",
          },
          visual: {
            cake: { tiers: 3, flavor: "strawberry", topping: "stars" },
            decorationsEnabled: false,
          },
        },
      }),
    );

    expect(customized.scenes).toEqual(["opening", "message", "finale"]);
    expect(customized.cake.tiers).toBe(3);
    expect(customized.cake.topping).toBe("stars");
    expect(customized.decorations.enabled).toBe(false);
    expect(customized.content.finaleHeading).toBe("Cheers to you");
    expect(customized.audioTrack?.src).toBe("/audio/soft-lavender.mp3");
  });

  it("maps every selectable Birthday audio track to a real /public/audio asset and fails safely on none/invalid IDs", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const { BIRTHDAY_THEME_IDS } = await import("./schema");
    const { resolveBirthdayAudioTrack } = await import("./resolve");

    for (const themeId of BIRTHDAY_THEME_IDS) {
      expect(resolveBirthdayAudioTrack("none", themeId)).toBeUndefined();
      expect(resolveBirthdayAudioTrack(undefined, themeId)).toBeUndefined();
      expect(resolveBirthdayAudioTrack("invalid-legacy-id", themeId)).toBeUndefined();

      for (const option of ["celebration", "soft"] as const) {
        const track = resolveBirthdayAudioTrack(option, themeId);
        expect(track).toBeDefined();
        expect(track!.src.startsWith("/audio/")).toBe(true);
        const diskPath = path.join(process.cwd(), "public", track!.src);
        expect(fs.existsSync(diskPath), `${diskPath} missing on disk`).toBe(true);
      }
    }
  });
});
