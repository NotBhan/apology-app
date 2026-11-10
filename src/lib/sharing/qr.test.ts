// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { PNG } from "pngjs";
import jsQR from "jsqr";
import { QR_OPTIONS, qrFilename, renderQrBlob, renderQrDataUrl } from "./qr";

const URL_UNDER_TEST = "https://example.com/letter/hNemAK13C4eoq8eME_fMqAJe4AOkzCgre_v-D-LmrMI";

function decode(dataUrl: string): { data: string | null; width: number; height: number } {
  const png = PNG.sync.read(Buffer.from(dataUrl.split(",")[1], "base64"));
  const result = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  return { data: result?.data ?? null, width: png.width, height: png.height };
}

describe("QR generation", () => {
  it("encodes the exact canonical recipient URL", async () => {
    const dataUrl = await renderQrDataUrl(URL_UNDER_TEST);
    expect(dataUrl.startsWith("data:image/png;base64,")).toBe(true);

    const decoded = decode(dataUrl);
    expect(decoded.data).toBe(URL_UNDER_TEST);
    // Path and token survive byte for byte.
    expect(new URL(decoded.data!).pathname).toBe("/letter/hNemAK13C4eoq8eME_fMqAJe4AOkzCgre_v-D-LmrMI");
  });

  it("renders at 1024x1024 with error correction H", async () => {
    const dataUrl = await renderQrDataUrl(URL_UNDER_TEST);
    const png = PNG.sync.read(Buffer.from(dataUrl.split(",")[1], "base64"));
    expect(png.width).toBe(1024);
    expect(png.height).toBe(1024);
    expect(QR_OPTIONS.errorCorrectionLevel).toBe("H");
    expect(QR_OPTIONS.width).toBe(1024);
  });

  it("generates locally, without contacting any service", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    try {
      const dataUrl = await renderQrDataUrl(URL_UNDER_TEST);
      expect(dataUrl).toContain("base64");
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("produces PNG bytes for sharing and download", async () => {
    const blob = await renderQrBlob(URL_UNDER_TEST);
    expect(blob.type).toBe("image/png");
    expect(blob.size).toBeGreaterThan(1000);
  });

  it("names downloads after the experience type", () => {
    expect(qrFilename("apology")).toBe("koi-koi-apology-qr.png");
    expect(qrFilename("birthday")).toBe("koi-koi-birthday-qr.png");
    expect(qrFilename("weird type!")).toBe("koi-koi-weirdtype-qr.png");
  });
});
