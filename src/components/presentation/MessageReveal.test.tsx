import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MessageReveal } from "./MessageReveal";

describe("MessageReveal", () => {
  it("renders the sender's exact words", () => {
    render(<MessageReveal text="You matter more than my temper." mode="fade" />);
    expect(screen.getByText("You matter more than my temper.")).toBeInTheDocument();
  });

  it("preserves the text for word-stagger reveals", () => {
    const { container } = render(
      <MessageReveal text="I said too much that night." mode="word-stagger" />,
    );
    expect(container.textContent?.replace(/\s+/g, " ").trim()).toBe(
      "I said too much that night.",
    );
  });

  it("renders headings when asked", () => {
    render(<MessageReveal as="h2" text="I know I hurt you" mode="ink" />);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("I know I hurt you");
  });

  it("does not drop characters in line-reveal mode", () => {
    const { container } = render(
      <MessageReveal text="Every single word stays." mode="line-reveal" />,
    );
    expect(container.textContent).toContain("Every single word stays.");
  });
});
