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
      expiresAt: "2026-11-28",
      durationDays: 3,
    }),
    uploadAudio: vi.fn(),
    uploadPhoto: vi.fn(),
  };

  it("loads at step 6 (Publish) when initialStep=6 is passed", () => {
    render(<Wizard initialDraft={mockDraft} gateway={mockGateway} initialStep={6} />);
    expect(screen.getByText("07 · Publish")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Publish for/i })).toBeInTheDocument();
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
});
