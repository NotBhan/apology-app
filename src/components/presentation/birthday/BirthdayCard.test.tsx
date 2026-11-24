import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BirthdayCard } from "./BirthdayCard";
import { BIRTHDAY_THEMES } from "@/experiences/birthday/themes";

describe("BirthdayCard", () => {
  const theme = BIRTHDAY_THEMES[0];

  it("renders birthday card with headline, recipient and age", () => {
    render(
      <BirthdayCard
        recipientName="Aria"
        senderName="Leo"
        headline="Happy 25th Birthday Aria!"
        age={25}
        theme={theme}
      />
    );

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Aria");
    expect(screen.getByText("Happy 25th Birthday Aria!")).toBeInTheDocument();
    expect(screen.getByText(/Chapter 25/)).toBeInTheDocument();
    expect(screen.getByText(/From Leo/)).toBeInTheDocument();
  });
});
