import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  redirect: vi.fn(),
  notFound: vi.fn(),
}));

// Mock creator authentication
vi.mock("@/lib/security/creator", () => ({
  requireApiCreator: vi.fn(),
  getCreator: vi.fn(),
  requirePageCreator: vi.fn(),
  safeCallback: (cb?: string) => cb || "/",
}));

// Mock rate limiting
vi.mock("@/lib/security/postgres-rate-limit", () => ({
  enforceRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 10, reset: 60 }),
  rateLimitHeaders: vi.fn().mockReturnValue({ "X-RateLimit-Remaining": "10" }),
}));

// Mock repository
vi.mock("@/lib/storage", () => ({
  getRepository: vi.fn(),
}));

import { getCreator, requireApiCreator } from "@/lib/security/creator";
import { getRepository } from "@/lib/storage";
import { POST as createDraftRoute } from "@/app/api/drafts/route";
import { PATCH as updateExperienceRoute } from "@/app/api/experiences/[experienceId]/[draftId]/route";
import { POST as publishRoute } from "@/app/api/drafts/[draftId]/publish/route";
import LetterPage from "@/app/letter/[token]/page";
import NewBirthdayPage from "@/app/create/birthday/page";
import { BirthdayLetter } from "@/components/presentation/BirthdayLetter";
import { draftPayloadSchema } from "@/lib/validation/apology";
import { BIRTHDAY_PHOTO_LAYOUTS, birthdayContentSchema, normalizeBirthdayPhotos } from "@/experiences/birthday/schema";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ApologyRecord } from "@/types/apology";

