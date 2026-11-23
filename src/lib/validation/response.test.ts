import { describe, expect, it } from "vitest";
import {
  createResponseDraftSchema,
  manageResponseActionSchema,
  publishResponseSchema,
  quickReplyPayloadSchema,
} from "./response";

describe("quickReplyPayloadSchema", () => {
  it("validates valid message content", () => {
    const valid = {
      message: "Thank you for the heartfelt apology. Let's talk soon.",
      recipientEmotion: "grateful",
      photos: ["00000000-0000-4000-8000-000000000001"],
    };
    const parsed = quickReplyPayloadSchema.parse(valid);
    expect(parsed.message).toBe(valid.message);
    expect(parsed.recipientEmotion).toBe("grateful");
    expect(parsed.photos).toHaveLength(1);
  });

  it("rejects empty messages", () => {
    expect(() => quickReplyPayloadSchema.parse({ message: "   " })).toThrow();
    expect(() => quickReplyPayloadSchema.parse({ message: "" })).toThrow();
  });

  it("rejects messages exceeding 2000 characters", () => {
    const longMsg = "a".repeat(2001);
    expect(() => quickReplyPayloadSchema.parse({ message: longMsg })).toThrow(
      "Message must be 2000 characters or fewer",
    );
  });

  it("rejects invalid photo uuids", () => {
    expect(() =>
      quickReplyPayloadSchema.parse({
        message: "hello",
        photos: ["not-a-uuid"],
      }),
    ).toThrow("Invalid asset ID");
  });

  it("limits maximum photos to 10", () => {
    const elevenPhotos = Array.from({ length: 11 }, (_, i) =>
      `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
    );
    expect(() =>
      quickReplyPayloadSchema.parse({
        message: "hello",
        photos: elevenPhotos,
      }),
    ).toThrow("Maximum 10 photos allowed");
  });
});

describe("createResponseDraftSchema", () => {
  it("validates draft creation parameters", () => {
    const draft = createResponseDraftSchema.parse({
      apologyId: "00000000-0000-4000-8000-000000000001",
      responseType: "quick",
    });
    expect(draft.responseType).toBe("quick");
    expect(draft.apologyId).toBe("00000000-0000-4000-8000-000000000001");
  });
});

describe("manageResponseActionSchema", () => {
  it("accepts valid actions", () => {
    expect(manageResponseActionSchema.parse({ action: "revoke" })).toEqual({ action: "revoke" });
    expect(manageResponseActionSchema.parse({ action: "restore" })).toEqual({ action: "restore" });
    expect(manageResponseActionSchema.parse({ action: "delete" })).toEqual({ action: "delete" });
  });

  it("rejects unknown actions", () => {
    expect(() => manageResponseActionSchema.parse({ action: "restart" })).toThrow();
  });
});

describe("publishResponseSchema", () => {
  it("accepts quick reply payload", () => {
    const res = publishResponseSchema.parse({
      content: {
        message: "Accepted!",
      },
    });
    expect(res.content).toMatchObject({ message: "Accepted!" });
  });
});
