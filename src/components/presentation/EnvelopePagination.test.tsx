import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EnvelopeAnimation } from "./EnvelopeAnimation";

const LONG_NOTE = Array.from({ length: 120 }, (_, index) => `line${index}`).join(" ");

describe("envelope letter pagination", () => {
  it("pages through a long note and only signals completion at the end", async () => {
    const user = userEvent.setup();
    const onOpened = vi.fn();

    render(
      <EnvelopeAnimation
        recipientName="Riya"
        senderName="Arjun"
        body={LONG_NOTE}
        onOpened={onOpened}
      />,
    );

    await user.click(screen.getByRole("button", { name: /tap the seal/i }));
    await waitFor(() => expect(screen.getByText(/page 1 of/i)).toBeInTheDocument(), {
      timeout: 6000,
    });

    // The letter has long content, so completion waits for the last page.
    expect(onOpened).not.toHaveBeenCalled();

    let guard = 0;
    while (!screen.queryByText(/end of letter/i) && guard < 20) {
      await user.click(screen.getByRole("button", { name: /next page/i }));
      guard += 1;
    }

    expect(screen.getByText(/end of letter/i)).toBeInTheDocument();
    expect(onOpened).toHaveBeenCalledTimes(1);
  }, 20000);

  it("signals completion immediately for a single-page note", async () => {
    const user = userEvent.setup();
    const onOpened = vi.fn();

    render(
      <EnvelopeAnimation recipientName="Riya" senderName="Arjun" body="Short note." onOpened={onOpened} />,
    );

    await user.click(screen.getByRole("button", { name: /tap the seal/i }));
    await waitFor(() => expect(onOpened).toHaveBeenCalledTimes(1), { timeout: 6000 });
    expect(screen.queryByText(/next page/i)).not.toBeInTheDocument();
  }, 15000);
});
