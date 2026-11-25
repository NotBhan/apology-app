import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

  it("allows selecting and toggling an emotion tag with correct aria-pressed states", async () => {
    const user = userEvent.setup();
    render(<QuickReplyModal {...defaultProps} />);

    const forgiveBtn = screen.getByRole("button", { name: "I forgive you" });
    const timeBtn = screen.getByRole("button", { name: "I need some time" });

    expect(forgiveBtn).toHaveAttribute("aria-pressed", "false");
    expect(timeBtn).toHaveAttribute("aria-pressed", "false");

    await user.click(forgiveBtn);
    expect(forgiveBtn).toHaveAttribute("aria-pressed", "true");
    expect(timeBtn).toHaveAttribute("aria-pressed", "false");
    expect(forgiveBtn).toHaveClass("font-semibold");

    // Toggle off
    await user.click(forgiveBtn);
    expect(forgiveBtn).toHaveAttribute("aria-pressed", "false");
    expect(forgiveBtn).not.toHaveClass("font-semibold");
  });

  it("associates submission errors with textarea and announces with role=alert", async () => {
    const user = userEvent.setup();
    render(<QuickReplyModal {...defaultProps} />);

    const textarea = screen.getByPlaceholderText("Write your reply...");
    expect(textarea).toHaveAttribute("aria-invalid", "false");
    expect(textarea).not.toHaveAttribute("aria-describedby");

    const sendBtn = screen.getByRole("button", { name: /Send Quick Reply/i });
    // Attempt submit without text
    await user.click(sendBtn);

    // If disabled via HTML attribute, trigger form submit via enter or fireEvent
    const form = textarea.closest("form")!;
    fireEvent.submit(form);

    const errorAlert = screen.getByRole("alert");
    expect(errorAlert).toBeInTheDocument();
    expect(errorAlert).toHaveTextContent("Please write a message before sending.");
    expect(textarea).toHaveAttribute("aria-invalid", "true");
    expect(textarea).toHaveAttribute("aria-describedby", "reply-error");
  });

  it("moves initial focus into dialog on open", () => {
    render(<QuickReplyModal {...defaultProps} isOpen={true} />);

    // First focusable element inside dialog is the close button
    const closeBtn = screen.getByRole("button", { name: "Close reply modal" });
    expect(closeBtn).toHaveFocus();
  });

  it("contains focus within dialog during Tab and Shift+Tab cycling", () => {
    render(<QuickReplyModal {...defaultProps} isOpen={true} />);

    const dialog = screen.getByRole("dialog");
    const focusable = dialog.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    // Focus last and press Tab -> cycles to first
    last.focus();
    expect(document.activeElement).toBe(last);

    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true })
    );
    expect(document.activeElement).toBe(first);

    // Focus first and press Shift+Tab -> cycles to last
    first.focus();
    expect(document.activeElement).toBe(first);

    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true, cancelable: true })
    );
    expect(document.activeElement).toBe(last);
  });

  it("closes on Escape key when idle, but restores focus to previously active element", async () => {
    const onClose = vi.fn();
    const trigger = document.createElement("button");
    trigger.textContent = "Trigger";
    document.body.appendChild(trigger);
    trigger.focus();

    const { unmount } = render(
      <QuickReplyModal {...defaultProps} isOpen={true} onClose={onClose} />
    );

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(onClose).toHaveBeenCalledTimes(1);

    unmount();
    expect(document.activeElement).toBe(trigger);
    document.body.removeChild(trigger);
  });

  it("does not dismiss dialog on Escape during active upload", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const imageMod = await import("@/lib/image");
    const webpBlob = new Blob([new Uint8Array([0x52, 0x49, 0x46, 0x46])], { type: "image/webp" });
    vi.spyOn(imageMod, "compressImage").mockResolvedValueOnce({
      blob: webpBlob,
      width: 1200,
      height: 900,
      type: "image/webp",
      metrics: {
        originalBytes: 1_200_000,
        compressedBytes: 180_000,
        originalWidth: 2400,
        originalHeight: 1800,
        outputWidth: 1200,
        outputHeight: 900,
        originalFormat: "image/jpeg",
        outputFormat: "image/webp",
        durationMs: 12,
        reductionBytes: 1_020_000,
        reductionPercent: 85,
        qualityUsed: 0.78,
        attempts: 1,
        wasRecompressed: true,
        preservedTransparency: false,
      },
    });

    let finishUpload: (value: clientApi.ResponseUploadResult | PromiseLike<clientApi.ResponseUploadResult>) => void = () => {};
    vi.spyOn(clientApi, "uploadResponsePhoto").mockImplementationOnce(
      () => new Promise((resolve) => { finishUpload = resolve; })
    );

    render(<QuickReplyModal {...defaultProps} isOpen={true} onClose={onClose} />);

    const file = new File(["dummy"], "photo.jpg", { type: "image/jpeg" });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, file);

    // Expect uploading indicator to be present and WebP file uploaded
    expect(await screen.findByText("Uploading photo…")).toBeInTheDocument();
    expect(clientApi.uploadResponsePhoto).toHaveBeenCalledWith(
      defaultProps.apologyId,
      expect.objectContaining({ type: "image/webp", name: "photo.webp" }),
      undefined,
      "quick",
      expect.any(AbortSignal),
    );

    // Press Escape during upload
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(onClose).not.toHaveBeenCalled();

    // Finish upload
    finishUpload({
      asset: { id: "photo-1", url: "https://example.com/photo-1.jpg" },
      responseId: "resp-1",
    });

    await waitFor(() => {
      expect(screen.queryByText("Uploading photo…")).not.toBeInTheDocument();
    });

    // Now Escape works when idle
    await waitFor(() => {
      fireEvent.keyDown(window, { key: "Escape" });
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it("rejects invalid photo files during client optimization without uploading", async () => {
    const user = userEvent.setup({ applyAccept: false });
    const uploadSpy = vi.spyOn(clientApi, "uploadResponsePhoto");

    render(<QuickReplyModal {...defaultProps} isOpen={true} />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const fakePdf = new File(["%PDF-1.7"], "fake.jpg", { type: "image/jpeg" });
    await user.upload(fileInput, fakePdf);

    expect(uploadSpy).not.toHaveBeenCalled();
    expect(await screen.findByRole("alert")).toHaveTextContent(/not a valid|unsupported/i);
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

  it("portals into presentation-modal-root with responsive contained styling when root exists", () => {
    const root = document.createElement("div");
    root.id = "presentation-modal-root";
    document.body.appendChild(root);

    render(<QuickReplyModal {...defaultProps} />);

    const dialog = screen.getByRole("dialog");
    expect(root.contains(dialog)).toBe(true);
    expect(dialog).toHaveClass("absolute", "inset-0", "z-50");

    document.body.removeChild(root);
  });
});
