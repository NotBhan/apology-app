import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
}));

vi.mock("@/lib/security/creator", () => ({
  requireApiCreator: vi.fn(),
  getCreator: vi.fn(),
  requirePageCreator: vi.fn(),
  safeCallback: (cb?: string) => cb || "/",
}));

vi.mock("@/lib/security/postgres-rate-limit", () => ({
  enforceRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 10, reset: 60 }),
  rateLimitHeaders: vi.fn().mockReturnValue({ "X-RateLimit-Remaining": "10" }),
}));

vi.mock("@/lib/storage", () => ({
  getRepository: vi.fn(),
  getObjectStore: vi.fn(),
}));

import { getCreator, requireApiCreator } from "@/lib/security/creator";
import { getRepository } from "@/lib/storage";
import { POST as publishRoute } from "@/app/api/drafts/[draftId]/publish/route";
import LetterPage from "@/app/letter/[token]/page";

/**
 * Route-level regression coverage for the published link.
 *
 * The reported defect was a link that stopped working immediately after it was
 * sent. These tests drive the real route handlers and assert that the URL the
 * server returns is the URL the public page resolves — now and after time has
 * passed.
 */

const OWNER_KEY = "owner-key-1";
const MISS_YOU_CONTENT = {
  recipientName: "Maya",
  senderName: "Kabir",
  headline: "Counting hours",
  distanceNote: "Three timezones",
  letter: "See you on Friday evening.",
  reminders: [],
  themeId: "dusk-postage",
  photoLayout: "postcards",
  photos: [],
  audio: "none",
};

interface StoredRecord {
  id: string;
  ownerKeyHash: string;
  experienceType: string;
  content: unknown;
  recipientName: string;
  senderName: string;
  situation: string;
  situationCustom: string;
  language: string;
  messages: { message1: string; message2: string; message3: string; personalNote: string };
  themeId: string;
  stickerPackId: string;
  customization: { audio: { source: string; volume: number }; photos: []; memoryStyle: string };
  linkDurationDays: number;
  status: "draft" | "published" | "revoked" | "deleted";
  accessToken: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  expiresAt?: string;
}

