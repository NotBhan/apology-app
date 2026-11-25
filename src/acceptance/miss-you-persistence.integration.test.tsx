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

import { getCreator, requireApiCreator, requirePageCreator } from "@/lib/security/creator";
import { getObjectStore, getRepository } from "@/lib/storage";
import { POST as createDraftRoute } from "@/app/api/drafts/route";
import { PATCH as updateExperienceRoute } from "@/app/api/experiences/[experienceId]/[draftId]/route";
import { POST as publishRoute } from "@/app/api/drafts/[draftId]/publish/route";
import { GET as assetGetRoute } from "@/app/api/uploads/[assetId]/route";
import LetterPage from "@/app/letter/[token]/page";
import PreviewPage from "@/app/preview/[draftId]/page";
import { ManageList } from "@/components/manage/ManageList";
import { ResponseViewClient } from "@/app/response/[token]/ResponseViewClient";
import { MISS_YOU_PHOTO_LAYOUTS } from "@/experiences/miss-you/schema";
import { MISS_YOU_THEMES } from "@/experiences/miss-you/themes";
import type { ApologyDraft, ApologyRecord, PublishedApology } from "@/types/apology";
import type { ServingAsset } from "@/lib/storage/types";

describe("I Miss You — End-to-End Persistence, Asset Serving & Shared Routes", () => {
  const OWNER_KEY = "owner-missyou-key-1";
  let store: Map<string, ApologyRecord>;
  let tokensToId: Map<string, string>;
  let assets: Map<string, ServingAsset>;

  const mockRepo = {
    createDraft: vi.fn(async (owner, names, extra) => {
      const id = "miss-draft-" + (store.size + 1);
      const now = new Date().toISOString();
      const record: ApologyRecord = {
        id,
        accessToken: "tok-" + id,
        ownerKeyHash: owner.scopeKey,
        experienceType: extra?.experienceType ?? "apology",
        content: extra?.content ?? null,
        recipientName: names.recipientName,
        senderName: names.senderName,
        situation: "other",
        situationCustom: "",
        language: "en",
        messages: { message1: "", message2: "", message3: "", personalNote: "" },
        themeId: "romantic",
        stickerPackId: "cats",
        customization: { audio: { source: "none", volume: 0.6 }, photos: [], memoryStyle: "polaroid" },
        linkDurationDays: 7,
        status: "draft",
        createdAt: now,
        updatedAt: now,
      };
      store.set(id, record);
      return record;
    }),
    getDraft: vi.fn(async (id: string) => store.get(id)),
    saveExperienceContent: vi.fn(
      async (id: string, ownerKey: string, content: unknown, names: { recipientName: string; senderName: string }) => {
        const r = store.get(id);
        if (!r || r.ownerKeyHash !== ownerKey) return null;
        r.content = content;
        r.recipientName = names.recipientName;
        r.senderName = names.senderName;
        r.updatedAt = new Date().toISOString();
        return r;
      },
    ),
    publish: vi.fn(async (id: string, ownerKey: string, durationDays: number) => {
      const r = store.get(id);
      if (!r || r.ownerKeyHash !== ownerKey) throw new Error("FORBIDDEN");
      const token = "pub-miss-" + id;
      r.status = "published";
      r.accessToken = token;
      r.linkDurationDays = durationDays;
      r.publishedAt = new Date().toISOString();
      r.expiresAt = new Date(Date.now() + durationDays * 86_400_000).toISOString();
      tokensToId.set(token, id);
      return r;
    }),
    getPublishedByToken: vi.fn(async (token: string): Promise<PublishedApology | undefined> => {
      const id = tokensToId.get(token);
      if (!id) return undefined;
      const r = store.get(id);
      if (!r || r.status !== "published") return undefined;
      return {
        id: r.id,
        experienceType: r.experienceType,
        content: r.content,
        recipientName: r.recipientName,
        senderName: r.senderName,
        situation: r.situation,
        messages: r.messages,
        themeId: r.themeId,
        stickerPackId: r.stickerPackId,
        customization: r.customization,
        publishedAt: r.publishedAt ?? r.createdAt,
      };
    }),
    getAssetForServing: vi.fn(async (assetId: string) => {
      const a = assets.get(assetId);
      if (!a) return undefined;
      const parent = store.get(a.apologyId);
      return {
        ...a,
        apologyStatus: parent?.status ?? a.apologyStatus,
        expiresAt: parent?.expiresAt ?? a.expiresAt,
      };
    }),
  };

  beforeEach(() => {
    store = new Map();
    tokensToId = new Map();
    assets = new Map();
    vi.clearAllMocks();
    window.sessionStorage.clear();
    vi.mocked(getRepository).mockReturnValue(mockRepo as never);
    vi.mocked(getObjectStore).mockReturnValue({
      presignGet: vi.fn(async (key: string) => `https://s3.example/${key}?sig=ok`),
    } as never);
    vi.mocked(requireApiCreator).mockResolvedValue({
      ok: true,
      creator: { userId: "u-1", key: OWNER_KEY },
    } as never);
    vi.mocked(requirePageCreator).mockResolvedValue({ userId: "u-1", key: OWNER_KEY });
    vi.mocked(getCreator).mockResolvedValue({ userId: "u-1", key: OWNER_KEY });
  });

  it("persists I Miss You drafts across create, patch, publish, and anonymous public viewing without sessionStorage", async () => {
    for (const [idx, layout] of MISS_YOU_PHOTO_LAYOUTS.entries()) {
      const theme = MISS_YOU_THEMES[idx % MISS_YOU_THEMES.length]!;
      const createRes = await createDraftRoute(
        new Request("http://localhost/api/drafts", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            experienceType: "miss-you",
            content: {
              recipientName: "Maya",
              senderName: "Kabir",
              headline: `Layout ${layout}`,
              distanceNote: "Three timezones",
              letter: "Wish you were here for tea.",
              reminders: ["Warm mug by the window"],
              reunionWish: "Next month at the station.",
              themeId: theme.id,
              photoLayout: layout,
              photos: [{ url: `/api/uploads/11111111-1111-1111-1111-11111111111${idx}`, caption: "Sunset" }],
              audio: "soft-lavender",
            },
          }),
        }),
      );
      expect(createRes.status).toBe(201);
      const { draft } = (await createRes.json()) as { draft: ApologyRecord };

      const patchRes = await updateExperienceRoute(
        new Request(`http://localhost/api/experiences/miss-you/${draft.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            content: {
              recipientName: "Maya",
              senderName: "Kabir",
              headline: `Updated ${layout}`,
              distanceNote: "Across oceans",
              letter: "Still missing you every morning.",
              reminders: ["Two cups out"],
              reunionWish: "Walk by the river soon.",
              themeId: theme.id,
              photoLayout: layout,
              photos: [
                { url: `/api/uploads/11111111-1111-1111-1111-11111111111${idx}`, caption: "Caption 1" },
                { url: `/api/uploads/22222222-2222-2222-2222-22222222222${idx}`, caption: "Caption 2" },
              ],
              audio: "midnight-glow",
            },
          }),
        }),
        { params: Promise.resolve({ experienceId: "miss-you", draftId: draft.id }) },
      );
      expect(patchRes.status).toBe(200);

      const pubRes = await publishRoute(
        new Request(`http://localhost/api/drafts/${draft.id}/publish`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ durationDays: 7 }),
        }),
        { params: Promise.resolve({ draftId: draft.id }) },
      );
      expect(pubRes.status).toBe(200);
      const { token } = (await pubRes.json()) as { token: string };

      // Clear creator session & storage to simulate recipient browser
      window.sessionStorage.clear();
      vi.mocked(getCreator).mockResolvedValueOnce(undefined);

      const element = await LetterPage({ params: Promise.resolve({ token }) });
      const { unmount } = render(element);
      expect(screen.getByText(`Updated ${layout}`)).toBeInTheDocument();
      unmount();
    }
  });

  it("rejects publishing a corrupted I Miss You draft via publish route", async () => {
    const draft = await mockRepo.createDraft(
      { userId: "u-1", scopeKey: OWNER_KEY },
      { recipientName: "Maya", senderName: "Kabir" },
      { experienceType: "miss-you", content: { recipientName: "", senderName: "" } },
    );

    const res = await publishRoute(
      new Request(`http://localhost/api/drafts/${draft.id}/publish`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ durationDays: 7 }),
      }),
      { params: Promise.resolve({ draftId: draft.id }) },
    );
    expect(res.status).toBe(400);
  });

  it("enforces GET /api/uploads/[assetId] recipient access for published links while hiding unpublished assets", async () => {
    const assetId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
    const draft = await mockRepo.createDraft(
      { userId: "u-1", scopeKey: OWNER_KEY },
      { recipientName: "Maya", senderName: "Kabir" },
      { experienceType: "miss-you", content: null },
    );
    assets.set(assetId, {
      id: assetId,
      apologyId: draft.id,
      state: "uploaded",
      objectKey: `apologies/${draft.id}/${assetId}.webp`,
      kind: "photo",
      contentType: "image/webp",
      sizeBytes: 120_000,
      createdAt: new Date().toISOString(),
      ownerKeyHash: OWNER_KEY,
      apologyStatus: "draft",
      expiresAt: null,
    });

    // Anonymous recipient cannot read unpublished draft asset
    vi.mocked(getCreator).mockResolvedValueOnce(undefined);
    const blockedRes = await assetGetRoute(
      new Request(`http://localhost/api/uploads/${assetId}`),
      { params: Promise.resolve({ assetId }) },
    );
    expect(blockedRes.status).toBe(404);

    // Once published, unauthenticated recipient CAN load the image with private no-store redirect
    await mockRepo.publish(draft.id, OWNER_KEY, 7);
    vi.mocked(getCreator).mockResolvedValueOnce(undefined);
    const liveRes = await assetGetRoute(
      new Request(`http://localhost/api/uploads/${assetId}`),
      { params: Promise.resolve({ assetId }) },
    );
    expect(liveRes.status).toBe(307);
    expect(liveRes.headers.get("Cache-Control")).toBe("private, no-store");
    expect(liveRes.headers.get("Referrer-Policy")).toBe("no-referrer");
  });

  it("supports /preview/[draftId], ManageList routing, and experience reply viewing for miss-you", async () => {
    const draft = await mockRepo.createDraft(
      { userId: "u-1", scopeKey: OWNER_KEY },
      { recipientName: "Maya", senderName: "Kabir" },
      {
        experienceType: "miss-you",
        content: {
          recipientName: "Maya",
          senderName: "Kabir",
          headline: "Late trains",
          distanceNote: "City apart",
          letter: "Missing you every evening.",
          reminders: [],
          themeId: "pressed-violet",
          photoLayout: "polaroid",
          photos: [],
          audio: "none",
        },
      },
    );

    const previewEl = await PreviewPage({ params: Promise.resolve({ draftId: draft.id }) });
    const { unmount: unmountPreview } = render(previewEl);
    expect(screen.getByText("Draft preview")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Edit draft" })).toHaveAttribute(
      "href",
      `/create/miss-you?draftId=${draft.id}`,
    );
    expect(screen.getByText("Late trains")).toBeInTheDocument();
    unmountPreview();

    const manageDraft: ApologyDraft = {
      id: draft.id,
      experienceType: "miss-you",
      content: draft.content,
      recipientName: "Maya",
      senderName: "Kabir",
      situation: "other",
      language: "en",
      messages: { message1: "", message2: "", message3: "", personalNote: "" },
      themeId: "romantic",
      stickerPackId: "cats",
      customization: { audio: { source: "none", volume: 0.6 }, photos: [], memoryStyle: "polaroid" },
      linkDurationDays: 7,
      createdAt: draft.createdAt,
      updatedAt: draft.updatedAt,
      status: "draft",
    };

    render(<ManageList drafts={[manageDraft]} tombstones={[]} pendingDeletionIds={[]} />);
    expect(screen.getByText("Pressed Wildflower · I Miss You · City apart")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Edit" })).toHaveAttribute(
      "href",
      `/create/miss-you?draftId=${draft.id}`,
    );

    render(
      <ResponseViewClient
        response={{
          id: "resp-miss-1",
          apologyId: draft.id,
          responseType: "experience",
          status: "published",
          content: {
            experienceType: "miss-you",
            content: {
              recipientName: "Kabir",
              senderName: "Maya",
              headline: "Missing you too",
              letter: "Counting days right back.",
              themeId: "starlight-distance",
              photoLayout: "postcards",
              photos: [],
              reminders: [],
              audio: "none",
            },
          },
          createdAt: draft.createdAt,
          updatedAt: draft.updatedAt,
          publishedAt: draft.updatedAt,
        }}
        parent={{
          recipientName: "Maya",
          senderName: "Kabir",
          publishedAt: draft.createdAt,
          experienceType: "miss-you",
        }}
        token="resp-tok-miss-1"
      />,
    );
    expect(screen.getByText("Missing you too")).toBeInTheDocument();
  });
});
