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

  it("supports ribbon seal style, custom sign-off, and multi-page back/forward navigation", async () => {
    const user = userEvent.setup();
    const longBody = Array.from(
      { length: 24 },
      (_, idx) => `Paragraph ${idx + 1}: I keep coming back to what happened between us.`,
    ).join("\n\n");

    render(
      <EnvelopeAnimation
        recipientName="Ananya"
        senderName="Rohan"
        body={longBody}
        sealStyle="ribbon"
        signOff="always yours"
        animate={false}
        ctaLabel="Untie the ribbon"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Untie the ribbon" }));
    expect(screen.getByText("always yours")).toBeInTheDocument();

    const prevBtn = screen.getByRole("button", { name: "Previous page" });
    const nextBtn = screen.getByRole("button", { name: "Next page" });
    expect(prevBtn).toBeDisabled();

    await user.click(nextBtn);
    expect(screen.getByText(/page 2 of/i)).toBeInTheDocument();
    expect(prevBtn).toBeEnabled();

    await user.click(prevBtn);
    expect(screen.getByText(/page 1 of/i)).toBeInTheDocument();
  });
});
