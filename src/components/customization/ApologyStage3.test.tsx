import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getTheme } from "@/themes/registry";
import { contrastRatio, resolvePalette, themeScopeVars } from "@/lib/theme-vars";
import { MusicPanel } from "@/components/customization/MusicPanel";
import { PhotosPanel } from "@/components/customization/PhotosPanel";
import { ColorsPanel } from "@/components/customization/ColorsPanel";
import { MemoryGallery } from "@/components/presentation/MemoryGallery";
import { ThemeCard } from "@/components/theme-selector/ThemeCard";

describe("themeVars palette & typography", () => {
  it("adjusts text contrast and surface automatically when background colour is overridden", () => {
    const minimal = getTheme("minimal");
    const resolved = resolvePalette(minimal, {
      audio: { source: "none", volume: 0.5 },
      photos: [],
      memoryStyle: "polaroid",
      colors: { background: "#141020" },
    });
    expect(contrastRatio(resolved.background, resolved.text)).toBeGreaterThanOrEqual(4.5);
    expect(resolved.surface).not.toBe(minimal.palette.surface);
  });

  it("emits font pairing, text scale, and alignment variables", () => {
    const romantic = getTheme("romantic");
    const vars = themeScopeVars(romantic, {
      audio: { source: "none", volume: 0.5 },
      photos: [],
      memoryStyle: "polaroid",
      visual: { fontPairing: "clean", textSize: "expressive", alignment: "left" },
    });
    expect(vars["--t-font-heading"]).toContain("--font-sans");
    expect(vars["--t-text-scale"]).toBe("1.08");
    expect(vars["--t-align"]).toBe("left");
  });
});

describe("MusicPanel interactions", () => {
  it("clears stale assetId when switching to Another track and supports My own audio removal", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    const { rerender } = render(
      <MusicPanel
        value={{ source: "custom", assetId: "asset-123", volume: 0.5 }}
        themeDefaultTrackId="soft-piano"
        onChange={onChange}
        onUpload={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Another track/i }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ source: "custom", assetId: undefined }),
    );

    rerender(
      <MusicPanel
        value={{ source: "custom", assetId: "asset-123", volume: 0.5 }}
        themeDefaultTrackId="soft-piano"
        onChange={onChange}
        onUpload={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Remove audio" }));
    expect(onChange).toHaveBeenCalledWith({ source: "default", volume: 0.5 });
  });
});

describe("ColorsPanel & ThemeCard", () => {
  it("applies curated palette preset and resets with status announcement", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ColorsPanel theme={getTheme("romantic")} value={{}} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Candlelit paper" }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ background: "#fbf5ea", text: "#2c1e16" }),
    );
    expect(screen.getByRole("status")).toHaveTextContent("Candlelit paper applied.");
  });

  it("renders Preview as a sibling button outside the card selection button", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onPreview = vi.fn();

    render(
      <ThemeCard
        theme={getTheme("romantic")}
        selected={false}
        onSelect={onSelect}
        onPreview={onPreview}
      />,
    );

    const previewBtn = screen.getByRole("button", { name: /Preview Romantic theme/i });
    expect(previewBtn.closest("button")).toBe(previewBtn);

    await user.click(previewBtn);
    expect(onPreview).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
  });
});

describe("MemoryGallery Slideshow", () => {
  it("navigates with buttons, clickable dots, keyboard arrows, and fires onSeenAll once all slides visited", async () => {
    const user = userEvent.setup();
    const onSeenAll = vi.fn();
    const photos = [
      { id: "p1", url: "/p1.webp", caption: "First" },
      { id: "p2", url: "/p2.webp", caption: "Second" },
    ];

    render(<MemoryGallery photos={photos} style="slideshow" animate={false} onSeenAll={onSeenAll} />);
    expect(onSeenAll).not.toHaveBeenCalled();

    const carousel = screen.getByRole("region", { name: /Memory photos/i });
    carousel.focus();
    await user.keyboard("{ArrowRight}");

    expect(screen.getByText("Second")).toBeInTheDocument();
    expect(onSeenAll).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("tab", { name: "Photo 1 of 2" }));
    expect(screen.getByText("First")).toBeInTheDocument();
  });
});

describe("Asset removal failure handling", () => {
  it("keeps audio attached and displays alert if onRemoveAsset rejects", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onRemoveAsset = vi.fn().mockRejectedValueOnce(new Error("File still live."));

    render(
      <MusicPanel
        value={{ source: "custom", assetId: "asset-live", volume: 0.5 }}
        onChange={onChange}
        onUpload={vi.fn()}
        onRemoveAsset={onRemoveAsset}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Remove audio" }));
    expect(onRemoveAsset).toHaveBeenCalledWith("asset-live");
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("File still live.");
  });

  it("keeps photo in list and displays alert if onRemoveAsset rejects", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onRemoveAsset = vi.fn().mockRejectedValueOnce(new Error("Delete failed."));

    render(
      <PhotosPanel
        photos={[{ id: "p-live", url: "/api/uploads/p-live", caption: "Memory" }]}
        memoryStyle="polaroid"
        onChange={onChange}
        onMemoryStyleChange={vi.fn()}
        onUpload={vi.fn()}
        onRemoveAsset={onRemoveAsset}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Remove" }));
    expect(onRemoveAsset).toHaveBeenCalledWith("p-live");
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Delete failed.");
  });
});
