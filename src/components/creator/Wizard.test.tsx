import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Wizard, type WizardGateway } from "./Wizard";
import type { ApologyDraft } from "@/types/apology";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe("Wizard navigation and initialStep", () => {
  const mockDraft: ApologyDraft = {
    id: "draft-wizard-1",
    experienceType: "apology",
    recipientName: "Taylor",
    senderName: "Jordan",
    situation: "said-hurtful",
    language: "en",
    messages: {
      message1: "I'm sorry",
      message2: "My apologies",
      message3: "I value you",
      personalNote: "Let's talk",
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

  const mockGateway: WizardGateway = {
    save: vi.fn().mockResolvedValue(mockDraft),
    publish: vi.fn().mockResolvedValue({
      token: "tok-1",
      path: "/letter/tok-1",
    }),
    uploadAudio: vi.fn(),
    uploadPhoto: vi.fn(),
  };

  it("loads at step 6 (Publish) when initialStep=6 is passed", () => {
    render(<Wizard initialDraft={mockDraft} gateway={mockGateway} initialStep={6} />);
    expect(screen.getByText("07 · Publish")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Publish & get link/i })).toBeInTheDocument();
  });

  it("navigates directly to another step when step rail button is clicked", async () => {
    const user = userEvent.setup();
    render(<Wizard initialDraft={mockDraft} gateway={mockGateway} initialStep={0} />);

    expect(screen.getByText("01 · Names")).toBeInTheDocument();

    const jumpToThemeBtn = screen.getByRole("button", { name: /Jump to step 4: Theme/i });
    await user.click(jumpToThemeBtn);

    expect(screen.getByText("04 · Theme")).toBeInTheDocument();
  });

  it("navigates to publish when 'Skip to publish' is clicked", async () => {
    const user = userEvent.setup();
    render(<Wizard initialDraft={mockDraft} gateway={mockGateway} initialStep={0} />);

    const skipBtn = screen.getByRole("button", { name: /Skip to publish →/i });
    await user.click(skipBtn);

    expect(screen.getByText("07 · Publish")).toBeInTheDocument();
  });

  it("blocks publish and jumps to incomplete required step instead of calling publish gateway", async () => {
    const user = userEvent.setup();
    const publishFn = vi.fn();
    render(
      <Wizard
        initialDraft={{
          ...mockDraft,
          messages: { message1: "", message2: "", message3: "", personalNote: "" },
        }}
        gateway={{ ...mockGateway, publish: publishFn }}
        initialStep={6}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Publish & get link/i }));
    expect(publishFn).not.toHaveBeenCalled();
    expect(screen.getByText("03 · Words")).toBeInTheDocument();
  });

  it("hides manage link and opens inline preview when in response mode", async () => {
    const user = userEvent.setup();
    render(
      <Wizard
        initialDraft={{ ...mockDraft, id: "reply-draft" }}
        gateway={mockGateway}
        initialStep={6}
        isResponse
      />,
    );

    expect(screen.queryByRole("link", { name: /All letters/i })).not.toBeInTheDocument();
    expect(screen.getByText("Private response")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Preview the experience/i }));
    expect(screen.getByRole("dialog", { name: /Experience preview/i })).toBeInTheDocument();
  });

  it("never calls deleteAsset when removing a photo from an already-published letter", async () => {
    const user = userEvent.setup();
    const deleteAsset = vi.fn().mockResolvedValue(undefined);
    const publishedDraft: ApologyDraft = {
      ...mockDraft,
      status: "published",
      publishedAt: "2026-11-21T10:00:00.000Z",
      customization: {
        audio: { source: "default", volume: 0.5 },
        photos: [{ id: "photo-pub-1", url: "/api/uploads/photo-pub-1", caption: "Live" }],
        memoryStyle: "polaroid",
      },
    };

    render(
      <Wizard
        initialDraft={publishedDraft}
        gateway={{ ...mockGateway, deleteAsset }}
        initialStep={5}
      />,
    );

    await user.click(screen.getByRole("tab", { name: "Photos" }));
    await user.click(screen.getByRole("button", { name: "Remove" }));
    expect(deleteAsset).not.toHaveBeenCalled();
  });

  it("calls deleteAsset when removing an uploaded photo from an unpublished draft", async () => {
    const user = userEvent.setup();
    const deleteAsset = vi.fn().mockResolvedValue(undefined);
    const draftWithPhoto: ApologyDraft = {
      ...mockDraft,
      status: "draft",
      customization: {
        audio: { source: "default", volume: 0.5 },
        photos: [{ id: "photo-draft-1", url: "/api/uploads/photo-draft-1", caption: "Draft" }],
        memoryStyle: "polaroid",
      },
    };

    render(
      <Wizard
        initialDraft={draftWithPhoto}
        gateway={{ ...mockGateway, deleteAsset }}
        initialStep={5}
      />,
    );

    await user.click(screen.getByRole("tab", { name: "Photos" }));
    await user.click(screen.getByRole("button", { name: "Remove" }));
    expect(deleteAsset).toHaveBeenCalledWith(mockDraft.id, "photo-draft-1");
  });
});