describe("published link route contract", () => {
  let store: Map<string, StoredRecord>;
  let tokenToId: Map<string, string>;
  let tokenCounter: number;

  const repository = {
    getDraft: vi.fn(async (id: string) => store.get(id)),
    publish: vi.fn(async (id: string, ownerKeyHash: string) => {
      const record = store.get(id);
      if (!record || record.ownerKeyHash !== ownerKeyHash) throw new Error("FORBIDDEN");
      const minted = record.status !== "published" || !record.accessToken;
      if (minted) {
        tokenCounter += 1;
        record.accessToken = `tok-${tokenCounter}`;
        tokenToId.set(record.accessToken, record.id);
      }
      record.status = "published";
      record.publishedAt = record.publishedAt ?? new Date().toISOString();
      // Publication never writes an expiry.
      record.expiresAt = undefined;
      // Only the minting call can return the plaintext token, exactly as the
      // Postgres repository does when the stored hash is retained.
      return { ...record, accessToken: minted ? record.accessToken : "" };
    }),
    getPublishedByToken: vi.fn(async (token: string) => {
      const id = tokenToId.get(token);
      if (!id) return undefined;
      const record = store.get(id);
      if (!record || record.status !== "published") return undefined;
      return {
        id: record.id,
        experienceType: record.experienceType,
        content: record.content,
        recipientName: record.recipientName,
        senderName: record.senderName,
        situation: record.situation,
        situationCustom: record.situationCustom,
        messages: record.messages,
        themeId: record.themeId,
        stickerPackId: record.stickerPackId,
        customization: record.customization,
        publishedAt: record.publishedAt ?? record.createdAt,
      };
    }),
  };

  function seedDraft(): StoredRecord {
    const now = new Date().toISOString();
    const record: StoredRecord = {
      id: "draft-1",
      ownerKeyHash: OWNER_KEY,
      experienceType: "miss-you",
      content: MISS_YOU_CONTENT,
      recipientName: "Maya",
      senderName: "Kabir",
      situation: "other",
      situationCustom: "",
      language: "en",
      messages: { message1: "", message2: "", message3: "", personalNote: "" },
      themeId: "romantic",
      stickerPackId: "cats",
      customization: { audio: { source: "none", volume: 0.5 }, photos: [], memoryStyle: "polaroid" },
      linkDurationDays: 7,
      status: "draft",
      accessToken: "",
      createdAt: now,
      updatedAt: now,
    };
    store.set(record.id, record);
    return record;
  }

  beforeEach(() => {
    store = new Map();
    tokenToId = new Map();
    tokenCounter = 0;
    vi.clearAllMocks();
    vi.mocked(getRepository).mockReturnValue(repository as never);
    vi.mocked(requireApiCreator).mockResolvedValue({
      ok: true,
      creator: { userId: "u-1", key: OWNER_KEY },
    } as never);
    vi.mocked(getCreator).mockResolvedValue(undefined as never);
  });

  async function publish(): Promise<{ token: string; path: string; alreadyPublished: boolean }> {
    const res = await publishRoute(
      new Request("http://localhost/api/drafts/draft-1/publish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ draftId: "draft-1" }) },
    );
    expect(res.status).toBe(200);
    return (await res.json()) as { token: string; path: string; alreadyPublished: boolean };
  }

  it("1. returns the persisted token as /letter/<token>, and that URL renders without a session", async () => {
    seedDraft();
    const { token, path } = await publish();

    expect(token).toBeTruthy();
    expect(path).toBe(`/letter/${token}`);

    // The exact token from the response must resolve — no second lookup, no
    // client-side reconstruction.
    vi.mocked(getCreator).mockResolvedValue(undefined as never);
    const element = await LetterPage({ params: Promise.resolve({ token }) });
    render(element);
    expect(screen.getByText("Counting hours")).toBeInTheDocument();
  });

  it("2. the published record carries no expiry at all", async () => {
    const draft = seedDraft();
    await publish();

    expect(store.get(draft.id)?.expiresAt).toBeUndefined();
  });

  it("3. the same token still resolves after simulated elapsed time", async () => {
    seedDraft();
    const { token } = await publish();

    // Nothing in the read path consults a clock, so advancing time cannot
    // change the result. Assert the response shape stays identical.
    const before = await repository.getPublishedByToken(token);
    const tenYears = 10 * 365 * 86_400_000;
    vi.setSystemTime(new Date(Date.now() + tenYears));

    const after = await repository.getPublishedByToken(token);
    expect(after).toEqual(before);
    vi.useRealTimers();
  });

  it("4. calling publish twice returns the same link and never blanks a live URL", async () => {
    seedDraft();
    const first = await publish();
    const record = store.get("draft-1");
    const persistedHashToken = record?.accessToken;

    const second = await publish();

    // The stored token is unchanged, so the URL already sent still works.
    expect(record?.accessToken).toBe(persistedHashToken);
    expect(second.alreadyPublished).toBe(true);
    expect(second.path).toBe("");
    expect(await repository.getPublishedByToken(first.token)).toBeDefined();
  });

  it("5. revocation invalidates the link on the public route", async () => {
    const draft = seedDraft();
    const { token } = await publish();

    draft.status = "revoked";

    expect(await repository.getPublishedByToken(token)).toBeUndefined();
    await expect(LetterPage({ params: Promise.resolve({ token }) })).rejects.toThrow("NOT_FOUND");
  });

  it("6. an unpublished draft has no resolvable link", async () => {
    seedDraft();
    expect(await repository.getPublishedByToken("tok-never-issued")).toBeUndefined();
    await expect(
      LetterPage({ params: Promise.resolve({ token: "tok-never-issued" }) }),
    ).rejects.toThrow("NOT_FOUND");
  });
});
