import { describe, expect, it } from "vitest";
import { createFakeBackend } from "@/test/adapters/fake-backend";
import { birthdayContentSchema } from "@/experiences/birthday/schema";
import { requireExperience } from "@/experiences/registry";
import { rowToRecord } from "./postgres-repository";
import { toCreatorDraft, toPublished } from "./types";
import type { ApologyRow } from "@/db/schema";
import type { ApologyRecord } from "@/types/apology";

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
    const expModule = requireExperience("birthday");
    expect(expModule.draftSchema.safeParse(draft.content).success).toBe(true);
  });

  it("rejects content that the owning module would not accept", () => {
    const expModule = requireExperience("birthday");
    const invalid = { recipientName: "Riya", themeId: "romantic" };
    expect(expModule.draftSchema.safeParse(invalid).success).toBe(false);
  });

  it("preserves birthday experienceType through fake storage mapping paths", async () => {
    const backend = createFakeBackend();
    const content = birthdayContentSchema.parse({
      recipientName: "Meera",
      senderName: "Kabir",
      headline: "Happy Birthday Meera",
      message: "Have a wonderful day!",
      themeId: "confetti",
    });

    const created = await backend.repository.createDraft(
      OWNER,
      { recipientName: "Meera", senderName: "Kabir" },
      { experienceType: "birthday", content },
    );
    expect(created.experienceType).toBe("birthday");

    // 1. getDraft preserves type
    const fetchedDraft = await backend.repository.getDraft(created.id);
    expect(fetchedDraft?.experienceType).toBe("birthday");

    // 2. listByOwner preserves type via toCreatorDraft mapping
    const ownerDrafts = await backend.repository.listByOwner(OWNER.scopeKey);
    const matched = ownerDrafts.find((d) => d.id === created.id);
    expect(matched?.experienceType).toBe("birthday");

    // 3. publish & getPublishedByToken preserves type via toPublished mapping
    const publishedRecord = await backend.repository.publish(created.id, OWNER.scopeKey, 3);
    const publishedView = await backend.repository.getPublishedByToken(publishedRecord.accessToken);
    expect(publishedView?.experienceType).toBe("birthday");
  });

  it("preserves birthday experienceType through PostgreSQL mapping path", () => {
    const mockRow: Partial<ApologyRow> = {
      id: "pg-bday-1",
      experienceType: "birthday",
      content: { themeId: "confetti" },
      recipientName: "Meera",
      senderName: "Kabir",
      situation: "other",
      situationCustom: "",
      language: "en",
      messages: { message1: "", message2: "", message3: "", personalNote: "" },
      themeId: "romantic",
      stickerPackId: "cats",
      customization: {
        audio: { source: "none", volume: 0.6 },
        photos: [],
        memoryStyle: "polaroid",
      },
      linkDurationDays: 3,
      status: "published",
      createdAt: new Date("2026-11-20T10:00:00Z"),
      updatedAt: new Date("2026-11-20T10:00:00Z"),
      publishedAt: new Date("2026-11-20T10:00:00Z"),
      expiresAt: new Date("2026-11-23T10:00:00Z"),
    };

    const record = rowToRecord(mockRow as ApologyRow, "token-123");
    expect(record.experienceType).toBe("birthday");

    const creatorDraft = toCreatorDraft(record);
    expect(creatorDraft.experienceType).toBe("birthday");

    const published = toPublished(record);
    expect(published.experienceType).toBe("birthday");
  });

  it("safely handles legacy records without experienceType through PostgreSQL mapping path", () => {
    const legacyRow: Partial<ApologyRow> = {
      id: "pg-legacy-1",
      experienceType: undefined,
      content: null,
      recipientName: "Old Recipient",
      senderName: "Old Sender",
      situation: "other",
      situationCustom: "",
      language: "en",
      messages: { message1: "", message2: "", message3: "", personalNote: "" },
      themeId: "romantic",
      stickerPackId: "cats",
      customization: {
        audio: { source: "none", volume: 0.6 },
        photos: [],
        memoryStyle: "polaroid",
      },
      linkDurationDays: 3,
      status: "published",
      createdAt: new Date("2026-11-01T10:00:00Z"),
      updatedAt: new Date("2026-11-01T10:00:00Z"),
      publishedAt: new Date("2026-11-01T10:00:00Z"),
      expiresAt: new Date("2026-11-04T10:00:00Z"),
    };

    // 1. rowToRecord falls back safely to 'apology'
    const record = rowToRecord(legacyRow as ApologyRow, "legacy-token");
    expect(record.experienceType).toBe("apology");

    // 2. toPublished on pre-platform record defaults to 'apology'
    const bareRecord: Partial<ApologyRecord> = {
      ...record,
      experienceType: undefined,
    };
    const published = toPublished(bareRecord as ApologyRecord);
    expect(published.experienceType).toBe("apology");

    // 3. toCreatorDraft safely defaults to 'apology'
    const creatorDraft = toCreatorDraft(bareRecord as ApologyRecord);
    expect(creatorDraft.experienceType).toBe("apology");
    expect(creatorDraft.content).toBeNull();
  });
});
