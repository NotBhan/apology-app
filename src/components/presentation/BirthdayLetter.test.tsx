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

  it("advances to gallery scene and renders attached photos with captions and lightbox", async () => {
    const user = userEvent.setup();
    const contentWithPhotos = birthdayContentSchema.parse({
      ...content,
      photoLayout: "polaroid",
      photos: [
        { url: "https://example.com/moment1.jpg", caption: "Sweet memory 1" },
        { url: "https://example.com/moment2.jpg", caption: "Sweet memory 2" },
      ],
    });

    render(<BirthdayLetter content={contentWithPhotos} />);

    // Scene 1: Opening
    await user.click(screen.getByRole("button", { name: "Open it" }));
    // Scene 2: Wish
    await user.click(screen.getByRole("button", { name: "Continue" }));
    // Scene 3: Message
    await user.click(screen.getByRole("button", { name: "Continue" }));

    // Scene 4: Gallery
    expect(screen.getByRole("heading", { name: "Some moments" })).toBeInTheDocument();
    expect(screen.getByText("Sweet memory 1")).toBeInTheDocument();
    expect(screen.getByText("Sweet memory 2")).toBeInTheDocument();

    // Open lightbox
    const photoBtn = screen.getByRole("button", { name: /View photo 1/i });
    await user.click(photoBtn);

    expect(screen.getByRole("dialog", { name: /Photo gallery preview/i })).toBeInTheDocument();
    expect(screen.getByText("Photo 1 of 2")).toBeInTheDocument();

    // Close lightbox
    await user.click(screen.getByRole("button", { name: /Close photo preview/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("blocks global ArrowRight scene advance while photo lightbox is open and respects scene visibility toggles", async () => {
    const user = userEvent.setup();
    const customContent = birthdayContentSchema.parse({
      ...content,
      audio: "celebration",
      photos: [
        { url: "https://example.com/m1.jpg", caption: "First", focalPoint: "50% 25%" },
        { url: "https://example.com/m2.jpg", caption: "Second" },
      ],
      customization: {
        content: {
          openingEyebrow: "custom edition",
          openingCta: "Begin",
          finaleHeading: "Forever celebrated",
          showCakeScene: false,
        },
        interaction: {
          envelopeStyle: "open-letter",
          motionPreset: "still",
        },
      },
    });

    render(<BirthdayLetter content={customContent} />);

    // 4 scenes because cake scene is hidden, audio control rendered
    expect(screen.getByText("1/4")).toBeInTheDocument();
    expect(screen.getByText("custom edition")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /play music/i })).toBeInTheDocument();

    // Advance straight to open-letter message scene (skipping hidden cake)
    await user.click(screen.getByRole("button", { name: "Begin" }));
    expect(screen.getByText("Dear Riya,")).toBeInTheDocument();

    // Advance to gallery and open lightbox
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: /View photo 1/i }));
    expect(screen.getByText("Photo 1 of 2")).toBeInTheDocument();

    // ArrowRight navigates photo inside lightbox without leaving gallery scene
    await user.keyboard("{ArrowRight}");
    expect(screen.getByText("Photo 2 of 2")).toBeInTheDocument();
    expect(screen.getByText("3/4")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // Go to finale with custom heading
    await user.click(screen.getByRole("button", { name: "One last thing" }));
    expect(screen.getByRole("heading", { name: "Forever celebrated" })).toBeInTheDocument();
  });

  it("disables audio controls for 'none' and toggles mute state cleanly when an audio track is active", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <BirthdayLetter content={birthdayContentSchema.parse({ ...content, audio: "none" })} />,
    );
    expect(screen.queryByRole("button", { name: /play music/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /mute music/i })).not.toBeInTheDocument();

    rerender(
      <BirthdayLetter content={birthdayContentSchema.parse({ ...content, audio: "soft" })} />,
    );
    const muteBtn = screen.getByRole("button", { name: /mute music/i });
    expect(muteBtn).toHaveAttribute("aria-pressed", "false");
    await user.click(muteBtn);
    expect(screen.getByRole("button", { name: /unmute music/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
