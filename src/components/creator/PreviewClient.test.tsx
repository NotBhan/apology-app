import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PreviewClient } from "./PreviewClient";
import { THEMES } from "@/themes/registry";
import type { ApologyDraft } from "@/types/apology";

vi.mock("@/app/create/actions", () => ({
  publishDraftAction: vi.fn(),
}));

// Mock PresentationEngine so we test PreviewClient controls cleanly
vi.mock("@/components/presentation/PresentationEngine", () => ({
  PresentationEngine: () => {
    return (
      <div data-testid="mock-presentation-engine">
        Presentation Engine Mock
      </div>
    );
  },
}));

describe("PreviewClient share and navigation controls", () => {
  const mockDraft: ApologyDraft = {
    id: "draft-test-share-1",
    experienceType: "apology",
    recipientName: "Sam",
    senderName: "Alex",
    situation: "forgot-special",
    language: "en",
    messages: {
      message1: "I am sorry",
      message2: "I messed up",
      message3: "I care about you",
      personalNote: "Let me make it up to you",
    },
    themeId: "romantic",
    stickerPackId: "cats",
    customization: {
      audio: { source: "none", volume: 0.6 },
      photos: [],
      memoryStyle: "polaroid",
    },
    linkDurationDays: 3,
    status: "draft",
    createdAt: "2026-11-20T10:00:00.000Z",
    updatedAt: "2026-11-20T10:00:00.000Z",
  };

  it("links Back to editing directly to step=publish", () => {
    render(<PreviewClient draft={mockDraft} theme={THEMES.romantic} />);
    const backLink = screen.getByRole("link", { name: /Back to editing/i });
    expect(backLink).toHaveAttribute("href", `/create/${mockDraft.id}?step=publish`);
  });

  it("publishes and opens ShareQrDialog when Publish & Share letter is clicked", async () => {
    const user = userEvent.setup();
    const { publishDraftAction } = await import("@/app/create/actions");
    vi.mocked(publishDraftAction).mockResolvedValueOnce({
      ok: true,
      data: {
        token: "tok-share-abc",
        path: "/letter/tok-share-abc",
        expiresAt: "2026-11-28T10:00:00.000Z",
        durationDays: 3,
      },
    });

    render(<PreviewClient draft={mockDraft} theme={THEMES.romantic} />);
    const publishBtn = screen.getByRole("button", { name: /Publish & Share letter/i });
    expect(publishBtn).toBeInTheDocument();

    await user.click(publishBtn);
    expect(publishDraftAction).toHaveBeenCalledWith(mockDraft.id, 3);
    expect(await screen.findByRole("dialog", { name: /Share with QR/i })).toBeInTheDocument();
  });
});
