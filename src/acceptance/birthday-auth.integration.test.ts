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
import NewBirthdayPage from "@/app/create/birthday/page";
import { jsonError } from "@/lib/api/responses";
import { render, screen } from "@testing-library/react";

describe("Birthday Experience — Auth & Authorization Integration", () => {
  const mockRepo = {
    getDraft: vi.fn(),
    createDraft: vi.fn(),
    saveExperienceContent: vi.fn(),
  };

  const validBirthdayContent = {
    recipientName: "Meera",
    senderName: "Kabir",
    headline: "Happy 25th Birthday",
    message: "Wishing you love and happiness always.",
    themeId: "confetti",
    candleCount: 5,
    photoLayout: "theme-adaptive" as const,
    photos: [],
    audio: "none",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    vi.mocked(getRepository).mockResolvedValue(mockRepo as never);
  });

  describe("Server Page (NewBirthdayPage) session-to-creator resolution", () => {
    it("renders authenticated subtitle and hides sign-in CTA when creator is logged in", async () => {
      vi.mocked(getCreator).mockResolvedValue({
        userId: "user-456",
        key: "owner-scope-key-456",
      });

      const jsx = await NewBirthdayPage();
      render(jsx);

      expect(
        screen.getByText("Save as draft to your account anytime, or publish when ready."),
      ).toBeInTheDocument();
      expect(
        screen.queryByText("Start now — nothing is saved until you sign in to publish."),
      ).not.toBeInTheDocument();
      // Top header sign in link is not rendered
      expect(screen.queryByRole("link", { name: /^sign in$/i })).not.toBeInTheDocument();
      // Birthday editor displays authenticated status
      expect(screen.getByTestId("auth-status-signed-in")).toBeInTheDocument();
    });

    it("renders unauthenticated subtitle and shows sign-in CTA when creator is not logged in", async () => {
      vi.mocked(getCreator).mockResolvedValue(undefined);

      const jsx = await NewBirthdayPage();
      render(jsx);

      expect(
        screen.getByText("Start now — nothing is saved until you sign in to publish."),
      ).toBeInTheDocument();
      expect(
        screen.queryByText("Save as draft to your account anytime, or publish when ready."),
      ).not.toBeInTheDocument();
      // Top header sign in link is rendered
      expect(screen.getByRole("link", { name: /^sign in$/i })).toBeInTheDocument();
      // Birthday editor displays sign-in link
      expect(screen.getByTestId("auth-status-sign-in")).toBeInTheDocument();
    });

    it("loads existing birthday draft when draftId is in searchParams for owner", async () => {
      const creator = {
        userId: "user-456",
        key: "owner-scope-key-456",
      };
      vi.mocked(getCreator).mockResolvedValue(creator);

      mockRepo.getDraft.mockResolvedValue({
        id: "draft-bday-existing",
        ownerKeyHash: creator.key,
        experienceType: "birthday",
        content: validBirthdayContent,
        recipientName: "Meera",
        senderName: "Kabir",
        status: "draft",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const jsx = await NewBirthdayPage({
        searchParams: Promise.resolve({ draftId: "draft-bday-existing" }),
      });
      render(jsx);

      expect(mockRepo.getDraft).toHaveBeenCalledWith("draft-bday-existing");
      expect(screen.getByDisplayValue("Meera")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Kabir")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Happy 25th Birthday")).toBeInTheDocument();
    });
  });

  describe("API draft creation and saving authorization", () => {
    it("rejects unauthenticated POST /api/drafts with 401", async () => {
      vi.mocked(requireApiCreator).mockResolvedValue({
        ok: false,
        response: jsonError(401, "Sign in to continue."),
      });

      const req = new Request("http://localhost/api/drafts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          experienceType: "birthday",
          content: validBirthdayContent,
        }),
      });

      const res = await createDraftRoute(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe("Sign in to continue.");
      expect(mockRepo.createDraft).not.toHaveBeenCalled();
    });

    it("accepts authenticated POST /api/drafts and persists birthday experienceType", async () => {
      const creator = {
        userId: "user-456",
        key: "owner-scope-key-456",
      };
      vi.mocked(requireApiCreator).mockResolvedValue({
        ok: true,
        creator,
      });

      mockRepo.createDraft.mockResolvedValue({
        id: "draft-bday-created",
        ownerKeyHash: creator.key,
        experienceType: "birthday",
        content: validBirthdayContent,
        recipientName: "Meera",
        senderName: "Kabir",
        status: "draft",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const req = new Request("http://localhost/api/drafts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          experienceType: "birthday",
          content: validBirthdayContent,
        }),
      });

      const res = await createDraftRoute(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.draft.id).toBe("draft-bday-created");
      expect(data.draft.experienceType).toBe("birthday");
      expect(mockRepo.createDraft).toHaveBeenCalledWith(
        { userId: "user-456", scopeKey: creator.key, legacyKey: undefined },
        { recipientName: "Meera", senderName: "Kabir" },
        { experienceType: "birthday", content: validBirthdayContent },
      );
    });

    it("allows updating an existing birthday draft via PATCH /api/experiences/birthday/[draftId]", async () => {
      const creator = {
        userId: "user-456",
        key: "owner-scope-key-456",
      };
      vi.mocked(requireApiCreator).mockResolvedValue({
        ok: true,
        creator,
      });

      const updatedContent = {
        ...validBirthdayContent,
        headline: "Happy 26th Birthday Meera!",
      };

      mockRepo.saveExperienceContent.mockResolvedValue({
        id: "draft-bday-created",
        ownerKeyHash: creator.key,
        experienceType: "birthday",
        content: updatedContent,
        recipientName: "Meera",
        senderName: "Kabir",
        status: "draft",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const req = new Request("http://localhost/api/experiences/birthday/draft-bday-created", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: updatedContent }),
      });

      const res = await updateExperienceRoute(req, {
        params: Promise.resolve({ experienceId: "birthday", draftId: "draft-bday-created" }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.draft.experienceType).toBe("birthday");
      expect(mockRepo.saveExperienceContent).toHaveBeenCalledWith(
        "draft-bday-created",
        creator.key,
        updatedContent,
        { recipientName: "Meera", senderName: "Kabir" },
      );
    });
  });
});
