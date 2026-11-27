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

  it("renders open-letter directly as a stationery card with custom headings", () => {
    render(
      <BirthdayEnvelope
        recipientName="Aria"
        senderName="Leo"
        message="Happy day!"
        theme={theme}
        styleVariant="open-letter"
        letterHeading="Heartfelt Note"
        letterSignOff="Warmly yours,"
      />,
    );

    expect(screen.getByText("Heartfelt Note")).toBeInTheDocument();
    expect(screen.getByText("Warmly yours,")).toBeInTheDocument();
    expect(screen.getByText("Happy day!")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /open birthday letter/i })).not.toBeInTheDocument();
  });
});
