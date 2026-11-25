import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PhotosPanel } from "./PhotosPanel";
import { compressImage } from "@/lib/image";

vi.mock("@/lib/image", () => ({
  compressImage: vi.fn(),
}));

describe("PhotosPanel image optimization workflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("compresses selected files before calling onUpload and passes compressed metadata", async () => {
    const user = userEvent.setup({ applyAccept: false });
    const onChange = vi.fn();
    const compressedBlob = new Blob(["webp"], { type: "image/webp" });
    vi.mocked(compressImage).mockResolvedValueOnce({
      blob: compressedBlob,
      width: 1200,
      height: 900,
      type: "image/webp",
      metrics: {
        originalBytes: 3_000_000,
        compressedBytes: 280_000,
        reductionBytes: 2_720_000,
        reductionPercent: 90.7,
        originalFormat: "image/jpeg",
        outputFormat: "image/webp",
        originalWidth: 4000,
        originalHeight: 3000,
        outputWidth: 1200,
        outputHeight: 900,
        durationMs: 45,
        qualityUsed: 0.78,
        attempts: 1,
        wasRecompressed: true,
        preservedTransparency: false,
      },
    });
    const onUpload = vi.fn().mockResolvedValueOnce({
      id: "photo-opt-1",
      url: "/api/uploads/photo-opt-1",
      caption: "",
      width: 1200,
      height: 900,
    });

    render(
      <PhotosPanel
        photos={[]}
        memoryStyle="polaroid"
        onChange={onChange}
        onMemoryStyleChange={vi.fn()}
        onUpload={onUpload}
      />,
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["huge-raw"], "portrait.jpg", { type: "image/jpeg" });
    await user.upload(input, file);

    await waitFor(() => {
      expect(compressImage).toHaveBeenCalledWith(
        file,
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
      expect(onUpload).toHaveBeenCalledWith(compressedBlob, {
        width: 1200,
        height: 900,
        type: "image/webp",
      });
      expect(onChange).toHaveBeenCalledWith([
        expect.objectContaining({ id: "photo-opt-1", url: "/api/uploads/photo-opt-1" }),
      ]);
    });
  });

  it("surfaces compression errors cleanly without attempting raw fallback upload", async () => {
    const user = userEvent.setup({ applyAccept: false });
    vi.mocked(compressImage).mockRejectedValueOnce(new Error("Animated GIFs are not supported."));
    const onUpload = vi.fn();

    render(
      <PhotosPanel
        photos={[]}
        memoryStyle="polaroid"
        onChange={vi.fn()}
        onMemoryStyleChange={vi.fn()}
        onUpload={onUpload}
      />,
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const gifFile = new File(["GIF89a"], "anim.gif", { type: "image/gif" });
    await user.upload(input, gifFile);

    expect(await screen.findByRole("alert")).toHaveTextContent("Animated GIFs are not supported.");
    expect(onUpload).not.toHaveBeenCalled();
  });
});
