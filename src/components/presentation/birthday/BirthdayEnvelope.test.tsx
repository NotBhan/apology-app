import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BirthdayEnvelope } from "./BirthdayEnvelope";
import { BIRTHDAY_THEMES } from "@/experiences/birthday/themes";

describe("BirthdayEnvelope", () => {
  const theme = BIRTHDAY_THEMES[0];

  it("renders recipient and sender names", () => {
    render(
      <BirthdayEnvelope
        recipientName="Aria"
        senderName="Leo"
        theme={theme}
      />
    );
    expect(screen.getByText("Aria")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /open birthday letter from leo/i })).toBeInTheDocument();
  });

  it("handles seal click to open envelope", async () => {
    const onOpened = vi.fn();
    const user = userEvent.setup();
    render(
      <BirthdayEnvelope
        recipientName="Aria"
        senderName="Leo"
        theme={theme}
        onOpened={onOpened}
      />
    );

    const sealBtn = screen.getByRole("button", { name: /open birthday letter from leo/i });
    expect(sealBtn).toBeInTheDocument();
    await user.click(sealBtn);
  });
});
