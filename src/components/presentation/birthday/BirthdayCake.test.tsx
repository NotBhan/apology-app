import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BirthdayCake } from "./BirthdayCake";
import { BIRTHDAY_THEMES } from "@/experiences/birthday/themes";

describe("BirthdayCake", () => {
  const confetti = BIRTHDAY_THEMES.find((t) => t.id === "confetti")!;
  const playful = BIRTHDAY_THEMES.find((t) => t.id === "playful")!;
  const pastel = BIRTHDAY_THEMES.find((t) => t.id === "pastel")!;

  it("renders 2 tiers for 2-tier themes (confetti)", () => {
    const { container } = render(<BirthdayCake theme={confetti} candleCount={3} />);
    expect(container.querySelector("#bottom-tier")).toBeInTheDocument();
    expect(container.querySelector("#top-tier")).toBeInTheDocument();
    expect(container.querySelector("#bottom-tier-3")).not.toBeInTheDocument();
  });

  it("renders 3 tiers for 3-tier themes (pastel, playful)", () => {
    const { container } = render(<BirthdayCake theme={pastel} candleCount={3} />);
    expect(container.querySelector("#bottom-tier-3")).toBeInTheDocument();
    expect(container.querySelector("#middle-tier-3")).toBeInTheDocument();
    expect(container.querySelector("#top-tier-3")).toBeInTheDocument();
    expect(container.querySelector("#bottom-tier")).not.toBeInTheDocument();
  });

  it("renders sprinkles for playful theme", () => {
    const { container } = render(<BirthdayCake theme={playful} candleCount={4} />);
    const sprinkles = container.querySelectorAll("rect[transform*='rotate']");
    expect(sprinkles.length).toBeGreaterThan(0);
  });

  it("extinguishes candles and triggers callback on blow out", async () => {
    const onBlowOut = vi.fn();
    const user = userEvent.setup();
    render(<BirthdayCake theme={confetti} candleCount={3} onBlowOut={onBlowOut} />);

    const button = screen.getByRole("button", { name: /blow out the candles/i });
    await user.click(button);

    expect(onBlowOut).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/wish made! happy birthday!/i)).toBeInTheDocument();
  });

  it("supports relighting candles in tap-relight mode and locks in single-wish mode", async () => {
    const onRelight = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(
      <BirthdayCake
        theme={confetti}
        candleCount={3}
        candleMode="tap-relight"
        onRelight={onRelight}
      />,
    );

    await user.click(screen.getByRole("button", { name: /blow out the candles/i }));
    const relightBtn = screen.getByRole("button", { name: /relight candles/i });
    await user.click(relightBtn);

    expect(onRelight).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: /blow out the candles/i })).toBeInTheDocument();

    rerender(<BirthdayCake theme={confetti} candleCount={3} candleMode="single-wish" />);
    await user.click(screen.getByRole("button", { name: /blow out the candles/i }));
    expect(screen.queryByRole("button", { name: /relight candles/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /extinguished candles/i })).toBeDisabled();
  });
});
