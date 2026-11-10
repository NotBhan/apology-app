import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ApologyTheme } from "@/types/theme";

vi.mock("@/components/customization/MusicPanel", () => ({
  MusicPanel: () => <div>music panel</div>,
}));
vi.mock("@/components/customization/PhotosPanel", () => ({
  PhotosPanel: () => <div>photos panel</div>,
}));
vi.mock("@/components/customization/ColorsPanel", () => ({
  ColorsPanel: () => <div>colours panel</div>,
}));

import { CustomizeStep } from "./CustomizeStep";

function setup() {
  const onNext = vi.fn();
  const onBack = vi.fn();
  render(
    <CustomizeStep
      customization={
        { audio: { source: "none", volume: 0.5 }, photos: [], memoryStyle: "polaroid" } as never
      }
      theme={{} as ApologyTheme}
      onChange={() => undefined}
      onUploadAudio={async () => ({ assetId: "asset" })}
      onUploadPhoto={async () => ({}) as never}
      onNext={onNext}
      onBack={onBack}
    />,
  );
  return { onNext, onBack };
}

describe("customise step navigation", () => {
  it("walks Continue through music, photos and colours before leaving", async () => {
    const user = userEvent.setup();
    const { onNext } = setup();

    expect(screen.getByText("music panel")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByText("photos panel")).toBeInTheDocument();
    expect(onNext).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByText("colours panel")).toBeInTheDocument();
    expect(onNext).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("unwinds the same panels on Back before leaving the step", async () => {
    const user = userEvent.setup();
    const { onBack } = setup();

    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(screen.getByText("music panel")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByText("colours panel")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByText("photos panel")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByText("music panel")).toBeInTheDocument();
    // Back only leaves the step from the first panel.
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("tabs still switch panels directly", async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole("tab", { name: "Photos" }));
    expect(screen.getByText("photos panel")).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "Colours" }));
    expect(screen.getByText("colours panel")).toBeInTheDocument();
  });
});
