import { render, screen } from "@testing-library/react";
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
});
