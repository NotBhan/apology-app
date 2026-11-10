import { describe, expect, it } from "vitest";
import { buildScenes } from "./build-scenes";
import { THEME_LIST } from "@/themes/registry";
import { STICKER_PACK_LIST } from "@/sticker-packs/registry";
import type { ApologyDraft } from "@/types/apology";

function makeDraft(patch: Partial<ApologyDraft> = {}): ApologyDraft {
  return {
    id: "draft-1",
    recipientName: "Ananya",
    senderName: "Rohan",
    situation: "fight",
    situationCustom: "",
    language: "en",
    messages: {
      message1: "I said things I did not mean.",
      message2: "You matter more than my temper.",
      message3: "I am learning to pause before I speak.",
      personalNote: "I wrote this at 2am because I could not sleep.",
    },
    themeId: "romantic",
    stickerPackId: "cats",
    customization: {
      audio: { source: "default", volume: 0.5 },
      photos: [],
      memoryStyle: "polaroid",
    },
    linkDurationDays: 3,
    status: "draft",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...patch,
  };
}

describe("buildScenes", () => {
  it("follows the order declared by the theme", () => {
    const heartfelt = THEME_LIST.find((theme) => theme.id === "heartfelt")!;
    const scenes = buildScenes(makeDraft({ themeId: "heartfelt" }), heartfelt);
    const ids = scenes.map((scene) => scene.id);

    // The envelope reveals the personal note, so there is no second letter scene.
    expect(ids).toContain("envelope");
    expect(ids).not.toContain("letter");
    expect(ids[0]).toBe("opening");
    expect(ids.at(-1)).toBe("response");
  });

  it("presents the personal note once, through the envelope", () => {
    const midnight = THEME_LIST.find((theme) => theme.id === "midnight")!;
    const note = "I wrote this at 2am because I could not sleep.";
    const scenes = buildScenes(makeDraft({ themeId: "midnight" }), midnight);

    expect(scenes.filter((scene) => scene.id === "envelope")).toHaveLength(1);
    expect(scenes.some((scene) => scene.id === "letter")).toBe(false);
    // Nothing else carries the note text, including the closing scene.
    expect(scenes.some((scene) => scene.body === note)).toBe(false);
    expect(scenes.find((scene) => scene.id === "closing")?.body).toBe(
      "I am learning to pause before I speak.",
    );
  });

  it("drops the memory scene when no photos were supplied", () => {
    const romantic = THEME_LIST.find((theme) => theme.id === "romantic")!;
    const scenes = buildScenes(makeDraft(), romantic);
    expect(scenes.some((scene) => scene.type === "memory")).toBe(false);
  });

  it("includes the memory scene once photos exist", () => {
    const romantic = THEME_LIST.find((theme) => theme.id === "romantic")!;
    const scenes = buildScenes(
      makeDraft({
        customization: {
          audio: { source: "default", volume: 0.5 },
          memoryStyle: "scrapbook",
          photos: [
            { id: "a", url: "/api/uploads/a" },
            { id: "b", url: "/api/uploads/b" },
          ],
        },
      }),
      romantic,
    );
    const memory = scenes.find((scene) => scene.type === "memory");
    expect(memory).toBeDefined();
    expect(memory?.content?.memoryStyle).toBe("scrapbook");
  });

  it("drops the letter scene when the personal note is empty", () => {
    const romantic = THEME_LIST.find((theme) => theme.id === "romantic")!;
    const scenes = buildScenes(
      makeDraft({
        messages: {
          message1: "a",
          message2: "b",
          message3: "c",
          personalNote: "   ",
        },
      }),
      romantic,
    );
    expect(scenes.some((scene) => scene.type === "letter")).toBe(false);
  });

  it("maps each message scene to the sender's own words", () => {
    const romantic = THEME_LIST.find((theme) => theme.id === "romantic")!;
    const scenes = buildScenes(makeDraft(), romantic);

    expect(scenes.find((scene) => scene.id === "hurt")?.body).toBe(
      "I said things I did not mean.",
    );
    expect(scenes.find((scene) => scene.id === "meaning")?.body).toBe(
      "You matter more than my temper.",
    );
    expect(scenes.find((scene) => scene.id === "sorry")?.body).toBe(
      "I am learning to pause before I speak.",
    );
  });

  it("never invents content for an empty message", () => {
    const romantic = THEME_LIST.find((theme) => theme.id === "romantic")!;
    const scenes = buildScenes(
      makeDraft({ messages: { message1: "", message2: "", message3: "", personalNote: "" } }),
      romantic,
    );
    expect(scenes.find((scene) => scene.id === "hurt")?.body).toBe("");
  });

  it("produces a workable scene list for every theme × pack combination", () => {
    for (const theme of THEME_LIST) {
      for (const pack of STICKER_PACK_LIST) {
        const scenes = buildScenes(
          makeDraft({ themeId: theme.id, stickerPackId: pack.id }),
          theme,
        );
        expect(scenes.length).toBeGreaterThanOrEqual(5);
        expect(scenes[0].type).toBe("opening");
        expect(scenes.at(-1)?.type).toBe("response");
        expect(new Set(scenes.map((s) => s.id)).size).toBe(scenes.length);
      }
    }
  });

  it("assigns a character state to every narrative scene", () => {
    for (const theme of THEME_LIST) {
      const scenes = buildScenes(makeDraft({ themeId: theme.id }), theme);
      for (const scene of scenes) {
        if (scene.type === "response" || scene.type === "memory") continue;
        expect(scene.characterState, `${theme.id}/${scene.id}`).toBeTruthy();
      }
    }
  });
});
