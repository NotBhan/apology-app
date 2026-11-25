import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MISS_YOU_THEMES } from "@/experiences/miss-you/themes";
import { missYouContentSchema } from "@/experiences/miss-you/schema";
import { MissYouLetter, MISS_YOU_SCENES } from "./MissYouLetter";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));

describe("MissYouLetter", () => {
  const sampleContent = missYouContentSchema.parse({
    recipientName: "Maya",
    senderName: "Kabir",
    headline: "Thinking of you tonight",
    distanceNote: "2,100 km apart",
    letter: "Everything feels quieter when we are not in the same city.\nCounting days until coffee.",
    reminders: ["Saw rain on the café awning", "Heard your favorite song on the train"],
    reunionWish: "Slow coffee on Sunday morning.",
    themeId: "dusk-postage",
    photoLayout: "postcards",
    photos: [
      { url: "/api/uploads/mem-1.webp", caption: "Bridge at twilight" },
      { url: "/api/uploads/mem-2.webp", caption: "Rainy tram" },
    ],
    audio: "soft-lavender",
  });

  it("renders every Miss You theme without throwing", () => {
    for (const theme of MISS_YOU_THEMES) {
      const { unmount } = render(
        <MissYouLetter
          content={{ ...sampleContent, themeId: theme.id }}
          initialScene="distance"
        />,
      );
      expect(screen.getByText("Bridge across the map")).toBeInTheDocument();
      unmount();
    }
  });

  it("lazily mounts photo gallery only once memories scene is visited and keeps it warm", async () => {
    const user = userEvent.setup();
    const { container } = render(<MissYouLetter content={sampleContent} />);

    // Arrival scene should trigger zero gallery photo fetches
    expect(screen.getByText("Thinking of you tonight")).toBeInTheDocument();
    expect(container.querySelectorAll("img")).toHaveLength(0);

    // Step 1 -> Distance
    await user.click(screen.getByRole("button", { name: /Open this letter/i }));
    expect(await screen.findByText("Bridge across the map")).toBeInTheDocument();
    expect(screen.getByText("Saw rain on the café awning")).toBeInTheDocument();
    expect(container.querySelectorAll("img")).toHaveLength(0);

    // Step 2 -> Letter stationery
    await user.click(screen.getByRole("button", { name: /Read the note/i }));
    expect(await screen.findByText("What I wanted to write")).toBeInTheDocument();
    expect(container.querySelectorAll("img")).toHaveLength(0);

    // Step 3 -> Memories gallery mounts for the first time
    await user.click(screen.getByRole("button", { name: /See our snapshots/i }));
    expect(await screen.findByText("Moments we hold onto")).toBeInTheDocument();
    expect(container.querySelectorAll("img")).toHaveLength(2);

    // Step 4 -> Reunion keeps memories mounted inside hidden container so stepping back does not re-fetch
    await user.click(screen.getByRole("button", { name: /Look ahead/i }));
    expect(await screen.findByText("Slow coffee on Sunday morning.")).toBeInTheDocument();
    expect(container.querySelectorAll("img")).toHaveLength(2);
  });

  it("supports keyboard navigation across all 5 scenes", async () => {
    render(<MissYouLetter content={sampleContent} />);

    expect(screen.getByText(`1/${MISS_YOU_SCENES.length}`)).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(await screen.findByText("Bridge across the map")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(await screen.findByText("Thinking of you tonight")).toBeInTheDocument();
  });

  it("uses compact layout and ignores arrow keys when rendered with variant='embedded'", () => {
    const { container } = render(<MissYouLetter content={sampleContent} variant="embedded" />);
    expect(container.firstElementChild?.className).not.toContain("min-h-svh");
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.queryByText("Bridge across the map")).not.toBeInTheDocument();
  });

  it("shows Quick Reply and Experience Reply invitations only when apologyId is provided", () => {
    const { rerender } = render(
      <MissYouLetter content={sampleContent} initialScene="reunion" />,
    );
    expect(screen.queryByRole("button", { name: /Send a note back/i })).not.toBeInTheDocument();

    rerender(
      <MissYouLetter
        content={sampleContent}
        apologyId="11111111-2222-3333-4444-555555555555"
        initialScene="reunion"
      />,
    );

    expect(
      screen.getByRole("button", { name: "Send a note back to Kabir" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create an experience for Kabir" }),
    ).toBeInTheDocument();
  });
});
