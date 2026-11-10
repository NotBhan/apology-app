import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
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
});
