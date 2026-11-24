import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ExperienceSelectionModal } from "./ExperienceSelectionModal";

describe("ExperienceSelectionModal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSelect: vi.fn(),
    senderName: "Aarav",
  };

  it("renders nothing when isOpen is false", () => {
    const { container } = render(
      <ExperienceSelectionModal {...defaultProps} isOpen={false} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders registered experiences and sender name", () => {
    render(<ExperienceSelectionModal {...defaultProps} />);

    expect(
      screen.getByRole("heading", { name: "Create an experience for Aarav" })
    ).toBeInTheDocument();
    expect(screen.getByText("I'm Sorry")).toBeInTheDocument();
    expect(screen.getByText("Happy Birthday")).toBeInTheDocument();
  });

  it("triggers onSelect when an experience card is clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<ExperienceSelectionModal {...defaultProps} onSelect={onSelect} />);

    const bdayButton = screen.getByRole("button", { name: /Happy Birthday/i });
    await user.click(bdayButton);

    expect(onSelect).toHaveBeenCalledWith("birthday");
  });

  it("triggers onClose when close button or cancel is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ExperienceSelectionModal {...defaultProps} onClose={onClose} />);

    const closeBtn = screen.getByRole("button", { name: "Close experience selection" });
    await user.click(closeBtn);
    expect(onClose).toHaveBeenCalled();

    const cancelBtn = screen.getByRole("button", { name: "Cancel and return to letter" });
    await user.click(cancelBtn);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("dismisses on Escape key", () => {
    const onClose = vi.fn();
    render(<ExperienceSelectionModal {...defaultProps} onClose={onClose} />);

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(onClose).toHaveBeenCalled();
  });
});
