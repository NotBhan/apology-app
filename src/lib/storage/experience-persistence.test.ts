import { describe, expect, it } from "vitest";
import { createFakeBackend } from "@/test/adapters/fake-backend";
import { birthdayContentSchema } from "@/experiences/birthday/schema";
import { requireExperience } from "@/experiences/registry";

const OWNER = { userId: "user-a", scopeKey: "scope-a" };

describe("experience persistence", () => {
  it("defaults to the apology experience when no type is supplied", async () => {
    const backend = createFakeBackend();
    const draft = await backend.repository.createDraft(OWNER, {
      recipientName: "Acceptance",
      senderName: "Harness",
    });

    expect(draft.experienceType).toBe("apology");
    expect(draft.content).toBeNull();
  });

  it("stores a validated birthday document under its own type", async () => {
    const backend = createFakeBackend();
    const content = birthdayContentSchema.parse({
      recipientName: "Riya",
      senderName: "Arjun",
      headline: "Happy birthday",
      message: "Hope this year is a kind one.",
      themeId: "confetti",
    });

    const draft = await backend.repository.createDraft(
      OWNER,
      { recipientName: "Riya", senderName: "Arjun" },
      { experienceType: "birthday", content },
    );

    expect(draft.experienceType).toBe("birthday");
    expect((draft.content as { themeId: string }).themeId).toBe("confetti");

    // The module that owns this type must accept what was stored.
    const module = requireExperience("birthday");
    expect(module.draftSchema.safeParse(draft.content).success).toBe(true);
  });

  it("rejects content that the owning module would not accept", () => {
    const module = requireExperience("birthday");
    const invalid = { recipientName: "Riya", themeId: "romantic" };
    expect(module.draftSchema.safeParse(invalid).success).toBe(false);
  });
});
