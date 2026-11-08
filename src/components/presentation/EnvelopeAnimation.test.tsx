import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EnvelopeAnimation } from "./EnvelopeAnimation";

const SEAL = { name: "Tap the seal" };

describe("EnvelopeAnimation", () => {
  it("starts sealed with an explicit action", () => {
    render(
      <EnvelopeAnimation
        recipientName="Ananya"
        senderName="Rohan"
        body="I wrote this at 2am."
        ctaLabel={SEAL.name}
      />,
    );
    expect(screen.getByRole("button", { name: SEAL.name })).toBeInTheDocument();
    expect(screen.queryByText("I wrote this at 2am.")).not.toBeInTheDocument();
  });

  it("reveals the letter and signals completion", async () => {
    const onOpened = vi.fn();
    const user = userEvent.setup();

    render(
      <EnvelopeAnimation
        recipientName="Ananya"
        senderName="Rohan"
        body="I wrote this at 2am."
        ctaLabel={SEAL.name}
        onOpened={onOpened}
      />,
    );

    await user.click(screen.getByRole("button", { name: SEAL.name }));

    await waitFor(() => expect(onOpened).toHaveBeenCalledTimes(1), { timeout: 5000 });

    expect(screen.getAllByText("I wrote this at 2am.").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Rohan").length).toBeGreaterThan(0);
  });

  it("addresses the opened letter to the recipient", async () => {
    const user = userEvent.setup();
    render(
      <EnvelopeAnimation
        recipientName="Ananya"
        senderName="Rohan"
        body="Hello."
        ctaLabel={SEAL.name}
      />,
    );

    await user.click(screen.getByRole("button", { name: SEAL.name }));

    await waitFor(
      () => {
        expect(document.body.textContent).toContain("Hello.");
      },
      { timeout: 5000 },
    );

    expect(document.body.textContent).toContain("Ananya");
  });
});