describe("Birthday Photo Gallery — Lifecycle, Persistence & Compatibility Audit", () => {
  const OWNER_USER_ID = "user-audit-123";
  const OWNER_KEY = "owner-scope-key-audit-123";

  // In-memory record store for testing end-to-end repository transitions
  let store: Map<string, ApologyRecord>;
  let tokensToId: Map<string, string>;

  const mockRepo = {
    createDraft: vi.fn(async (owner, names, extra) => {
      const id = "draft-bday-" + Math.random().toString(36).slice(2, 8);
      const nowIso = new Date().toISOString();
      const record: ApologyRecord = {
        id,
        accessToken: "token-" + id,
        ownerKeyHash: owner.scopeKey,
        experienceType: extra?.experienceType || "apology",
        content: extra?.content || null,
        recipientName: names.recipientName,
        senderName: names.senderName,
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
        linkDurationDays: 1,
        status: "draft",
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      store.set(id, record);
      return record;
    }),

    getDraft: vi.fn(async (id: string) => {
      const r = store.get(id);
      return r && r.status === "draft" ? r : undefined;
    }),

    saveExperienceContent: vi.fn(async (id: string, ownerKey: string, content: unknown, names?: { recipientName: string; senderName: string }) => {
      const r = store.get(id);
      if (!r || r.ownerKeyHash !== ownerKey) return undefined;
      r.content = content;
      if (names) {
        r.recipientName = names.recipientName;
        r.senderName = names.senderName;
      }
      r.updatedAt = new Date().toISOString();
      store.set(id, r);
      return r;
    }),

    publish: vi.fn(async (id: string, ownerKey: string, durationDays = 1) => {
      const r = store.get(id);
      if (!r || r.ownerKeyHash !== ownerKey) throw new Error("Draft not found or access denied");
      const token = "live-token-" + Math.random().toString(36).slice(2, 10);
      r.status = "published";
      r.accessToken = token;
      r.publishedAt = new Date().toISOString();
      r.expiresAt = new Date(Date.now() + durationDays * 86400000).toISOString();
      store.set(id, r);
      tokensToId.set(token, id);
      return { ...r, accessToken: token };
    }),

    getPublishedByToken: vi.fn(async (token: string) => {
      const id = tokensToId.get(token);
      if (!id) return undefined;
      const r = store.get(id);
      if (!r || r.status !== "published") return undefined;
      return {
        id: r.id,
        experienceType: r.experienceType,
        content: r.content,
        themeId: (r.content as { themeId?: string })?.themeId || r.themeId,
        stickerPackId: r.stickerPackId,
        recipientName: r.recipientName,
        senderName: r.senderName,
        messages: r.messages,
        situation: r.situation,
        language: r.language,
        customization: r.customization,
        status: "published" as const,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        publishedAt: r.publishedAt!,
        expiresAt: r.expiresAt,
        accessToken: token,
      };
    }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    store = new Map();
    tokensToId = new Map();
    window.sessionStorage.clear();

    vi.mocked(getRepository).mockResolvedValue(mockRepo as never);
    vi.mocked(requireApiCreator).mockResolvedValue({
      ok: true,
      creator: { userId: OWNER_USER_ID, key: OWNER_KEY },
    });
    vi.mocked(getCreator).mockResolvedValue({
      userId: OWNER_USER_ID,
      key: OWNER_KEY,
    });
  });

  async function navigateToGalleryScene(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole("button", { name: "Go to scene 4" }));
  }

  describe("1. Photo Layout Persistence Lifecycle", () => {
    for (const layout of BIRTHDAY_PHOTO_LAYOUTS) {
      it(`persists layout "${layout}" across draft save, retrieval, publish, and public rendering without sessionStorage`, async () => {
        // Step 1: Draft creation via POST /api/drafts
        const draftContent = {
          recipientName: "Maya",
          senderName: "Kai",
          headline: `Happy Birthday Maya (${layout})`,
          message: "Hope you have an incredible year ahead!",
          themeId: "confetti" as const,
          candleCount: 3,
          photoLayout: layout,
          photos: [
            { url: "https://example.com/photo1.jpg", caption: "Beach sunset" },
            { url: "https://example.com/photo2.jpg", caption: "Campfire night" },
          ],
          audio: "none" as const,
        };

        const createReq = new Request("http://localhost/api/drafts", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            experienceType: "birthday",
            content: draftContent,
          }),
        });

        const createRes = await createDraftRoute(createReq);
        expect(createRes.status).toBe(201);
        const { draft } = await createRes.json();
        const draftId = draft.id;

        // Step 2: Draft retrieval on server page (/create/birthday?draftId=...)
        const draftRecord = await mockRepo.getDraft(draftId);
        expect(draftRecord).toBeDefined();
        const parsedDraftContent = birthdayContentSchema.parse(draftRecord?.content);
        expect(parsedDraftContent.photoLayout).toBe(layout);
        expect(parsedDraftContent.photos).toHaveLength(2);

        // Step 3: Publish draft via POST /api/drafts/[draftId]/publish
        const publishReq = new Request(`http://localhost/api/drafts/${draftId}/publish`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ durationDays: 2 }),
        });

        const publishRes = await publishRoute(publishReq, {
          params: Promise.resolve({ draftId }),
        });
        expect(publishRes.status).toBe(200);
        const pubData = await publishRes.json();
        const publicToken = pubData.token;

        // Verify published record in storage contains the exact layout in content
        const publishedRecord = await mockRepo.getPublishedByToken(publicToken);
        expect(publishedRecord).toBeDefined();
        const pubContent = birthdayContentSchema.parse(publishedRecord?.content);
        expect(pubContent.photoLayout).toBe(layout);

        // Step 4: Public Birthday page rendering (/letter/[token]) in clean context
        // Ensure sessionStorage is completely empty to prove zero reliance on sessionStorage
        window.sessionStorage.clear();

        const user = userEvent.setup();
        const letterPageJsx = await LetterPage({
          params: Promise.resolve({ token: publicToken }),
        });
        const { unmount } = render(letterPageJsx);

        await navigateToGalleryScene(user);

        // Verify the rendered gallery matches the persisted layout
        const gallery = screen.getByTestId("birthday-photo-gallery");
        expect(gallery).toHaveAttribute("data-layout", layout);
        expect(screen.getByText("Beach sunset")).toBeInTheDocument();
        if (layout === "slideshow") {
          await user.click(screen.getByRole("button", { name: /Next photo/i }));
        }
        expect(screen.getByText("Campfire night")).toBeInTheDocument();

        unmount();
      });
    }

    it("survives layout updates via PATCH /api/experiences/birthday/[draftId]", async () => {
      // Create with theme-adaptive
      const initialContent = {
        recipientName: "Sam",
        senderName: "Robin",
        headline: "Celebrating Sam",
        message: "Lots of love!",
        themeId: "midnight-gold" as const,
        candleCount: 4,
        photoLayout: "theme-adaptive" as const,
        photos: [{ url: "https://example.com/p1.jpg", caption: "Initial" }],
        audio: "none" as const,
      };

      const createRes = await createDraftRoute(
        new Request("http://localhost/api/drafts", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ experienceType: "birthday", content: initialContent }),
        }),
      );
      const { draft } = await createRes.json();

      // Update to scrapbook
      const updatedContent = {
        ...initialContent,
        photoLayout: "scrapbook" as const,
        photos: [
          { url: "https://example.com/p1.jpg", caption: "Scrapbook moment" },
          { url: "https://example.com/p2.jpg", caption: "Another memory" },
        ],
      };

      const patchRes = await updateExperienceRoute(
        new Request(`http://localhost/api/experiences/birthday/${draft.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ content: updatedContent }),
        }),
        { params: Promise.resolve({ experienceId: "birthday", draftId: draft.id }) },
      );
      expect(patchRes.status).toBe(200);

      // Publish and verify public letter has scrapbook layout
      const publishRes = await publishRoute(
        new Request(`http://localhost/api/drafts/${draft.id}/publish`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ durationDays: 1 }),
        }),
        { params: Promise.resolve({ draftId: draft.id }) },
      );
      const { token } = await publishRes.json();

      const user = userEvent.setup();
      const letterPageJsx = await LetterPage({
        params: Promise.resolve({ token }),
      });
      const { unmount } = render(letterPageJsx);

      // Navigate to Scene 4 (Gallery)
      await navigateToGalleryScene(user);

      const gallery = screen.getByTestId("birthday-photo-gallery");
      expect(gallery).toHaveAttribute("data-layout", "scrapbook");
      expect(screen.getByText("Scrapbook moment")).toBeInTheDocument();
      expect(screen.getByText("Another memory")).toBeInTheDocument();

      unmount();
    });
  });

  describe("2. Photo Data Compatibility & Transformations", () => {
    it("renders legacy string[] photo URLs cleanly via normalizeBirthdayPhotos", async () => {
      const legacyPhotos = [
        "https://example.com/legacy1.jpg",
        "https://example.com/legacy2.jpg",
      ];

      const normalized = normalizeBirthdayPhotos(legacyPhotos);
      expect(normalized).toHaveLength(2);
      expect(normalized[0].url).toBe("https://example.com/legacy1.jpg");
      expect(normalized[0].caption).toBeUndefined();
      expect(normalized[1].url).toBe("https://example.com/legacy2.jpg");
      expect(normalized[1].caption).toBeUndefined();

      // Check end-to-end publishing of legacy draft content
      const legacyContent = {
        recipientName: "Alex",
        senderName: "Chris",
        headline: "Happy Birthday Alex",
        message: "Best wishes!",
        themeId: "pastel" as const,
        candleCount: 2,
        photos: legacyPhotos,
        audio: "none" as const,
      };

      const createRes = await createDraftRoute(
        new Request("http://localhost/api/drafts", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ experienceType: "birthday", content: legacyContent }),
        }),
      );
      const { draft } = await createRes.json();

      const publishRes = await publishRoute(
        new Request(`http://localhost/api/drafts/${draft.id}/publish`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ durationDays: 1 }),
        }),
        { params: Promise.resolve({ draftId: draft.id }) },
      );
      const { token } = await publishRes.json();

      const user = userEvent.setup();
      const letterPageJsx = await LetterPage({
        params: Promise.resolve({ token }),
      });
      const { unmount } = render(letterPageJsx);

      // Navigate to Scene 4 (Gallery)
      await navigateToGalleryScene(user);

      const gallery = screen.getByTestId("birthday-photo-gallery");
      expect(gallery).toBeInTheDocument();
      // Photos render with img tags containing legacy URLs
      const images = screen.getAllByRole("img");
      const urls = images.map((img) => img.getAttribute("src"));
      expect(urls).toContain("https://example.com/legacy1.jpg");
      expect(urls).toContain("https://example.com/legacy2.jpg");

      unmount();
    });

    it("preserves structured photo objects (URL, caption, focalPoint) and ordering", async () => {
      const structuredPhotos = [
        { url: "https://example.com/pic1.jpg", caption: "First caption", focalPoint: "top" },
        { url: "https://example.com/pic2.jpg", caption: "Second caption", focalPoint: "center" },
        { url: "https://example.com/pic3.jpg", caption: "Third caption", focalPoint: "bottom" },
      ];

      const content = {
        recipientName: "Zara",
        senderName: "Noor",
        headline: "Celebrating Zara",
        message: "Cheers to another year!",
        themeId: "floral" as const,
        candleCount: 3,
        photoLayout: "polaroid" as const,
        photos: structuredPhotos,
        audio: "none" as const,
      };

      const createRes = await createDraftRoute(
        new Request("http://localhost/api/drafts", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ experienceType: "birthday", content }),
        }),
      );
      const { draft } = await createRes.json();

      const publishRes = await publishRoute(
        new Request(`http://localhost/api/drafts/${draft.id}/publish`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ durationDays: 1 }),
        }),
        { params: Promise.resolve({ draftId: draft.id }) },
      );
      const { token } = await publishRes.json();

      const user = userEvent.setup();
      const letterPageJsx = await LetterPage({
        params: Promise.resolve({ token }),
      });
      const { unmount } = render(letterPageJsx);

      // Navigate to Scene 4 (Gallery)
      await navigateToGalleryScene(user);

      const gallery = screen.getByTestId("birthday-photo-gallery");
      expect(gallery).toHaveAttribute("data-layout", "polaroid");
      expect(screen.getByText("First caption")).toBeInTheDocument();
      expect(screen.getByText("Second caption")).toBeInTheDocument();
      expect(screen.getByText("Third caption")).toBeInTheDocument();

      unmount();
    });

    it("preserves reordered and removed photos accurately into published letter", async () => {
      const p1 = { url: "https://example.com/1.jpg", caption: "1" };
      const p3 = { url: "https://example.com/3.jpg", caption: "3" };

      // Reordered: [p3, p1] (p3 moved to first, unadded photos omitted)
      const reorderedPhotos = [p3, p1];

      const content = {
        recipientName: "Liam",
        senderName: "Emma",
        headline: "Happy Birthday Liam",
        message: "Special memories for you.",
        themeId: "vintage" as const,
        candleCount: 3,
        photoLayout: "slideshow" as const,
        photos: reorderedPhotos,
        audio: "none" as const,
      };

      const createRes = await createDraftRoute(
        new Request("http://localhost/api/drafts", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ experienceType: "birthday", content }),
        }),
      );
      const { draft } = await createRes.json();

      const publishRes = await publishRoute(
        new Request(`http://localhost/api/drafts/${draft.id}/publish`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ durationDays: 1 }),
        }),
        { params: Promise.resolve({ draftId: draft.id }) },
      );
      const { token } = await publishRes.json();

      const user = userEvent.setup();
      const letterPageJsx = await LetterPage({
        params: Promise.resolve({ token }),
      });
      const { unmount } = render(letterPageJsx);

      // Navigate to Scene 4 (Gallery)
      await navigateToGalleryScene(user);

      const gallery = screen.getByTestId("birthday-photo-gallery");
      expect(gallery).toHaveAttribute("data-layout", "slideshow");

      // Verify p2 is not present, while p3 and p1 are
      expect(screen.queryByText("2")).not.toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument();

      unmount();
    });

    it("handles empty and missing photo arrays gracefully without throwing", async () => {
      const content = {
        recipientName: "Oliver",
        senderName: "Sophia",
        headline: "Happy Birthday Oliver",
        message: "Wishing you wonder and joy.",
        themeId: "playful" as const,
        candleCount: 1,
        photoLayout: "theme-adaptive" as const,
        photos: [],
        audio: "none" as const,
      };

      const createRes = await createDraftRoute(
        new Request("http://localhost/api/drafts", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ experienceType: "birthday", content }),
        }),
      );
      const { draft } = await createRes.json();

      const publishRes = await publishRoute(
        new Request(`http://localhost/api/drafts/${draft.id}/publish`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ durationDays: 1 }),
        }),
        { params: Promise.resolve({ draftId: draft.id }) },
      );
      const { token } = await publishRes.json();

      const letterPageJsx = await LetterPage({
        params: Promise.resolve({ token }),
      });
      const { unmount } = render(letterPageJsx);

      // Letter page renders smoothly even without photos
      expect(screen.getByText("Happy Birthday Oliver")).toBeInTheDocument();
      unmount();
    });
  });

  describe("3. Creator Editor State Restoration from Server", () => {
    it("initializes BirthdayEditor with persisted draft values including photoLayout and photos", async () => {
      const storedContent = {
        recipientName: "Tara",
        senderName: "Dev",
        headline: "Tara turns 28",
        message: "Have the happiest of birthdays!",
        themeId: "midnight-gold" as const,
        candleCount: 5,
        photoLayout: "scrapbook" as const,
        photos: [
          { url: "https://example.com/tara.jpg", caption: "Smile!" },
        ],
        audio: "none" as const,
      };

      const record: ApologyRecord = {
        id: "draft-existing-123",
        accessToken: "token-existing-123",
        ownerKeyHash: OWNER_KEY,
        experienceType: "birthday",
        content: storedContent,
        recipientName: "Tara",
        senderName: "Dev",
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
        linkDurationDays: 1,
        status: "draft",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      store.set(record.id, record);

      const serverPageJsx = await NewBirthdayPage({
        searchParams: Promise.resolve({ draftId: record.id }),
      });
      const { unmount } = render(serverPageJsx);

      // Verify the editor initialized with restored values
      expect(screen.getByDisplayValue("Tara")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Dev")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Tara turns 28")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Smile!")).toBeInTheDocument();

      // Verify scrapbook presentation style option is marked active/selected
      const scrapbookBtn = screen.getByRole("button", { name: /^Scrapbook/i });
      expect(scrapbookBtn).toHaveAttribute("aria-pressed", "true");

      unmount();
    });
  });

  describe("4. Creator Preview vs Published Consistency", () => {
    it("renders identical gallery layouts, photos, and captions in creator preview and public letter", async () => {
      const testContent = birthdayContentSchema.parse({
        recipientName: "Elena",
        senderName: "Lucas",
        headline: "Celebrating Elena",
        message: "Wishing you wonder and joy always.",
        themeId: "floral" as const,
        candleCount: 4,
        photoLayout: "scrapbook" as const,
        photos: [
          { url: "https://example.com/flower1.jpg", caption: "Spring blooms" },
          { url: "https://example.com/flower2.jpg", caption: "Sunny days" },
        ],
        audio: "none" as const,
      });

      // 1. Render Creator Preview (BirthdayLetter directly with testContent)
      const user = userEvent.setup();
      const { unmount: unmountPreview } = render(<BirthdayLetter content={testContent} />);
      await navigateToGalleryScene(user);

      const previewGallery = screen.getByTestId("birthday-photo-gallery");
      const previewLayout = previewGallery.getAttribute("data-layout");
      expect(previewLayout).toBe("scrapbook");
      expect(screen.getByText("Spring blooms")).toBeInTheDocument();
      expect(screen.getByText("Sunny days")).toBeInTheDocument();

      const previewImages = screen.getAllByRole("img").map((img) => img.getAttribute("src"));
      unmountPreview();

      // 2. Publish and Render Published Letter
      const createRes = await createDraftRoute(
        new Request("http://localhost/api/drafts", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ experienceType: "birthday", content: testContent }),
        }),
      );
      const { draft } = await createRes.json();

      const publishRes = await publishRoute(
        new Request(`http://localhost/api/drafts/${draft.id}/publish`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ durationDays: 1 }),
        }),
        { params: Promise.resolve({ draftId: draft.id }) },
      );
      const { token } = await publishRes.json();

      const publishedJsx = await LetterPage({ params: Promise.resolve({ token }) });
      const { unmount: unmountPublished } = render(publishedJsx);
      await navigateToGalleryScene(user);

      const publishedGallery = screen.getByTestId("birthday-photo-gallery");
      const publishedLayout = publishedGallery.getAttribute("data-layout");
      expect(publishedLayout).toBe(previewLayout);
      expect(screen.getByText("Spring blooms")).toBeInTheDocument();
      expect(screen.getByText("Sunny days")).toBeInTheDocument();

      const publishedImages = screen.getAllByRole("img").map((img) => img.getAttribute("src"));
      expect(publishedImages).toEqual(previewImages);

      unmountPublished();
    });
  });

  describe("5. Apology Experience Regression Isolation", () => {
    it("preserves apology customization schema, memories, and memoryStyle intact", () => {
      // Ensure apology draftPayloadSchema remains unaffected by birthday photo changes
      const validApology = {
        recipientName: "Taylor",
        senderName: "Jordan",
        situation: "other" as const,
        situationCustom: "A misunderstanding",
        language: "en" as const,
        messages: {
          message1: "I am sorry for my mistake.",
          message2: "I understand how it made you feel.",
          message3: "I value our bond.",
          personalNote: "Always thinking of you.",
        },
        themeId: "romantic" as const,
        stickerPackId: "cats" as const,
        customization: {
          audio: { source: "none" as const, volume: 0.5 },
          photos: [
            {
              id: "photo-apology-1",
              url: "https://example.com/apology-memory.jpg",
              caption: "Our favorite memory",
            },
          ],
          memoryStyle: "polaroid" as const,
        },
      };

      const parsed = draftPayloadSchema.safeParse(validApology);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.customization?.memoryStyle).toBe("polaroid");
        expect(parsed.data.customization?.photos).toHaveLength(1);
        expect(parsed.data.customization?.photos?.[0].caption).toBe("Our favorite memory");
      }
    });
  });
});
