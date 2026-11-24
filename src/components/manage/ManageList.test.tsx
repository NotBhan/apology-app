import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ManageList } from "./ManageList";
import type { ApologyDraft } from "@/types/apology";
import type { PublishedResponse } from "@/types/response";

vi.mock("@/app/create/actions", () => ({
  deleteDraftAction: vi.fn(),
  publishDraftAction: vi.fn(),
  revokeDraftAction: vi.fn(),
}));

describe("ManageList response resolution", () => {
  const apologyDraft: ApologyDraft = {
    id: "draft-apology-1",
    experienceType: "apology",
    recipientName: "Riya",
    senderName: "Aarav",
    situation: "said-hurtful",
    language: "en",
    messages: {
      message1: "I'm sorry",
      message2: "I know I hurt you",
      message3: "You matter to me",
      personalNote: "Please forgive me",
    },
    themeId: "romantic",
    stickerPackId: "cats",
    customization: {
      audio: { source: "none", volume: 0.6 },
      photos: [],
      memoryStyle: "polaroid",
    },
    linkDurationDays: 3,
    status: "published",
    createdAt: "2026-11-18T10:00:00.000Z",
    updatedAt: "2026-11-18T10:00:00.000Z",
    publishedAt: "2026-11-18T10:00:00.000Z",
    expiresAt: "2026-11-21T10:00:00.000Z",
  };

  const birthdayDraft: ApologyDraft = {
    ...apologyDraft,
    id: "draft-birthday-2",
    experienceType: "birthday",
    recipientName: "Meera",
    senderName: "Kabir",
  };

  const apologyResponse: PublishedResponse = {
    id: "resp-1",
    apologyId: "draft-apology-1",
    responseType: "quick",
    publicToken: "tok-1",
    status: "published",
    content: {
      message: "I accept your apology.",
      recipientEmotion: "forgive",
    },
    publishedAt: "2026-11-19T10:00:00.000Z",
    createdAt: "2026-11-19T10:00:00.000Z",
    updatedAt: "2026-11-19T10:00:00.000Z",
  };

  const birthdayResponse: PublishedResponse = {
    id: "resp-2",
    apologyId: "draft-birthday-2",
    responseType: "quick",
    publicToken: "tok-2",
    status: "published",
    content: {
      message: "Thank you for the warm wish!",
      recipientEmotion: "grateful",
    },
    publishedAt: "2026-11-19T10:00:00.000Z",
    createdAt: "2026-11-19T10:00:00.000Z",
    updatedAt: "2026-11-19T10:00:00.000Z",
  };

  it("displays apology response with resolved Feeling badge", async () => {
    const user = userEvent.setup();
    render(
      <ManageList
        drafts={[apologyDraft]}
        tombstones={[]}
        pendingDeletionIds={[]}
        responsesByApology={{ [apologyDraft.id]: [apologyResponse] }}
      />,
    );

    const toggleBtn = screen.getByRole("button", { name: /Replies \(1\)/i });
    await user.click(toggleBtn);

    expect(screen.getByText("Feeling: I forgive you")).toBeInTheDocument();
    expect(screen.getByText("I accept your apology.")).toBeInTheDocument();
  });

  it("displays birthday response with resolved Vibe badge", async () => {
    const user = userEvent.setup();
    render(
      <ManageList
        drafts={[birthdayDraft]}
        tombstones={[]}
        pendingDeletionIds={[]}
        responsesByApology={{ [birthdayDraft.id]: [birthdayResponse] }}
      />,
    );

    const toggleBtn = screen.getByRole("button", { name: /Replies \(1\)/i });
    await user.click(toggleBtn);

    expect(screen.getByText("Vibe: So grateful")).toBeInTheDocument();
    expect(screen.getByText("Thank you for the warm wish!")).toBeInTheDocument();
  });

  it("safely handles legacy records without experienceType defaulting to Apology", async () => {
    const user = userEvent.setup();
    const legacyDraft: ApologyDraft = {
      ...apologyDraft,
      id: "draft-legacy-3",
      experienceType: undefined,
    };

    render(
      <ManageList
        drafts={[legacyDraft]}
        tombstones={[]}
        pendingDeletionIds={[]}
        responsesByApology={{ [legacyDraft.id]: [apologyResponse] }}
      />,
    );

    const toggleBtn = screen.getByRole("button", { name: /Replies \(1\)/i });
    await user.click(toggleBtn);

    expect(screen.getByText("Feeling: I forgive you")).toBeInTheDocument();
    expect(screen.getByText("I accept your apology.")).toBeInTheDocument();
  });

  it("renders unknown experience response emotion without prefix", async () => {
    const user = userEvent.setup();
    const unknownDraft: ApologyDraft = {
      ...apologyDraft,
      id: "draft-unknown-4",
      experienceType: "custom-unknown-module",
    };
    const unknownResponse: PublishedResponse = {
      ...apologyResponse,
      id: "resp-unknown-4",
      content: {
        message: "Unique reply text",
        recipientEmotion: "Touched",
      },
    };

    render(
      <ManageList
        drafts={[unknownDraft]}
        tombstones={[]}
        pendingDeletionIds={[]}
        responsesByApology={{ [unknownDraft.id]: [unknownResponse] }}
      />,
    );

    const toggleBtn = screen.getByRole("button", { name: /Replies \(1\)/i });
    await user.click(toggleBtn);

    expect(screen.getByText("Touched")).toBeInTheDocument();
    expect(screen.queryByText(/Feeling/i)).not.toBeInTheDocument();
    expect(screen.getByText("Unique reply text")).toBeInTheDocument();
  });

  it("sets aria-expanded and aria-controls on replies toggle button", async () => {
    const user = userEvent.setup();
    render(
      <ManageList
        drafts={[apologyDraft]}
        tombstones={[]}
        pendingDeletionIds={[]}
        responsesByApology={{ [apologyDraft.id]: [apologyResponse] }}
      />,
    );

    const toggleBtn = screen.getByRole("button", { name: /Replies \(1\)/i });
    expect(toggleBtn).toHaveAttribute("aria-expanded", "false");
    expect(toggleBtn).toHaveAttribute("aria-controls", `replies-list-${apologyDraft.id}`);

    await user.click(toggleBtn);
    expect(toggleBtn).toHaveAttribute("aria-expanded", "true");

    const repliesContainer = document.getElementById(`replies-list-${apologyDraft.id}`);
    expect(repliesContainer).toBeInTheDocument();
  });

  it("displays experience replies with Experience Reply badge and content", async () => {
    const user = userEvent.setup();
    const expResponse: PublishedResponse = {
      id: "resp-exp-1",
      apologyId: apologyDraft.id,
      responseType: "experience",
      status: "published",
      content: {
        experienceType: "birthday",
        content: {
          recipientName: apologyDraft.senderName,
          senderName: apologyDraft.recipientName,
          headline: "Happy Birthday Friend!",
          message: "Celebrating you with all my heart.",
        },
      },
      publishedAt: "2026-11-19T10:00:00.000Z",
      createdAt: "2026-11-19T10:00:00.000Z",
      updatedAt: "2026-11-19T10:00:00.000Z",
    };

    render(
      <ManageList
        drafts={[apologyDraft]}
        tombstones={[]}
        pendingDeletionIds={[]}
        responsesByApology={{ [apologyDraft.id]: [expResponse] }}
      />,
    );

    const toggleBtn = screen.getByRole("button", { name: /Replies \(1\)/i });
    await user.click(toggleBtn);

    expect(screen.getByText("Experience Reply: Birthday")).toBeInTheDocument();
    expect(screen.getByText("Happy Birthday Friend!")).toBeInTheDocument();
  });
});
