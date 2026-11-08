import { describe, expect, it } from "vitest";
import { draftPayloadSchema, createDraftSchema } from "./apology";

const valid = {
  recipientName: "Ananya",
  senderName: "Rohan",
  situation: "fight" as const,
  language: "en" as const,
  messages: {
    message1: "I said too much.",
    message2: "You matter to me.",
    message3: "I will do better.",
    personalNote: "",
  },
  themeId: "romantic" as const,
  stickerPackId: "cats" as const,
  customization: {
    audio: { source: "default" as const, volume: 0.5 },
    photos: [],
    memoryStyle: "polaroid" as const,
  },
};

describe("draftPayloadSchema", () => {
  it("accepts a complete draft", () => {
    expect(draftPayloadSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects unknown theme ids", () => {
    const result = draftPayloadSchema.safeParse({ ...valid, themeId: "neon-disco" });
    expect(result.success).toBe(false);
  });

  it("rejects unknown sticker packs", () => {
    const result = draftPayloadSchema.safeParse({ ...valid, stickerPackId: "dinosaurs" });
    expect(result.success).toBe(false);
  });

  it("trims and rejects whitespace-only names", () => {
    const result = draftPayloadSchema.safeParse({ ...valid, recipientName: "   " });
    expect(result.success).toBe(false);
  });

  it("enforces the message character limit", () => {
    const result = draftPayloadSchema.safeParse({
      ...valid,
      messages: { ...valid.messages, message1: "x".repeat(321) },
    });
    expect(result.success).toBe(false);
  });

  it("caps photos at five", () => {
    const photos = Array.from({ length: 6 }, (_, index) => ({
      id: `p${index}`,
      url: `/api/uploads/p${index}`,
    }));
    const result = draftPayloadSchema.safeParse({
      ...valid,
      customization: { ...valid.customization, photos },
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-hex colour overrides", () => {
    const result = draftPayloadSchema.safeParse({
      ...valid,
      customization: {
        ...valid.customization,
        colors: { background: "javascript:alert(1)" },
      },
    });
    expect(result.success).toBe(false);
  });

  it("rejects an out-of-range volume", () => {
    const result = draftPayloadSchema.safeParse({
      ...valid,
      customization: {
        ...valid.customization,
        audio: { source: "default", volume: 4 },
      },
    });
    expect(result.success).toBe(false);
  });

  it("accepts Hinglish as a starter language", () => {
    expect(draftPayloadSchema.safeParse({ ...valid, language: "hinglish" }).success).toBe(true);
  });
});

describe("link window", () => {
  it("accepts every day from 1 to 7", () => {
    for (let days = 1; days <= 7; days += 1) {
      expect(draftPayloadSchema.safeParse({ ...valid, linkDurationDays: days }).success).toBe(true);
    }
  });

  it("rejects 0, 8 and fractional days", () => {
    expect(draftPayloadSchema.safeParse({ ...valid, linkDurationDays: 0 }).success).toBe(false);
    expect(draftPayloadSchema.safeParse({ ...valid, linkDurationDays: 8 }).success).toBe(false);
    expect(draftPayloadSchema.safeParse({ ...valid, linkDurationDays: 3.5 }).success).toBe(false);
    expect(draftPayloadSchema.safeParse({ ...valid, linkDurationDays: -2 }).success).toBe(false);
  });

  it("defaults to three days when omitted", () => {
    const parsed = draftPayloadSchema.safeParse(valid);
    expect(parsed.success && parsed.data.linkDurationDays).toBe(3);
  });

  it("ignores a client-supplied expiresAt", () => {
    const parsed = draftPayloadSchema.safeParse({
      ...valid,
      expiresAt: "2099-01-01T00:00:00.000Z",
    });
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data).not.toHaveProperty("expiresAt");
  });
});

describe("createDraftSchema", () => {
  it("requires both names", () => {
    expect(createDraftSchema.safeParse({ recipientName: "A", senderName: "" }).success).toBe(false);
  });

  it("strips unknown properties rather than passing them through", () => {
    const result = createDraftSchema.safeParse({
      recipientName: "A",
      senderName: "B",
      role: "admin",
    });
    expect(result.success).toBe(true);
    expect(result.success && result.data).not.toHaveProperty("role");
  });
});
