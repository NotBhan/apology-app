import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BirthdayLetter } from "./BirthdayLetter";
import { birthdayContentSchema } from "@/experiences/birthday/schema";

const content = birthdayContentSchema.parse({
  recipientName: "Riya",
  senderName: "Arjun",
  headline: "Happy birthday",
  message: "Have the best year yet.",
  themeId: "confetti",
});

describe("birthday presentation", () => {
  it("opens on the headline and advances through its own scenes", async () => {
    const user = userEvent.setup();
    render(<BirthdayLetter content={content} />);

    expect(screen.getByRole("heading", { name: "Happy birthday" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Open it" }));
    expect(screen.getByText(/make a wish/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByText("Have the best year yet.")).toBeInTheDocument();
  });

  it("shows the sender on the message scene", async () => {
    const user = userEvent.setup();
    render(<BirthdayLetter content={content} />);
    await user.click(screen.getByRole("button", { name: "Open it" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByText(/from Arjun/i)).toBeInTheDocument();
  });

  it("renders 'Say Thank You' button on finale scene and opens birthday reply modal", async () => {
    const user = userEvent.setup();
    render(<BirthdayLetter content={content} apologyId="bday-123" />);

    await user.click(screen.getByRole("button", { name: "Open it" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "One last thing" }));

    const thankBtn = screen.getByRole("button", { name: /Say Thank You/i });
    expect(thankBtn).toBeInTheDocument();
    expect(thankBtn).toHaveAttribute("aria-haspopup", "dialog");
    expect(thankBtn).toHaveAttribute("aria-expanded", "false");

    await user.click(thankBtn);
    expect(thankBtn).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("heading", { name: "Thank Arjun" })).toBeInTheDocument();
    expect(
      screen.getByText("Send a thank-you note, joyous wish, or celebration photos"),
    ).toBeInTheDocument();
  });

  it("renders 'Send a letter to Arjun' experience reply button on finale scene and opens modal", async () => {
    const user = userEvent.setup();
    render(<BirthdayLetter content={content} apologyId="bday-123" />);

    await user.click(screen.getByRole("button", { name: "Open it" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "One last thing" }));

    const letterBtn = screen.getByRole("button", { name: /Send a letter to Arjun/i });
    expect(letterBtn).toBeInTheDocument();
    expect(letterBtn).toHaveAttribute("aria-haspopup", "dialog");
    expect(letterBtn).toHaveAttribute("aria-expanded", "false");

    await user.click(letterBtn);
    expect(letterBtn).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByRole("heading", { name: "Create an experience for Arjun" })
    ).toBeInTheDocument();
  });

  it("does not render experience reply button when allowExperienceReply is not true", async () => {
    const registry = await import("@/experiences/registry");
    const { birthdayExperience } = await import("@/experiences/birthday/module");

    vi.spyOn(registry, "getExperience").mockReturnValueOnce({
      ...birthdayExperience,
      replyConfig: {
        ...birthdayExperience.replyConfig!,
        allowExperienceReply: false,
      },
    });

    const user = userEvent.setup();
    render(<BirthdayLetter content={content} apologyId="bday-123" />);

    await user.click(screen.getByRole("button", { name: "Open it" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "One last thing" }));

    expect(screen.getByRole("button", { name: /Say Thank You/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Send a letter/i })).not.toBeInTheDocument();
  });

  it("does not render reply invitation button on finale scene when replyConfig is disabled", async () => {
    const registry = await import("@/experiences/registry");
    const { birthdayExperience } = await import("@/experiences/birthday/module");

    vi.spyOn(registry, "getExperience").mockReturnValueOnce({
      ...birthdayExperience,
      replyConfig: {
        ...birthdayExperience.replyConfig!,
        enabled: false,
      },
    });

    const user = userEvent.setup();
    render(<BirthdayLetter content={content} apologyId="bday-123" />);

    await user.click(screen.getByRole("button", { name: "Open it" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "One last thing" }));

    expect(screen.queryByRole("button", { name: /Say Thank You/i })).not.toBeInTheDocument();
  });

  it("does not render reply invitation button on finale scene when replyConfig is missing", async () => {
    const registry = await import("@/experiences/registry");
    const { birthdayExperience } = await import("@/experiences/birthday/module");

    vi.spyOn(registry, "getExperience").mockReturnValueOnce({
      ...birthdayExperience,
      replyConfig: undefined,
    });

    const user = userEvent.setup();
    render(<BirthdayLetter content={content} apologyId="bday-123" />);

    await user.click(screen.getByRole("button", { name: "Open it" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "One last thing" }));

    expect(screen.queryByRole("button", { name: /Say Thank You/i })).not.toBeInTheDocument();
  });

  it("handles interactive candle blowout and shows celebratory feedback", async () => {
    const user = userEvent.setup();
    render(<BirthdayLetter content={{ ...content, candleCount: 5 }} />);

    await user.click(screen.getByRole("button", { name: "Open it" }));
    expect(screen.getByText(/make a wish/i)).toBeInTheDocument();

    const blowOutBtn = screen.getByRole("button", { name: /Blow out the candles/i });
    expect(blowOutBtn).toBeInTheDocument();

    await user.click(blowOutBtn);
    expect(screen.getByText(/Wish made! Happy Birthday!/i)).toBeInTheDocument();
  });

  it("renders all six birthday themes cleanly", async () => {
    const themeIds = ["confetti", "midnight-gold", "pastel", "floral", "vintage", "playful"] as const;

    for (const themeId of themeIds) {
      const { unmount } = render(
        <BirthdayLetter
          content={{
            ...content,
            themeId,
          }}
        />,
      );
      expect(screen.getByRole("heading", { name: "Happy birthday" })).toBeInTheDocument();
      unmount();
    }
  });

  it("safely handles legacy payloads with default candle count and optional age", async () => {
    const user = userEvent.setup();
    // Legacy payload missing candleCount, age, photos, audio - schema populates defaults
    const legacyContent = birthdayContentSchema.parse({
      recipientName: "Maya",
      senderName: "Dev",
      headline: "Joyful Day",
      message: "May all your dreams come true.",
      themeId: "confetti",
    });

    render(<BirthdayLetter content={legacyContent} />);
    expect(screen.getByRole("heading", { name: "Joyful Day" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Open it" }));
    expect(screen.getByText(/make a wish/i)).toBeInTheDocument();
    expect(screen.getByText("Another beautiful year ahead.")).toBeInTheDocument();
  });
});
