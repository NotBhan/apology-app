import { describe, expect, it } from "vitest";
import { createFakeBackend } from "@/test/adapters/fake-backend";
import { birthdayContentSchema } from "@/experiences/birthday/schema";
import { requireExperience } from "@/experiences/registry";
import { draftPayloadSchema } from "@/lib/validation/apology";
import { validateDraftForPublish } from "@/lib/validation/publish";
import { buildScenes } from "@/presentation/build-scenes";
import { themeScopeVars } from "@/lib/theme-vars";
import { getTheme } from "@/themes/registry";
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
    const publishedRecord = await backend.repository.publish(created.id, OWNER.scopeKey);
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

  it("round-trips every Stage 2/3 Apology customization field across save, reload, Postgres mapping, publish, and rendering", async () => {
    const backend = createFakeBackend();
    const created = await backend.repository.createDraft(OWNER, {
      recipientName: "Ananya",
      senderName: "Rohan",
    });

    const customization = {
      colors: {
        background: "#fbf5ea",
        primary: "#9b3d48",
        secondary: "#d8b496",
        accent: "#b57238",
        text: "#2c1e16",
        surface: "#fffdf8",
      },
      audio: { source: "custom" as const, trackId: "soft-piano", volume: 0.7 },
      photos: [{ id: "photo-1", url: "/api/uploads/photo-1", caption: "By the lake" }],
      memoryStyle: "scrapbook" as const,
      content: {
        openingTitle: "Read this tonight",
        openingSubtitle: "Before you sleep",
        openingCta: "Start reading",
        envelopeHeader: "A personal letter",
        envelopeSignOff: "Always yours",
        closingHeadline: "Take all the time you need",
        closingBody: "No pressure from me.",
        sceneHeadings: {
          hurt: "My mistake",
          meaning: "Why you matter",
          sorry: "What changes",
          memory: "Moments I keep",
          response: "Your thoughts",
        },
        showSituationLabel: true,
        showMemoryScene: false,
      },
      visual: {
        fontPairing: "editorial" as const,
        textSize: "expressive" as const,
        alignment: "left" as const,
        decorationsEnabled: false,
        decorationDensity: "minimal" as const,
      },
      interaction: {
        envelopeStyle: "open-letter" as const,
        transitionStyle: "paper" as const,
        revealStyle: "ink" as const,
        motionPreset: "still" as const,
      },
    };

    const parsedPayload = draftPayloadSchema.parse({
      recipientName: "Ananya",
      senderName: "Rohan",
      situation: "other",
      situationCustom: "Missed our dinner",
      language: "en",
      messages: {
        message1: "I was late and did not call.",
        message2: "You matter to me.",
        message3: "I will communicate earlier.",
        personalNote: "Thank you for your patience.",
      },
      themeId: "romantic",
      stickerPackId: "cats",
      customization,
    });

    const saved = await backend.repository.saveDraft(created.id, OWNER.scopeKey, parsedPayload);
    expect(saved.customization).toEqual(customization);

    const reloaded = await backend.repository.getDraft(created.id);
    expect(reloaded).toBeDefined();
    expect(toCreatorDraft(reloaded!).customization).toEqual(customization);

    // Postgres row mapper preserves nested customization JSONB identically
    const pgRow: Partial<ApologyRow> = {
      id: saved.id,
      ownerKeyHash: OWNER.scopeKey,
      experienceType: "apology",
      content: null,
      recipientName: saved.recipientName,
      senderName: saved.senderName,
      situation: saved.situation,
      situationCustom: saved.situationCustom,
      language: saved.language,
      messages: saved.messages,
      themeId: saved.themeId,
      stickerPackId: saved.stickerPackId,
      customization: saved.customization,
      linkDurationDays: 3,
      status: "published",
      createdAt: new Date(saved.createdAt),
      updatedAt: new Date(saved.updatedAt),
      publishedAt: new Date(),
    };
    const pgRecord = rowToRecord(pgRow as ApologyRow, "live-token");
    expect(toPublished(pgRecord).customization).toEqual(customization);

    expect(validateDraftForPublish(pgRecord)).toEqual({ ok: true });
    const published = await backend.repository.publish(created.id, OWNER.scopeKey);
    const liveView = await backend.repository.getPublishedByToken(published.accessToken);
    expect(liveView).toBeDefined();
    expect(liveView!.customization).toEqual(customization);

    const theme = getTheme(liveView!.themeId);
    const scenes = buildScenes(liveView!, theme);
    expect(scenes.find((s) => s.id === "opening")?.title).toBe("Read this tonight");
    expect(scenes.some((s) => s.id === "letter")).toBe(true);
    expect(scenes.some((s) => s.id === "envelope")).toBe(false);
    expect(scenes.some((s) => s.id === "memory")).toBe(false);

    const vars = themeScopeVars(theme, liveView!.customization);
    expect(vars["--t-text"]).toBe("#2c1e16");
    expect(vars["--t-surface"]).toBe("#fffdf8");
    expect(vars["--t-text-scale"]).toBe("1.08");
    expect(vars["--t-align"]).toBe("left");
  });

  it("persists Birthday customization, cake overrides, and photo focal points end-to-end across save, row mapping, and publish", async () => {
    const { birthdayContentSchema } = await import("@/experiences/birthday/schema");
    const { resolveBirthdayConfig } = await import("@/experiences/birthday/resolve");
    const backend = createFakeBackend();
    const created = await backend.repository.createDraft(OWNER, {
      recipientName: "Riya",
      senderName: "Arjun",
    }, { experienceType: "birthday" });

    const birthdayContent = birthdayContentSchema.parse({
      recipientName: "Riya",
      senderName: "Arjun",
      age: 30,
      headline: "Thirty & Thriving",
      message: "You deserve every joy this year brings.",
      wish: "Stay bold.",
      themeId: "midnight-gold",
      candleCount: 5,
      photoLayout: "polaroid",
      photos: [{ url: "/api/uploads/bday-photo-1", caption: "Toast", focalPoint: "50% 25%" }],
      audio: "soft",
      customization: {
        colors: {
          background: "#17141b",
          surface: "#221d28",
          primary: "#ebb968",
          accent: "#ffe08a",
          text: "#f7f0e6",
        },
        content: {
          openingEyebrow: "chapter thirty",
          letterHeading: "For Riya",
          showCakeScene: true,
          showGalleryScene: true,
        },
        visual: {
          fontPairing: "editorial",
          textSize: "expressive",
          alignment: "left",
          decorationsEnabled: true,
          decorationDensity: "lush",
          cake: { tiers: 3, flavor: "chocolate", topping: "stars" },
        },
        interaction: {
          envelopeStyle: "ribbon",
          transitionStyle: "paper",
          motionPreset: "gentle",
          giftReveal: "direct",
          candleMode: "tap-relight",
          celebrationIntensity: "grand",
        },
      },
    });

    const saved = await backend.repository.saveExperienceContent(
      created.id,
      OWNER.scopeKey,
      birthdayContent,
      { recipientName: birthdayContent.recipientName, senderName: birthdayContent.senderName },
    );
    expect(saved).toBeDefined();

    const pgRow: Partial<ApologyRow> = {
      id: saved!.id,
      ownerKeyHash: OWNER.scopeKey,
      experienceType: "birthday",
      content: saved!.content,
      recipientName: saved!.recipientName,
      senderName: saved!.senderName,
      situation: saved!.situation,
      situationCustom: saved!.situationCustom,
      language: saved!.language,
      messages: saved!.messages,
      themeId: saved!.themeId,
      stickerPackId: saved!.stickerPackId,
      customization: saved!.customization,
      linkDurationDays: 1,
      status: "published",
      createdAt: new Date(saved!.createdAt),
      updatedAt: new Date(saved!.updatedAt),
      publishedAt: new Date(),
    };
    const pgRecord = rowToRecord(pgRow as ApologyRow, "bday-live-tok");
    expect(validateDraftForPublish(pgRecord)).toEqual({ ok: true });

    const published = await backend.repository.publish(created.id, OWNER.scopeKey);
    const liveView = await backend.repository.getPublishedByToken(published.accessToken);
    const reparsed = birthdayContentSchema.parse(liveView!.content);
    expect(reparsed).toEqual(birthdayContent);

    const resolved = resolveBirthdayConfig(reparsed);
    expect(resolved.cake.tiers).toBe(3);
    expect(resolved.cake.base).toBe("#5c3a28");
    expect(resolved.interaction.envelopeStyle).toBe("ribbon");
    expect(resolved.interaction.celebrationIntensity).toBe("grand");
    expect(resolved.audioTrack?.src).toBe("/audio/midnight-glow.mp3");
  });
});
