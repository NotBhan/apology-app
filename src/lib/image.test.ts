import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearCompressionDiagnostics,
  compressImage,
  getCompressionDiagnostics,
  ImageOptimizationError,
  isAnimatedGifBytes,
  sniffClientImageMime,
} from "./image";
import { optimizedPhotoFilename, toOptimizedUploadFile } from "./upload";

const JPEG_HEADER = [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01];
const PNG_HEADER = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d];
const WEBP_HEADER = [
  0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
];
const HEIC_HEADER = [
  0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63, 0x00, 0x00, 0x00, 0x00,
];

function makeBinaryFile(header: number[], totalBytes: number, name: string, declaredType: string): File {
  const bytes = new Uint8Array(Math.max(header.length, totalBytes));
  bytes.set(header);
  return new File([bytes], name, { type: declaredType });
}

function makeFakeGif(frames: number): Uint8Array {
  // Minimal GIF89a header (6) + logical screen descriptor (7, no GCT) + frames + trailer
  const parts: number[] = [
    0x47, 0x49, 0x46, 0x38, 0x39, 0x61, // GIF89a
    0x0a, 0x00, 0x0a, 0x00, 0x00, 0x00, 0x00, // 10x10, no GCT
  ];
  for (let i = 0; i < frames; i += 1) {
    parts.push(0x2c, 0x00, 0x00, 0x00, 0x00, 0x0a, 0x00, 0x0a, 0x00, 0x00); // Image Descriptor
    parts.push(0x02, 0x02, 0x4c, 0x01, 0x00); // LZW min + 2-byte sub-block + 0x00 terminator
  }
  parts.push(0x3b); // Trailer
  return new Uint8Array(parts);
}

describe("sniffClientImageMime & isAnimatedGifBytes", () => {
  it("identifies real image signatures regardless of filename", () => {
    expect(sniffClientImageMime(new Uint8Array(JPEG_HEADER))).toBe("image/jpeg");
    expect(sniffClientImageMime(new Uint8Array(PNG_HEADER))).toBe("image/png");
    expect(sniffClientImageMime(new Uint8Array(WEBP_HEADER))).toBe("image/webp");
    expect(sniffClientImageMime(new Uint8Array(HEIC_HEADER))).toBe("image/heic");
    expect(sniffClientImageMime(makeFakeGif(1))).toBe("image/gif");
    expect(sniffClientImageMime(new TextEncoder().encode("%PDF-1.7"))).toBeUndefined();
  });

  it("distinguishes single-frame static GIFs from animated GIFs", () => {
    expect(isAnimatedGifBytes(makeFakeGif(1))).toBe(false);
    expect(isAnimatedGifBytes(makeFakeGif(2))).toBe(true);
    expect(isAnimatedGifBytes(new Uint8Array(PNG_HEADER))).toBe(false);
  });
});

