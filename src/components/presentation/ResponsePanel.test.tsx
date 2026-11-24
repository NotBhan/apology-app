import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ResponsePanel } from "./ResponsePanel";
import * as registry from "@/experiences/registry";
import { apologyExperience } from "@/experiences/apology/module";

describe("ResponsePanel", () => {
  const defaultProps = {
    apologyId: "apology-test-123",
    senderName: "Kabir",
    onReplay: vi.fn(),
    onCharacterState: vi.fn(),
  };

  it("renders apology invitation button with custom label when enabled", () => {
    render(<ResponsePanel {...defaultProps} />);

    const inviteBtn = screen.getByRole("button", {
      name: "Send a quick reply to Kabir",
    });
    expect(inviteBtn).toBeInTheDocument();
    expect(inviteBtn).toHaveAttribute("aria-haspopup", "dialog");
    expect(inviteBtn).toHaveAttribute("aria-expanded", "false");
  });

  it("does not render invitation button when apologyId is missing", () => {
    render(<ResponsePanel {...defaultProps} apologyId={undefined} />);

    expect(
      screen.queryByRole("button", { name: /Send a quick reply/i })
    ).not.toBeInTheDocument();
  });

  it("does not render invitation button when replyConfig is missing", () => {
    vi.spyOn(registry, "getExperience").mockReturnValueOnce({
      ...apologyExperience,
      replyConfig: undefined,
    });

    render(<ResponsePanel {...defaultProps} />);

    expect(
      screen.queryByRole("button", { name: /Send a quick reply/i })
    ).not.toBeInTheDocument();
  });

  it("does not render invitation button when replyConfig.enabled is false", () => {
    vi.spyOn(registry, "getExperience").mockReturnValueOnce({
      ...apologyExperience,
      replyConfig: {
        ...apologyExperience.replyConfig!,
        enabled: false,
      },
    });

    render(<ResponsePanel {...defaultProps} />);

    expect(
      screen.queryByRole("button", { name: /Send a quick reply/i })
    ).not.toBeInTheDocument();
  });

  it("opens QuickReplyModal and updates aria-expanded when invitation button is clicked", async () => {
    const user = userEvent.setup();
    render(<ResponsePanel {...defaultProps} />);

    const inviteBtn = screen.getByRole("button", {
      name: "Send a quick reply to Kabir",
    });
    expect(inviteBtn).toHaveAttribute("aria-expanded", "false");

    await user.click(inviteBtn);

    expect(inviteBtn).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Reply to Kabir" })).toBeInTheDocument();
  });

  it("renders experience reply invitation button and opens ExperienceReplyModal", async () => {
    const user = userEvent.setup();
    render(<ResponsePanel {...defaultProps} />);

    const expBtn = screen.getByRole("button", {
      name: "Create an experience for Kabir",
    });
    expect(expBtn).toBeInTheDocument();
    expect(expBtn).toHaveAttribute("aria-haspopup", "dialog");
    expect(expBtn).toHaveAttribute("aria-expanded", "false");

    await user.click(expBtn);

    expect(expBtn).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Create an experience for Kabir" })
    ).toBeInTheDocument();
  });

  it("does not render experience invitation button when allowExperienceReply is not true", () => {
    vi.spyOn(registry, "getExperience").mockReturnValueOnce({
      ...apologyExperience,
      replyConfig: {
        ...apologyExperience.replyConfig!,
        allowExperienceReply: false,
      },
    });

    render(<ResponsePanel {...defaultProps} />);

    expect(
      screen.getByRole("button", { name: "Send a quick reply to Kabir" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Create an experience/i })
    ).not.toBeInTheDocument();
  });

  it("does not render experience invitation button when allowExperienceReply is undefined/omitted", () => {
    vi.spyOn(registry, "getExperience").mockReturnValueOnce({
      ...apologyExperience,
      replyConfig: {
        ...apologyExperience.replyConfig!,
        enabled: true,
        inviteLabel: () => "Quick reply only",
        allowExperienceReply: undefined,
      },
    });

    render(<ResponsePanel {...defaultProps} />);

    expect(
      screen.getByRole("button", { name: "Quick reply only" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Create an experience/i })
    ).not.toBeInTheDocument();
  });

  it("fails closed when experience is unknown or unregistered", () => {
    vi.spyOn(registry, "getExperience").mockReturnValueOnce(undefined);

    render(<ResponsePanel {...defaultProps} />);

    expect(
      screen.queryByRole("button", { name: /reply/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /experience/i })
    ).not.toBeInTheDocument();
  });
});
