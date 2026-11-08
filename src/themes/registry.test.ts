import { describe, expect, it } from "vitest";
import { THEME_LIST, getTheme } from "./registry";
import { STICKER_PACK_LIST, getStickerPack } from "@/sticker-packs/registry";
import { THEME_IDS } from "@/types/theme";
import { STICKER_PACK_IDS, CHARACTER_STATES } from "@/types/sticker";
import { contrastRatio } from "@/lib/theme-vars";

const REQUIRED_SCENES = ["opening", "response"];

describe("theme registry", () => {
  it("exposes exactly the eight declared themes", () => {
    expect(THEME_LIST).toHaveLength(THEME_IDS.length);
    expect(new Set(THEME_LIST.map((theme) => theme.id))).toEqual(new Set(THEME_IDS));
  });

  it("falls back to a real theme for unknown ids", () => {
    expect(getTheme("does-not-exist").id).toBe("romantic");
  });

  it.each(THEME_LIST.map((theme) => [theme.id, theme] as const))(
    "theme %s satisfies the contract",
    (_id, theme) => {
      expect(theme.name.length).toBeGreaterThan(2);
      expect(theme.tagline.length).toBeGreaterThan(2);
      expect(theme.description.length).toBeGreaterThan(10);
      expect(theme.sceneIds.length).toBeGreaterThanOrEqual(5);
      expect(theme.sceneIds.length).toBeLessThanOrEqual(12);
      expect(new Set(theme.sceneIds).size).toBe(theme.sceneIds.length);

      for (const required of REQUIRED_SCENES) {
        expect(theme.sceneIds).toContain(required);
      }

      const known = new Set([
        "opening",
        "hurt",
        "meaning",
        "sorry",
        "letter",
        "envelope",
        "memory",
        "closing",
        "response",
      ]);
      for (const sceneId of theme.sceneIds) {
        expect(known.has(sceneId), `${theme.id} uses unknown scene ${sceneId}`).toBe(true);
      }

      expect(theme.motion.sceneEnterDuration).toBeGreaterThan(0);
      expect(theme.motion.stagger).toBeGreaterThan(0);
      expect(theme.assets.decorativeElements.length).toBeGreaterThan(0);
    },
  );

  it.each(THEME_LIST.map((theme) => [theme.id, theme] as const))(
    "theme %s keeps body text readable",
    (_id, theme) => {
      const ratio = contrastRatio(theme.palette.text, theme.palette.background);
      expect(ratio, `${theme.id} contrast ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(4.5);
    },
  );

  it("recommends a sticker pack that exists", () => {
    for (const theme of THEME_LIST) {
      expect(STICKER_PACK_IDS).toContain(theme.suggestedPack);
    }
  });

  it("uses distinct palettes so themes are not recolours of one another", () => {
    const backgrounds = new Set(THEME_LIST.map((theme) => theme.palette.background.toLowerCase()));
    expect(backgrounds.size).toBe(THEME_LIST.length);
  });
});

describe("sticker pack registry", () => {
  it("exposes exactly the six declared packs", () => {
    expect(STICKER_PACK_LIST).toHaveLength(STICKER_PACK_IDS.length);
    expect(new Set(STICKER_PACK_LIST.map((pack) => pack.id))).toEqual(new Set(STICKER_PACK_IDS));
  });

  it("falls back to a real pack for unknown ids", () => {
    expect(getStickerPack("unknown").id).toBe("cats");
  });

  it.each(STICKER_PACK_LIST.map((pack) => [pack.id, pack] as const))(
    "pack %s covers every character state",
    (_id, pack) => {
      expect(pack.states).toHaveLength(CHARACTER_STATES.length);
      for (const state of CHARACTER_STATES) {
        expect(pack.states).toContain(state);
      }
    },
  );

  it("declares provenance for every pack", () => {
    for (const pack of STICKER_PACK_LIST) {
      expect(["original", "licensed"]).toContain(pack.source);
      if (pack.source === "licensed") {
        expect(pack.licence).toBeTruthy();
      }
    }
  });

  it("gives every pack a distinct accent and character", () => {
    expect(new Set(STICKER_PACK_LIST.map((pack) => pack.accent)).size).toBe(
      STICKER_PACK_LIST.length,
    );
    expect(new Set(STICKER_PACK_LIST.map((pack) => pack.characterName)).size).toBe(
      STICKER_PACK_LIST.length,
    );
  });
});