describe("compressImage optimization pipeline", () => {
  let mockClose: ReturnType<typeof vi.fn>;
  let bitmapWidth = 4032;
  let bitmapHeight = 3024;
  let alphaPixelValue = 255;
  let toBlobHandler: (
    type: string | undefined,
    quality: unknown,
    canvasW: number,
    canvasH: number,
  ) => Blob | null;

  beforeEach(() => {
    clearCompressionDiagnostics();
    bitmapWidth = 4032;
    bitmapHeight = 3024;
    alphaPixelValue = 255;
    mockClose = vi.fn();

    toBlobHandler = (type, quality) => {
      const q = typeof quality === "number" ? quality : 0.78;
      if (type === "image/webp") {
        // Simulate ~280 KB WebP at q=0.78
        return makeBinaryFile(WEBP_HEADER, Math.round(350_000 * q), "out.webp", "image/webp");
      }
      if (type === "image/jpeg") {
        return makeBinaryFile(JPEG_HEADER, Math.round(420_000 * q), "out.jpg", "image/jpeg");
      }
      return makeBinaryFile(PNG_HEADER, 600_000, "out.png", "image/png");
    };

    vi.stubGlobal(
      "createImageBitmap",
      vi.fn().mockImplementation(async () => ({
        get width() {
          return bitmapWidth;
        },
        get height() {
          return bitmapHeight;
        },
        close: mockClose,
      })),
    );

    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
      () =>
        ({
          clearRect: vi.fn(),
          drawImage: vi.fn(),
          imageSmoothingEnabled: true,
          imageSmoothingQuality: "high",
          getImageData: (_x: number, _y: number, w: number, h: number) => {
            const arr = new Uint8ClampedArray(Math.min(w * h, 100) * 4);
            for (let i = 0; i < arr.length; i += 4) {
              arr[i] = 100;
              arr[i + 1] = 150;
              arr[i + 2] = 200;
              arr[i + 3] = i === 0 ? alphaPixelValue : 255;
            }
            return { data: arr } as ImageData;
          },
        }) as unknown as CanvasRenderingContext2D,
    );

    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(function (
      this: HTMLCanvasElement,
      callback: BlobCallback,
      type?: string,
      quality?: unknown,
    ) {
      callback(toBlobHandler(type, quality, this.width, this.height));
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("1. compresses large smartphone landscape JPEG to WebP within 1600px and target size", async () => {
    bitmapWidth = 4032;
    bitmapHeight = 3024;
    const rawFile = makeBinaryFile(JPEG_HEADER, 4_200_000, "IMG_4032.JPG", "image/jpeg");
    const stages: string[] = [];

    const result = await compressImage(rawFile, {
      onProgress: (p) => stages.push(p.stage),
    });

    expect(result.type).toBe("image/webp");
    expect(result.width).toBe(1600);
    expect(result.height).toBe(1200);
    expect(result.blob.size).toBeLessThanOrEqual(450 * 1024);
    expect(result.metrics.wasRecompressed).toBe(true);
    expect(result.metrics.originalWidth).toBe(4032);
    expect(result.metrics.originalHeight).toBe(3024);
    expect(result.metrics.outputFormat).toBe("image/webp");
    expect(result.metrics.reductionPercent).toBeGreaterThan(80);
    expect(mockClose).toHaveBeenCalledTimes(1);
    expect(stages).toEqual(["reading", "decoding", "optimizing", "optimizing", "complete"]);
  });

  it("2. compresses large opaque PNG to compact WebP", async () => {
    bitmapWidth = 3200;
    bitmapHeight = 2400;
    const largePng = makeBinaryFile(PNG_HEADER, 3_600_000, "screenshot.png", "image/png");

    const result = await compressImage(largePng);

    expect(result.type).toBe("image/webp");
    expect(result.width).toBe(1600);
    expect(result.height).toBe(1200);
    expect(result.blob.size).toBeLessThanOrEqual(450 * 1024);

    const uploadFile = toOptimizedUploadFile(result.blob, largePng.name, result.type);
    expect(uploadFile.name).toBe("screenshot.webp");
    expect(uploadFile.type).toBe("image/webp");
  });

  it("3. preserves transparency on PNG fallback when browser lacks WebP encoding", async () => {
    bitmapWidth = 1800;
    bitmapHeight = 1800;
    alphaPixelValue = 0; // Has transparent pixel
    const alphaPng = makeBinaryFile(PNG_HEADER, 1_500_000, "cutout.png", "image/png");

    // Simulate older browser where canvas.toBlob("image/webp") returns PNG
    toBlobHandler = (type) => {
      if (type === "image/webp" || type === "image/png") {
        return makeBinaryFile(PNG_HEADER, 320_000, "fallback.png", "image/png");
      }
      return makeBinaryFile(JPEG_HEADER, 200_000, "opaque.jpg", "image/jpeg");
    };

    const result = await compressImage(alphaPng);

    expect(result.type).toBe("image/png");
    expect(result.width).toBe(1600);
    expect(result.height).toBe(1600);
    expect(result.metrics.preservedTransparency).toBe(true);
    expect(optimizedPhotoFilename(alphaPng.name, result.type)).toBe("cutout.png");
  });

  it("3b. falls back to JPEG for opaque photos when WebP encoding is unavailable", async () => {
    bitmapWidth = 2400;
    bitmapHeight = 1800;
    alphaPixelValue = 255; // Opaque
    const opaquePng = makeBinaryFile(PNG_HEADER, 2_800_000, "portrait.png", "image/png");

    toBlobHandler = (type, quality) => {
      const q = typeof quality === "number" ? quality : 0.78;
      if (type === "image/webp") {
        // Simulate unsupported WebP by returning PNG
        return makeBinaryFile(PNG_HEADER, 1_200_000, "downgraded.png", "image/png");
      }
      return makeBinaryFile(JPEG_HEADER, Math.round(300_000 * q), "out.jpg", "image/jpeg");
    };

    const result = await compressImage(opaquePng);

    expect(result.type).toBe("image/jpeg");
    expect(result.width).toBe(1600);
    expect(result.height).toBe(1200);
    expect(optimizedPhotoFilename(opaquePng.name, result.type)).toBe("portrait.jpg");
  });

  it("4. skips recompression for already-small compliant images and never bloats", async () => {
    bitmapWidth = 800;
    bitmapHeight = 600;
    const smallJpeg = makeBinaryFile(JPEG_HEADER, 110_000, "small.jpg", "image/jpeg");

    const result = await compressImage(smallJpeg);

    expect(result.metrics.wasRecompressed).toBe(false);
    expect(result.blob.size).toBe(110_000);
    expect(result.width).toBe(800);
    expect(result.height).toBe(600);
    expect(result.type).toBe("image/jpeg");
  });

  it("5. preserves portrait orientation and aspect ratio", async () => {
    bitmapWidth = 3024;
    bitmapHeight = 4032;
    const portraitFile = makeBinaryFile(JPEG_HEADER, 3_200_000, "portrait.jpg", "image/jpeg");

    const result = await compressImage(portraitFile);

    expect(result.width).toBe(1200);
    expect(result.height).toBe(1600);
    expect(result.height).toBeGreaterThan(result.width);
  });

  it("6. detects real format even when File.type is missing or wrong", async () => {
    bitmapWidth = 2000;
    bitmapHeight = 1500;
    // JPEG bytes mislabelled as PNG / empty MIME type
    const mislabelled = makeBinaryFile(JPEG_HEADER, 950_000, "renamed.png", "");

    const result = await compressImage(mislabelled);

    expect(result.metrics.originalFormat).toBe("image/jpeg");
    expect(result.type).toBe("image/webp");
    const uploadFile = toOptimizedUploadFile(result.blob, mislabelled.name, result.type);
    expect(uploadFile.name).toBe("renamed.webp");
    expect(uploadFile.type).toBe("image/webp");
  });

  it("7. rejects animated GIFs, HEIC when browser decode fails, and non-image files cleanly", async () => {
    const animatedGifBytes = makeFakeGif(3);
    const animGif = new File([animatedGifBytes as unknown as BlobPart], "loop.gif", {
      type: "image/gif",
    });
    await expect(compressImage(animGif)).rejects.toMatchObject({
      name: "ImageOptimizationError",
      code: "ANIMATED_IMAGE",
    });

    const textDisguised = new File([new TextEncoder().encode("%PDF-1.7 fake")], "fake.jpg", {
      type: "image/jpeg",
    });
    await expect(compressImage(textDisguised)).rejects.toMatchObject({
      name: "ImageOptimizationError",
      code: "UNSUPPORTED_FORMAT",
    });

    // Simulate HEIC decode failure in Chrome/Linux
    vi.mocked(createImageBitmap).mockRejectedValueOnce(new DOMException("Unsupported", "EncodingError"));
    const heicFile = makeBinaryFile(HEIC_HEADER, 800_000, "IMG_01.HEIC", "");
    await expect(compressImage(heicFile)).rejects.toMatchObject({
      name: "ImageOptimizationError",
      code: "UNSUPPORTED_FORMAT",
    });
  });

  it("8. handles canvas encode failures gracefully", async () => {
    bitmapWidth = 2000;
    bitmapHeight = 2000;
    toBlobHandler = () => null;
    const validFile = makeBinaryFile(JPEG_HEADER, 900_000, "photo.jpg", "image/jpeg");

    await expect(compressImage(validFile)).rejects.toBeInstanceOf(ImageOptimizationError);
  });

  it("9. cancels safely via AbortSignal without leaving image buffers open", async () => {
    const controller = new AbortController();
    const rawFile = makeBinaryFile(JPEG_HEADER, 2_000_000, "photo.jpg", "image/jpeg");

    // Abort while createImageBitmap resolves
    vi.mocked(createImageBitmap).mockImplementationOnce(async () => {
      controller.abort();
      return {
        width: 2400,
        height: 1800,
        close: mockClose,
      } as unknown as ImageBitmap;
    });

    await expect(compressImage(rawFile, { signal: controller.signal })).rejects.toMatchObject({
      name: "AbortError",
    });
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it("10. uses bounded adaptive quality & dimension fallback to hit <= 450 KB target", async () => {
    bitmapWidth = 3200;
    bitmapHeight = 2400;
    const hugeJpeg = makeBinaryFile(JPEG_HEADER, 5_500_000, "dense.jpg", "image/jpeg");

    const seenQualities: number[] = [];
    const seenEdges: number[] = [];
    toBlobHandler = (_type, quality, canvasW, canvasH) => {
      const q = typeof quality === "number" ? quality : 0.78;
      seenQualities.push(q);
      seenEdges.push(Math.max(canvasW, canvasH));
      // Large until edge drops to 1280px
      const simulatedSize =
        Math.max(canvasW, canvasH) > 1280 ? Math.round(700_000 * q) + 120_000 : 310_000;
      return makeBinaryFile(WEBP_HEADER, simulatedSize, "out.webp", "image/webp");
    };

    const result = await compressImage(hugeJpeg);

    expect(result.blob.size).toBeLessThanOrEqual(450 * 1024);
    expect(result.width).toBe(1280);
    expect(result.height).toBe(960);
    expect(seenQualities).toEqual([0.78, 0.7, 0.64, 0.6, 0.66]);
    expect(seenEdges[0]).toBe(1600);
    expect(seenEdges.at(-1)).toBe(1280);
    expect(result.metrics.attempts).toBeLessThanOrEqual(7);
  });

  it("11. records privacy-safe compression telemetry without filenames", async () => {
    const rawFile = makeBinaryFile(JPEG_HEADER, 2_000_000, "my_secret_name.jpg", "image/jpeg");
    await compressImage(rawFile);

    const diagnostics = getCompressionDiagnostics();
    expect(diagnostics).toHaveLength(1);
    const serialized = JSON.stringify(diagnostics[0]);
    expect(serialized).not.toContain("my_secret_name");
    expect(diagnostics[0]!.originalBytes).toBe(2_000_000);
    expect(diagnostics[0]!.outputFormat).toBe("image/webp");
  });
});


describe("JPEG APP1/EXIF compact fast-path guard", () => {
  it("detects APP1 markers before Start-of-Scan and forces re-encoding even for compact JPEGs", async () => {
    const { hasJpegExifOrApp1 } = await import("./image");

    const exifJpegBytes = new Uint8Array(12 * 1024);
    exifJpegBytes.set([0xff, 0xd8, 0xff, 0xe1, 0x00, 0x08, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00, 0xff, 0xda], 0);
    expect(hasJpegExifOrApp1(exifJpegBytes)).toBe(true);

    const cleanJfifBytes = new Uint8Array(12 * 1024);
    cleanJfifBytes.set([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x06, 0x4a, 0x46, 0x49, 0x46, 0xff, 0xda], 0);
    expect(hasJpegExifOrApp1(cleanJfifBytes)).toBe(false);

    const origCreateImageBitmap = globalThis.createImageBitmap;
    const origCreateElement = document.createElement.bind(document);

    globalThis.createImageBitmap = (async () =>
      ({ width: 1200, height: 900, close: () => {} }) as unknown as ImageBitmap) as typeof createImageBitmap;

    document.createElement = ((tagName: string) => {
      const el = origCreateElement(tagName);
      if (tagName.toLowerCase() === "canvas") {
        (el as unknown as HTMLCanvasElement).getContext = (() =>
          ({
            clearRect: () => {},
            drawImage: () => {},
            getImageData: () => ({ data: new Uint8ClampedArray([255, 0, 0, 255]) }),
            imageSmoothingEnabled: true,
            imageSmoothingQuality: "high",
          }) as unknown as CanvasRenderingContext2D) as unknown as HTMLCanvasElement["getContext"];
        (el as unknown as HTMLCanvasElement).toBlob = ((
          cb: BlobCallback,
          type?: string,
        ) => {
          cb(new Blob([new Uint8Array(20 * 1024)], { type: type || "image/webp" }));
        }) as HTMLCanvasElement["toBlob"];
      }
      return el;
    }) as typeof document.createElement;

    try {
      const exifResult = await compressImage(
        new File([exifJpegBytes], "rotated-compact.jpg", { type: "image/jpeg" }),
      );
      expect(exifResult.metrics.wasRecompressed).toBe(true);
      expect(exifResult.type).toBe("image/webp");
      expect(exifResult.metrics.attempts).toBeGreaterThanOrEqual(1);

      const cleanResult = await compressImage(
        new File([cleanJfifBytes], "clean-compact.jpg", { type: "image/jpeg" }),
      );
      expect(cleanResult.metrics.wasRecompressed).toBe(false);
      expect(cleanResult.type).toBe("image/jpeg");
      expect(cleanResult.metrics.attempts).toBe(0);
    } finally {
      globalThis.createImageBitmap = origCreateImageBitmap;
      document.createElement = origCreateElement;
    }
  });
});
