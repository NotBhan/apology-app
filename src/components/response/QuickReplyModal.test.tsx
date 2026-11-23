import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { QuickReplyModal } from "./QuickReplyModal";
import * as clientApi from "@/lib/api/client";
import * as registry from "@/experiences/registry";
import type { ExperienceModule } from "@/experiences/types";

describe("QuickReplyModal", () => {
  const defaultProps = {
    apologyId: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    senderName: "Aarav",
    isOpen: true,
    onClose: vi.fn(),
  };

  it("renders apology composer by default when experienceId is omitted", () => {
    render(<QuickReplyModal {...defaultProps} />);
    expect(screen.getByRole("heading", { name: "Reply to Aarav" })).toBeInTheDocument();
    expect(screen.getByText("Leave an intimate, heartfelt note")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Write your reply...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "I forgive you" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "I need some time" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Send Quick Reply/i })).toBeInTheDocument();
  });

  it("renders birthday composer when experienceId is birthday", () => {
    render(<QuickReplyModal {...defaultProps} experienceId="birthday" />);
    expect(screen.getByRole("heading", { name: "Thank Aarav" })).toBeInTheDocument();
    expect(
      screen.getByText("Send a thank-you note, joyous wish, or celebration photos"),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(
        "Write a thank-you note, share a birthday wish, or describe your day...",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "So grateful" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Deeply touched" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Filled with joy" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Party mode" })).toBeInTheDocument();
  });

  it("does not render when isOpen is false", () => {
    render(<QuickReplyModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not render when explicit unknown experienceId is supplied", () => {
    render(<QuickReplyModal {...defaultProps} experienceId="unknown-module" />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not render when experience has no replyConfig", () => {
    const noReplyModule: ExperienceModule = {
      id: "apology",
      name: "No Reply",
      tagline: "Test",
      category: "apology",
      accent: "#123",
      draftSchema: z.object({}),
      themeIds: [],
      defaultThemeId: "",
      sceneIds: [],
      replyConfig: undefined,
    };
    vi.spyOn(registry, "getExperience").mockReturnValueOnce(noReplyModule);

    render(<QuickReplyModal {...defaultProps} experienceId="no-reply" />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not render when replyConfig.enabled is false", () => {
    const disabledReplyModule: ExperienceModule = {
      id: "apology",
      name: "Disabled Reply",
      tagline: "Test",
      category: "apology",
      accent: "#123",
      draftSchema: z.object({}),
      themeIds: [],
      defaultThemeId: "",
      sceneIds: [],
      replyConfig: {
        enabled: false,
        modalTitle: () => "Title",
        modalSubtitle: "Sub",
        messagePlaceholder: "Msg",
        emotions: [],
        emotionBadgePrefix: "Prefix",
        accent: "#123",
      },
    };
    vi.spyOn(registry, "getExperience").mockReturnValueOnce(disabledReplyModule);

    render(<QuickReplyModal {...defaultProps} experienceId="disabled-reply" />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("allows selecting and toggling an emotion tag", async () => {
    const user = userEvent.setup();
    render(<QuickReplyModal {...defaultProps} />);

    const forgiveBtn = screen.getByRole("button", { name: "I forgive you" });
    await user.click(forgiveBtn);
    expect(forgiveBtn).toHaveClass("font-semibold");

    // Toggle off
    await user.click(forgiveBtn);
    expect(forgiveBtn).not.toHaveClass("font-semibold");
  });

  it("populates message textarea when a preset is clicked", async () => {
    const user = userEvent.setup();
    render(<QuickReplyModal {...defaultProps} />);

    const presetBtn = screen.getByRole("button", {
      name: "Thank you for reaching out and saying this.",
    });
    await user.click(presetBtn);

    const textarea = screen.getByPlaceholderText("Write your reply...") as HTMLTextAreaElement;
    expect(textarea.value).toBe("Thank you for reaching out and saying this.");
  });

  it("submits apology reply with emotion key and renders success view", async () => {
    const user = userEvent.setup();
    const sendSpy = vi.spyOn(clientApi, "sendQuickReply").mockResolvedValueOnce({
      ok: true,
      publicToken: "pub-test-token-12345",
      manageToken: "man-test-token-67890",
      publicUrl: "/response/pub-test-token-12345",
      manageUrl: "/response/manage/man-test-token-67890",
    });

    render(<QuickReplyModal {...defaultProps} experienceId="apology" />);

    const textarea = screen.getByPlaceholderText("Write your reply...");
    await user.type(textarea, "I appreciate you saying this. Let's talk soon.");

    const forgiveBtn = screen.getByRole("button", { name: "I forgive you" });
    await user.click(forgiveBtn);

    const submitBtn = screen.getByRole("button", { name: /Send Quick Reply/i });
    await user.click(submitBtn);

    expect(sendSpy).toHaveBeenCalledWith(defaultProps.apologyId, {
      message: "I appreciate you saying this. Let's talk soon.",
      recipientEmotion: "forgive",
      photos: [],
      responseId: undefined,
    });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Reply Sent" })).toBeInTheDocument();
      expect(screen.getByText("Your reply is ready to share")).toBeInTheDocument();
    });

    // Check capability links
    expect(screen.getByDisplayValue(/\/response\/pub-test-token-12345/)).toBeInTheDocument();
    expect(screen.getByDisplayValue(/\/response\/manage\/man-test-token-67890/)).toBeInTheDocument();
  });

  it("submits birthday reply with emotion key", async () => {
    const user = userEvent.setup();
    const sendSpy = vi.spyOn(clientApi, "sendQuickReply").mockResolvedValueOnce({
      ok: true,
      publicToken: "pub-bday-token-11111",
      manageToken: "man-bday-token-22222",
      publicUrl: "/response/pub-bday-token-11111",
      manageUrl: "/response/manage/man-bday-token-22222",
    });

    render(<QuickReplyModal {...defaultProps} experienceId="birthday" />);

    const presetBtn = screen.getByRole("button", {
      name: "Thank you so much for the wonderful birthday wish!",
    });
    await user.click(presetBtn);

    const gratefulBtn = screen.getByRole("button", { name: "So grateful" });
    await user.click(gratefulBtn);

    const submitBtn = screen.getByRole("button", { name: /Send Quick Reply/i });
    await user.click(submitBtn);

    expect(sendSpy).toHaveBeenCalledWith(defaultProps.apologyId, {
      message: "Thank you so much for the wonderful birthday wish!",
      recipientEmotion: "grateful",
      photos: [],
      responseId: undefined,
    });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Reply Sent" })).toBeInTheDocument();
    });
  });
});
