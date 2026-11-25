import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ResponseViewClient } from "./ResponseViewClient";
import type { PublishedResponse } from "@/types/response";

describe("ResponseViewClient", () => {
  const baseResponse: PublishedResponse = {
    id: "resp-1",
    apologyId: "apol-1",
    responseType: "quick",
    publicToken: "token-123",
    status: "published",
    content: {
      message: "Thank you for saying this.",
      recipientEmotion: "forgive",
      photos: [],
    },
    publishedAt: "2026-11-19T10:00:00.000Z",
    createdAt: "2026-11-19T10:00:00.000Z",
    updatedAt: "2026-11-19T10:00:00.000Z",
  };

  const baseParent = {
    recipientName: "Riya",
    senderName: "Aarav",
    publishedAt: "2026-11-18T10:00:00.000Z",
    experienceType: "apology",
  };

  it("renders apology response with resolved emotion badge", () => {
    render(
      <ResponseViewClient
        response={baseResponse}
        parent={baseParent}
        token="token-123"
      />,
    );

    expect(screen.getByText("In response to")).toBeInTheDocument();
    expect(screen.getByText("Aarav")).toBeInTheDocument();
    expect(screen.getByText("Feeling:")).toBeInTheDocument();
    expect(screen.getByText("I forgive you")).toBeInTheDocument();
    expect(screen.getByText("Thank you for saying this.")).toBeInTheDocument();
  });

  it("renders birthday response with resolved Vibe emotion badge", () => {
    const bdayResponse: PublishedResponse = {
      ...baseResponse,
      content: {
        message: "Thank you so much!",
        recipientEmotion: "grateful",
        photos: [],
      },
    };

    render(
      <ResponseViewClient
        response={bdayResponse}
        parent={{ ...baseParent, experienceType: "birthday" }}
        token="token-123"
      />,
    );

    expect(screen.getByText("Vibe:")).toBeInTheDocument();
    expect(screen.getByText("So grateful")).toBeInTheDocument();
  });

  it("renders legacy emotion string as label with Feeling prefix", () => {
    const legacyResponse: PublishedResponse = {
      ...baseResponse,
      content: {
        message: "I appreciate it.",
        recipientEmotion: "Warm",
        photos: [],
      },
    };

    render(
      <ResponseViewClient
        response={legacyResponse}
        parent={{ ...baseParent, experienceType: undefined }}
        token="token-123"
      />,
    );

    expect(screen.getByText("Feeling:")).toBeInTheDocument();
    expect(screen.getByText("Warm")).toBeInTheDocument();
  });

  it("renders without emotion badge when recipientEmotion is absent", () => {
    const noEmotionResponse: PublishedResponse = {
      ...baseResponse,
      content: {
        message: "Just a quick note.",
        photos: [],
      },
    };

    render(
      <ResponseViewClient
        response={noEmotionResponse}
        parent={baseParent}
        token="token-123"
      />,
    );

    expect(screen.queryByText(/Feeling/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Vibe/i)).not.toBeInTheDocument();
  });

  it("renders unknown experience emotion without prefix", () => {
    const unknownExpResponse: PublishedResponse = {
      ...baseResponse,
      content: {
        message: "A unique note.",
        recipientEmotion: "curious",
        photos: [],
      },
    };

    render(
      <ResponseViewClient
        response={unknownExpResponse}
        parent={{ ...baseParent, experienceType: "unknown-exp" }}
        token="token-123"
      />,
    );

    expect(screen.getByText("curious")).toBeInTheDocument();
    expect(screen.queryByText(/Feeling/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Vibe/i)).not.toBeInTheDocument();
  });

  it("renders accessible photo thumbnails and manages lightbox dialog focus and Escape closing", async () => {
    const user = (await import("@testing-library/user-event")).default.setup();
    const photoResponse: PublishedResponse = {
      ...baseResponse,
      content: {
        message: "Check these moments.",
        photos: ["photo-123", "photo-456"],
      },
    };

    render(
      <ResponseViewClient
        response={photoResponse}
        parent={baseParent}
        token="token-123"
      />,
    );

    const photoThumb = screen.getByRole("button", { name: "View enlarged photo 1" });
    expect(photoThumb).toBeInTheDocument();

    await user.click(photoThumb);

    const lightboxDialog = screen.getByRole("dialog", { name: "Enlarged photo view" });
    expect(lightboxDialog).toBeInTheDocument();
    expect(lightboxDialog).toHaveAttribute("aria-modal", "true");

    const closeBtn = screen.getByRole("button", { name: "Close photo" });
    expect(closeBtn).toBeInTheDocument();
    expect(closeBtn).toHaveFocus();

    // Escape closes lightbox
    fireEvent.keyDown(window, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Enlarged photo view" })).not.toBeInTheDocument();
    });
    expect(photoThumb).toHaveFocus();
  });

  it("renders birthday experience reply using Birthday presentation with response context banner", () => {
    const bdayExpResponse: PublishedResponse = {
      ...baseResponse,
      responseType: "experience",
      content: {
        experienceType: "birthday",
        content: {
          recipientName: "Aarav",
          senderName: "Riya",
          headline: "Happy Birthday Aarav!",
          message: "Celebrating you today and always.",
          themeId: "confetti",
        },
      },
    };

    render(
      <ResponseViewClient
        response={bdayExpResponse}
        parent={baseParent}
        token="token-exp-123"
      />,
    );

    expect(screen.getByText("In response to")).toBeInTheDocument();
    expect(screen.getAllByText("Aarav").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Happy Birthday Aarav!" })).toBeInTheDocument();
  });

  it("renders apology experience reply using Apology presentation with response context banner", () => {
    const apologyExpResponse: PublishedResponse = {
      ...baseResponse,
      responseType: "experience",
      content: {
        experienceType: "apology",
        content: {
          recipientName: "Aarav",
          senderName: "Riya",
          situation: "other",
          language: "en",
          messages: {
            message1: "I am truly sorry.",
            message2: "I want to make it right.",
            message3: "Thank you for listening.",
            personalNote: "",
          },
          themeId: "warm",
          stickerPackId: "cats",
          customization: {
            audio: { source: "none", volume: 0 },
            photos: [],
            memoryStyle: "polaroid",
          },
          linkDurationDays: 1,
        },
      },
    };

    render(
      <ResponseViewClient
        response={apologyExpResponse}
        parent={baseParent}
        token="token-exp-456"
      />,
    );

    expect(screen.getByText("In response to")).toBeInTheDocument();
    expect(screen.getByText("Aarav")).toBeInTheDocument();
  });

  it("appends response token query param to Miss You experience reply photo URLs", async () => {
    const user = (await import("@testing-library/user-event")).default.setup();
    const missYouExpResponse: PublishedResponse = {
      ...baseResponse,
      responseType: "experience",
      content: {
        experienceType: "miss-you",
        content: {
          recipientName: "Aarav",
          senderName: "Riya",
          headline: "Across the city",
          letter: "Saving a coffee seat for us.",
          themeId: "dusk-postage",
          photoLayout: "postcards",
          photos: [{ url: "/api/responses/assets/11111111-2222-3333-4444-555555555555", caption: "Evening light" }],
          reminders: [],
          audio: "none",
        },
      },
    };

    const { container } = render(
      <ResponseViewClient
        response={missYouExpResponse}
        parent={baseParent}
        token="token-miss-exp-99"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Go to scene 4" }));
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toBe(
      "/api/responses/assets/11111111-2222-3333-4444-555555555555?token=token-miss-exp-99",
    );
  });
});
