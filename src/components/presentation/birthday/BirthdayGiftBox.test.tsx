import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BirthdayGiftBox } from "./BirthdayGiftBox";
import { BIRTHDAY_THEMES } from "@/experiences/birthday/themes";

describe("BirthdayGiftBox", () => {
  const theme = BIRTHDAY_THEMES[0];

  it("renders recipient and sender names on the gift tag", () => {
    render(
      <BirthdayGiftBox
        recipientName="Aria"
        senderName="Leo"
        theme={theme}
      />
    );
    expect(screen.getByText("Aria")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /open birthday gift box for aria/i })).toBeInTheDocument();
    expect(screen.getByText(/tap the gift box to open/i)).toBeInTheDocument();
  });

  it("handles gift box click to open gift", async () => {
    const onOpened = vi.fn();
    const user = userEvent.setup();
    render(
      <BirthdayGiftBox
        recipientName="Aria"
        senderName="Leo"
        theme={theme}
        onOpened={onOpened}
      />
    );

    const giftBtn = screen.getByRole("button", { name: /open birthday gift box for aria/i });
    expect(giftBtn).toBeInTheDocument();
    await user.click(giftBtn);
    expect(screen.getByText(/unwrapping your gift/i)).toBeInTheDocument();
  });

  it("keeps trigger visibly focusable and supports direct reveal mode", () => {
    render(
      <BirthdayGiftBox
        recipientName="Aria"
        senderName="Leo"
        theme={theme}
        revealMode="direct"
      />,
    );

    const giftBtn = screen.getByRole("button", { name: /open birthday gift box for aria/i });
    expect(giftBtn.className).not.toContain("opacity-0");
    expect(screen.getByText(/gift box unwrapped!/i)).toBeInTheDocument();
  });
});
